/**
 * 🏗️ CENTRALIZED GOOGLE ADSENSE CONFIGURATION
 *
 * This is the ONLY place where advertising is configured for the entire Siyayya
 * application. All ad components read from this module, so policies can be
 * tuned here without touching individual pages.
 *
 * NOTE: Advertising is deliberately a SEPARATE system from Siyayya's own
 * future paid "Featured/Boost" seller promotions. Google AdSense units will be
 * labelled "Advertisement"; Siyayya's own promotions should be labelled with
 * their own terminology (e.g. "Featured by Siyayya") in a different system.
 */

/** Current AdSense publisher ID (site-level, set once in index.html). */
export const ADSENSE_PUBLISHER_ID = "ca-pub-8553781028945288";

/** Global AdSense module flags. */
export const ADS_CONFIG = {
  /** Master switch — set false to disable ALL advertising app-wide. */
  enabled: true,

  /**
   * Development mode. When true and an ad slot is not yet configured, a small,
   * clearly-labelled placeholder is rendered in place of a live ad. This is
   * ONLY a dev aid — it is never a real production advertisement and never
   * counts as an impression or click.
   */
  devMode: false,

  /** In-feed advertisement settings (primary monetization). */
  inFeed: {
    enabled: true,
    /** Number of listings between in-feed ads (6 = "6 listings → Ad"). */
    listingsPerAd: 6,
    /** Hard cap on in-feed ads shown per page, regardless of listing count. */
    maxAdsPerPage: 3,
    /**
     * Actual Google ad-unit ID for the in-feed placement. Empty until the
     * publisher creates an in-feed ad unit in AdSense.
     */
    slot: "",
  },

  /** Homepage banner advertisement settings. */
  banner: {
    enabled: true,
    /** Actual Google ad-unit ID for the banner placement. */
    slot: "",
  },
} as const;

/**
 * Returns the grid indices (0-based, within the listings array) at which an
 * in-feed ad should be inserted — i.e. the position BEFORE that listing.
 *
 * Rules enforced:
 *  - No ad before the first listing.
 *  - Fewer than `listingsPerAd` listings → no ad.
 *  - One ad per `listingsPerAd` listings, capped at `maxAdsPerPage`.
 *
 * Example (listingsPerAd=6): indices [6, 12, 18, ...]
 */
export function getInFeedAdPositions(totalItems: number, listingsPerAd = ADS_CONFIG.inFeed.listingsPerAd, maxAds = ADS_CONFIG.inFeed.maxAdsPerPage): number[] {
  if (totalItems < listingsPerAd) return [];
  const positions: number[] = [];
  const count = Math.min(Math.floor(totalItems / listingsPerAd), maxAds);
  for (let k = 1; k <= count; k++) {
    positions.push(k * listingsPerAd);
  }
  return positions;
}

export default ADS_CONFIG;
