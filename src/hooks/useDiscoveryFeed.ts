import { useMemo } from "react";
import { useGeolocation } from "./useGeolocation";
import { useProducts } from "./use-queries";
import { useRecentlyViewed } from "./use-recently-viewed";
import { useSavedItems } from "./use-saved-items";
import {
  getNearestCampuses,
  NORTHERN_CAMPUS_IDS,
  Campus,
} from "@/lib/campus";
import { Product } from "@/lib/mock-data";
import { getNumericDate } from "@/lib/utils";

export type FeedMode = "nearby" | "campus" | "nationwide";

const MAX_DISTANCE_KM = 200;

interface DiscoveryFeedResult {
  nearestCampus: (Campus & { distanceKm: number }) | null;
  nearbyCampuses: (Campus & { distanceKm: number })[];
  
  // New Discovery Sections
  trendingNow: Product[];
  recommendedForYou: Product[];
  nearYourCampus: Product[];
  freshToday: Product[];
  recentlyAdded: Product[];
  popularThisWeek: Product[];
  hiddenGems: Product[];
  
  // Mixed infinite discovery feed
  discoveryFeed: Product[];
  
  campusProducts: (campusId: string) => Product[];
  isLocationLoading: boolean;
  isProductsLoading: boolean;
  locationSource: "gps" | "ip" | "default";
  isOutOfRegion: boolean;
}

const filterNorthern = (products: Product[]): Product[] =>
  products.filter((p) => !p.isSold && p.campusId && NORTHERN_CAMPUS_IDS.has(p.campusId));

// Algorithm Constants
const WEIGHT_FRESHNESS = 2.0; // Higher weight for new items
const WEIGHT_VIEWS = 0.5;
const WEIGHT_SAVES = 3.0; // Saves indicate strong intent
const WEIGHT_SELLER_RATING = 1.5;
const WEIGHT_VERIFIED_SELLER = 2.0;
const WEIGHT_AFFINITY = 4.0; // Category match
const WEIGHT_LOCATION = 3.0; // Same campus
const WEIGHT_LISTING_QUALITY = 1.0; // Multiple images, long desc
const WEIGHT_DAILY_JITTER = 14; // Rotates ranking daily so the feed isn't frozen
const WEIGHT_DISCOVERY_BOOST = 12; // Gives older/under-viewed listings a fair shot

/** Deterministic 0..1 pseudo-random value for a given seed string. */
const seededRandom = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 10000) / 10000;
};

// Rotates once per calendar day (not on every render) so visitors see a
// refreshed order across visits instead of the exact same ranking forever,
// while staying stable throughout a single day/session.
const getDayKey = () => new Date().toISOString().slice(0, 10);

export const useDiscoveryFeed = (
  feedMode: FeedMode = "nearby",
  selectedCampusId?: string
): DiscoveryFeedResult => {
  const { lat, lng, isLoading: isLocationLoading, source } = useGeolocation();
  const { data: allProducts = [], isLoading: isProductsLoading } = useProducts();
  const { viewedIds } = useRecentlyViewed();
  const { savedIds } = useSavedItems();

  const nearbyCampuses = useMemo(() => getNearestCampuses(lat, lng, 50), [lat, lng]);
  const nearestCampusRaw = nearbyCampuses[0] || null;
  const isOutOfRegion = nearestCampusRaw ? nearestCampusRaw.distanceKm > MAX_DISTANCE_KM : true;
  const nearestCampus = isOutOfRegion ? null : nearestCampusRaw;
  
  const northernProducts = useMemo(() => filterNorthern(allProducts), [allProducts]);

  // Extract Category Affinities from history
  const categoryAffinities = useMemo(() => {
    const affinities: Record<string, number> = {};
    const viewedProducts = allProducts.filter(p => viewedIds.includes(p.id));
    const savedProducts = allProducts.filter(p => savedIds.includes(p.id));
    
    viewedProducts.forEach(p => {
      affinities[p.category] = (affinities[p.category] || 0) + 1;
    });
    savedProducts.forEach(p => {
      affinities[p.category] = (affinities[p.category] || 0) + 3; // Saved is stronger
    });
    
    return affinities;
  }, [allProducts, viewedIds, savedIds]);

  // Scoring Engine
  const scoredProducts = useMemo(() => {
    const now = Date.now();
    const dayKey = getDayKey();
    
    return northernProducts.map(product => {
      let score = 0;
      
      const createdAtMs = getNumericDate(product.createdAt);
      const ageMs = now - createdAtMs;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      
      // 1. Freshness (peaks at 0 days, decays)
      if (ageDays <= 3) score += WEIGHT_FRESHNESS * 5;
      else if (ageDays <= 7) score += WEIGHT_FRESHNESS * 2;
      
      // 2. Engagement Velocity
      const views = product.views || 0;
      score += Math.min(views, 500) * 0.01 * WEIGHT_VIEWS;
      
      // 3. Seller Quality
      if (product.ownerIsVerified) score += WEIGHT_VERIFIED_SELLER * 5;
      if (product.ownerRating >= 4.5) score += WEIGHT_SELLER_RATING * 2;
      
      // 4. Listing Quality
      if ((product.images?.length || 0) > 1) score += WEIGHT_LISTING_QUALITY * 2;
      if (product.description && product.description.length > 50) score += WEIGHT_LISTING_QUALITY;
      
      // 5. Personalization Affinity
      if (categoryAffinities[product.category]) {
        score += categoryAffinities[product.category] * WEIGHT_AFFINITY;
      }
      
      // 6. Location Match
      if (nearestCampus && product.campusId === nearestCampus.id) {
        score += WEIGHT_LOCATION * 5;
      }

      // 7. Daily rotation jitter — without this, scoring was 100%
      // deterministic (views/verified/freshness never change moment to
      // moment), so the exact same handful of top listings dominated every
      // single visit forever. This reshuffles the ranking once per day.
      score += seededRandom(`${product.id}-${dayKey}`) * WEIGHT_DAILY_JITTER;

      // 8. Discovery boost for older, under-exposed listings. Views mostly
      // only grow for listings that already rank high, so older/low-view
      // items could never earn enough score to ever be shown — a
      // rich-get-richer loop that buried genuinely available older listings
      // completely. This gives them a rotating chance to surface so they
      // can actually accumulate views/interest too.
      if (ageDays > 10 && views < 20) {
        score += seededRandom(`${product.id}-${dayKey}-boost`) * WEIGHT_DISCOVERY_BOOST;
      }

      return { product, score, ageDays, views };
    });
  }, [northernProducts, categoryAffinities, nearestCampus]);

  // Generators for Feed Sections
  const trendingNow = useMemo(() => {
    return [...scoredProducts]
      .filter(p => p.ageDays <= 14) // Trending must be relatively recent
      .sort((a, b) => b.views - a.views)
      .map(p => p.product)
      .slice(0, 15);
  }, [scoredProducts]);

  const recommendedForYou = useMemo(() => {
    return [...scoredProducts]
      .sort((a, b) => b.score - a.score)
      .map(p => p.product)
      .slice(0, 20);
  }, [scoredProducts]);

  const nearYourCampus = useMemo(() => {
    if (!nearestCampus) return [];
    return northernProducts
      .filter(p => p.campusId === nearestCampus.id)
      .sort((a, b) => getNumericDate(b.createdAt) - getNumericDate(a.createdAt))
      .slice(0, 20);
  }, [northernProducts, nearestCampus]);

  const freshToday = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return [...northernProducts]
      .filter((p) => getNumericDate((p as any).boostedAt || p.createdAt) >= oneDayAgo)
      .sort((a, b) => getNumericDate((b as any).boostedAt || b.createdAt) - getNumericDate((a as any).boostedAt || a.createdAt))
      .slice(0, 20);
  }, [northernProducts]);

  const recentlyAdded = useMemo(() => {
    return [...northernProducts]
      .sort((a, b) => getNumericDate((b as any).boostedAt || b.createdAt) - getNumericDate((a as any).boostedAt || a.createdAt))
      .slice(0, 20);
  }, [northernProducts]);

  const popularThisWeek = useMemo(() => {
    return [...scoredProducts]
      .filter(p => p.ageDays <= 7)
      .sort((a, b) => b.score - a.score)
      .map(p => p.product)
      .slice(0, 15);
  }, [scoredProducts]);

  const hiddenGems = useMemo(() => {
    return [...scoredProducts]
      .filter(p => p.views < 50 && p.product.ownerIsVerified && p.ageDays > 3)
      .sort((a, b) => b.score - a.score)
      .map(p => p.product)
      .slice(0, 10);
  }, [scoredProducts]);

  // The Main Discovery Feed (Infinite Scroll target)
  const discoveryFeed = useMemo(() => {
    let basePool = [...scoredProducts];
    
    // Mode filtering
    if (feedMode === 'campus' && selectedCampusId) {
      basePool = basePool.filter(p => p.product.campusId === selectedCampusId);
    } else if (feedMode === 'nearby' && nearestCampus && !isOutOfRegion) {
      const nearbyIds = new Set(nearbyCampuses.slice(0, 3).map(c => c.id));
      basePool = basePool.filter(p => nearbyIds.has(p.product.campusId));
    }
    
    // Final sort based on engagement score
    basePool.sort((a, b) => b.score - a.score);
    
    // Apply seller diversity algorithm
    const finalFeed: Product[] = [];
    const sellerCounts: Record<string, number> = {};
    const overflow: Product[] = []; // Products delayed to avoid seller dominating
    
    basePool.forEach(p => {
      const ownerId = p.product.ownerId;
      sellerCounts[ownerId] = (sellerCounts[ownerId] || 0) + 1;
      
      // Allow max 2 consecutive items from same seller in a block of 5
      if (sellerCounts[ownerId] > 2) {
        overflow.push(p.product);
        // Reset count slowly
        if (Math.random() > 0.5) sellerCounts[ownerId]--; 
      } else {
        finalFeed.push(p.product);
      }
    });

    // Append overflow items at the end
    return [...finalFeed, ...overflow];
  }, [scoredProducts, feedMode, selectedCampusId, nearestCampus, nearbyCampuses, isOutOfRegion]);

  const campusProducts = useMemo(
    () => (campusId: string) => northernProducts.filter((p) => p.campusId === campusId),
    [northernProducts]
  );

  return {
    nearestCampus,
    nearbyCampuses,
    trendingNow,
    recommendedForYou,
    nearYourCampus,
    freshToday,
    recentlyAdded,
    popularThisWeek,
    hiddenGems,
    discoveryFeed,
    campusProducts,
    isLocationLoading,
    isProductsLoading,
    locationSource: source,
    isOutOfRegion,
  };
};
