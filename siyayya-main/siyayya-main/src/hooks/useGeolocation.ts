import { useState, useEffect } from "react";
import { useCampus } from "@/features/campus/contexts/CampusContext";

interface GeolocationState {
  lat: number;
  lng: number;
  isLoading: boolean;
  error: string | null;
  source: "gps" | "ip" | "default";
}

// Default: Kano (BUK area)
const DEFAULT_LAT = 12.0022;
const DEFAULT_LNG = 8.5920;

const CACHE_KEY = "siyayya_geolocation";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedLocation {
  lat: number;
  lng: number;
  source: "gps" | "ip" | "default";
  timestamp: number;
}

const getCachedLocation = (): CachedLocation | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed: CachedLocation = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const setCachedLocation = (loc: Omit<CachedLocation, "timestamp">) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...loc, timestamp: Date.now() })
    );
  } catch {
    // Silently fail if localStorage is full
  }
};

const tryBrowserGPS = (): Promise<{ lat: number; lng: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      { timeout: 8000, enableHighAccuracy: false, maximumAge: CACHE_TTL }
    );
  });
};

const tryIPGeolocation = async (): Promise<{ lat: number; lng: number } | null> => {
  try {
    const response = await fetch("http://ip-api.com/json/?fields=lat,lon,status", {
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    if (data.status === "success") {
      return { lat: data.lat, lng: data.lon };
    }
    return null;
  } catch {
    return null;
  }
};

export const useGeolocation = (): GeolocationState => {
  const { selectedCampus, isLoading: isCampusLoading } = useCampus();

  const [state, setState] = useState<GeolocationState>(() => {
    const cached = getCachedLocation();
    if (cached) {
      return {
        lat: cached.lat,
        lng: cached.lng,
        isLoading: false,
        error: null,
        source: cached.source,
      };
    }
    return {
      lat: selectedCampus?.lat || DEFAULT_LAT,
      lng: selectedCampus?.lng || DEFAULT_LNG,
      isLoading: true,
      error: null,
      source: "default",
    };
  });

  // Update fallback if selectedCampus loads and we are using default
  useEffect(() => {
    if (state.source === "default" && selectedCampus && !isCampusLoading) {
      setState(prev => ({
        ...prev,
        lat: selectedCampus.lat,
        lng: selectedCampus.lng,
        error: "Could not detect location. Showing campus area."
      }));
    }
  }, [selectedCampus, state.source, isCampusLoading]);

  useEffect(() => {
    if (isCampusLoading) return; // Wait for campus context
    
    // If we have a valid cache, skip detection
    const cached = getCachedLocation();
    if (cached) return;

    let cancelled = false;

    const detect = async () => {
      if (import.meta.env.DEV) console.log("[Geolocation] Starting location detection...");
      // Try browser GPS first
      const gps = await tryBrowserGPS();
      if (cancelled) return;

      if (gps) {
        if (import.meta.env.DEV) console.log("[Geolocation] Detected via GPS:", gps.lat, gps.lng);
        const newState: GeolocationState = {
          lat: gps.lat,
          lng: gps.lng,
          isLoading: false,
          error: null,
          source: "gps",
        };
        setState(newState);
        setCachedLocation({ lat: gps.lat, lng: gps.lng, source: "gps" });
        return;
      }
      if (import.meta.env.DEV) console.log("[Geolocation] GPS failed or denied, trying IP fallback...");

      // Try IP geolocation fallback
      const ip = await tryIPGeolocation();
      if (cancelled) return;

      if (ip) {
        if (import.meta.env.DEV) console.log("[Geolocation] Detected via IP:", ip.lat, ip.lng);
        const newState: GeolocationState = {
          lat: ip.lat,
          lng: ip.lng,
          isLoading: false,
          error: null,
          source: "ip",
        };
        setState(newState);
        setCachedLocation({ lat: ip.lat, lng: ip.lng, source: "ip" });
        return;
      }
      if (import.meta.env.DEV) console.log("[Geolocation] IP fallback failed, using default (Campus).");

      const fallbackLat = selectedCampus?.lat ?? DEFAULT_LAT;
      const fallbackLng = selectedCampus?.lng ?? DEFAULT_LNG;

      setState({
        lat: fallbackLat,
        lng: fallbackLng,
        isLoading: false,
        error: "Could not detect location. Showing campus area.",
        source: "default",
      });
      setCachedLocation({ lat: fallbackLat, lng: fallbackLng, source: "default" });
    };

    detect();

    return () => {
      cancelled = true;
    };
  }, [isCampusLoading, selectedCampus]);

  return state;
};
