import { useMemo } from "react";
import { useGeolocation } from "./useGeolocation";
import { useProducts } from "./use-queries";
import {
  getNearestCampuses,
  NORTHERN_CAMPUS_IDS,
  Campus,
} from "@/lib/campus";
import { Product } from "@/lib/mock-data";
import { getNumericDate } from "@/lib/utils";

export type FeedMode = "nearby" | "campus" | "nationwide";

const MAX_DISTANCE_KM = 200; // Threshold to prevent assigning southern/distant users to random northern campuses

interface NearbyProductsResult {
  /** Closest supported northern university */
  nearestCampus: (Campus & { distanceKm: number }) | null;
  /** Top 5 closest northern campuses */
  nearbyCampuses: (Campus & { distanceKm: number })[];
  /** Products from nearest campus */
  nearbyProducts: Product[];
  /** Recent products from nearby campuses sorted by views/recency */
  trendingNearby: Product[];
  /** Products from all northern campuses */
  nationwideProducts: Product[];
  /** Recently added products across nearby northern campuses */
  recentProducts: Product[];
  /** Get products for a specific campus */
  campusProducts: (campusId: string) => Product[];
  /** Location detection state */
  isLocationLoading: boolean;
  /** Products loading state */
  isProductsLoading: boolean;
  /** Location source */
  locationSource: "gps" | "ip" | "default";
  /** Whether the nearest campus actually has products (used for UI states) */
  hasExactCampusProducts: boolean;
  /** True if the user is completely out of the northern region */
  isOutOfRegion: boolean;
}

/** Filter out sold and non-northern products */
const filterNorthern = (products: Product[]): Product[] =>
  products.filter(
    (p) => !p.isSold && p.campusId && NORTHERN_CAMPUS_IDS.has(p.campusId)
  );

export const useNearbyProducts = (
  feedMode: FeedMode = "nearby",
  selectedCampusId?: string
): NearbyProductsResult => {
  const { lat, lng, isLoading: isLocationLoading, source } = useGeolocation();
  const { data: allProducts = [], isLoading: isProductsLoading } = useProducts();

  const nearbyCampuses = useMemo
    (() => {
      const campuses = getNearestCampuses(lat, lng, 50);
      if (import.meta.env.DEV) console.log("[useNearbyProducts] Distances:", campuses.slice(0,5).map(c => `${c.shortName}: ${c.distanceKm.toFixed(1)}km`).join(", "));
      return campuses;
    },
    [lat, lng]
  );

  const nearestCampusRaw = nearbyCampuses[0] || null;
  const isOutOfRegion = nearestCampusRaw ? nearestCampusRaw.distanceKm > MAX_DISTANCE_KM : true;
  const nearestCampus = isOutOfRegion ? null : nearestCampusRaw;

  if (import.meta.env.DEV) {
    if (isOutOfRegion) {
      console.log("[useNearbyProducts] User is out of region (distance >", MAX_DISTANCE_KM, "km). Setting nearestCampus to null.");
    } else if (nearestCampus) {
      console.log("[useNearbyProducts] Matched Nearest Campus:", nearestCampus.shortName, "at", nearestCampus.distanceKm.toFixed(1), "km");
    }
  }

  const northernProducts = useMemo(
    () => filterNorthern(allProducts),
    [allProducts]
  );

  const exactCampusProducts = useMemo(() => {
    if (!nearestCampus) return [];
    return northernProducts.filter((p) => p.campusId === nearestCampus.id);
  }, [nearestCampus, northernProducts]);

  const hasExactCampusProducts = exactCampusProducts.length > 0;

  const nearbyProducts = useMemo(() => {
    if (feedMode === "campus" && selectedCampusId) {
      return northernProducts.filter((p) => p.campusId === selectedCampusId);
    }
    if (feedMode === "nationwide") {
      return northernProducts;
    }
    // "nearby" mode
    if (!nearestCampus) return northernProducts; // If out of region, just show nationwide feed

    if (hasExactCampusProducts) {
      return exactCampusProducts;
    }

    // Fallback: If nearest campus has NO products, use other nearby campuses
    if (import.meta.env.DEV) console.log(`[useNearbyProducts] No products in ${nearestCampus.shortName}, falling back to other nearby campuses.`);
    const fallbackIds = new Set(nearbyCampuses.slice(1).map(c => c.id));
    const fallbackProducts = northernProducts.filter(p => fallbackIds.has(p.campusId));
    
    if (fallbackProducts.length > 0) return fallbackProducts;
    return northernProducts; // Ultimate fallback: all northern products
  }, [feedMode, selectedCampusId, nearestCampus, northernProducts, exactCampusProducts, hasExactCampusProducts, nearbyCampuses]);

  const trendingNearby = useMemo(() => {
    const nearbyCampusIds = new Set(nearbyCampuses.map((c) => c.id));
    return northernProducts
      .filter((p) => nearbyCampusIds.has(p.campusId))
      .sort((a, b) => {
        // Sort by views desc, then by date desc
        const viewsDiff = (b.views || 0) - (a.views || 0);
        if (viewsDiff !== 0) return viewsDiff;
        return getNumericDate(b.createdAt) - getNumericDate(a.createdAt);
      })
      .slice(0, 20);
  }, [northernProducts, nearbyCampuses]);

  const recentProducts = useMemo(() => {
    const nearbyCampusIds = new Set(nearbyCampuses.map((c) => c.id));
    return northernProducts
      .filter((p) => nearbyCampusIds.has(p.campusId))
      .sort(
        (a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt)
      )
      .slice(0, 20);
  }, [northernProducts, nearbyCampuses]);

  const nationwideProducts = useMemo(
    () =>
      northernProducts.sort(
        (a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt)
      ),
    [northernProducts]
  );

  const campusProducts = useMemo(
    () => (campusId: string) =>
      northernProducts.filter((p) => p.campusId === campusId),
    [northernProducts]
  );

  // Debug Checks
  if (import.meta.env.DEV) {
    console.log(`[useNearbyProducts Debug] Mode: ${feedMode}, Selected Campus: ${selectedCampusId || "None"}`);
    console.log(`[useNearbyProducts Debug] Nearest Campus Matched: ${nearestCampus?.shortName || "None"} (Distance: ${nearestCampusRaw?.distanceKm?.toFixed(1) || 'N/A'}km)`);
    console.log(`[useNearbyProducts Debug] Total Northern Products: ${northernProducts.length}, Returned Nearby/Feed Products: ${nearbyProducts.length}`);
  }

  return {
    nearestCampus,
    nearbyCampuses,
    nearbyProducts,
    trendingNearby,
    nationwideProducts,
    recentProducts,
    campusProducts,
    isLocationLoading,
    isProductsLoading,
    locationSource: source,
    hasExactCampusProducts,
    isOutOfRegion,
  };
};
