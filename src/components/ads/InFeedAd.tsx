import { ADS_CONFIG } from "@/config/ads";
import { AdSense } from "./AdSense";
import { AdPlaceholder } from "./AdPlaceholder";

interface InFeedAdProps {
  /** Override the configured in-feed ad slot (rare). */
  slot?: string;
  /** Extra classes added to the outer container. */
  className?: string;
  /** Visible/accessible label used to identify advertising content. */
  label?: string;
}

/**
 * In-feed advertisement meant to sit BETWEEN groups of listings inside a
 * responsive CSS grid. The root element carries `col-span-full` so it spans the
 * whole row without breaking the listing grid, and it is clearly labelled
 * "Advertisement" (both visually and for assistive technology).
 *
 * Policy: advertisements are always visibly identified and never styled to
 * look like an ordinary Siyayya listing.
 */
export function InFeedAd({
  slot,
  className = "",
  label = "Advertisement",
}: InFeedAdProps) {
  if (!ADS_CONFIG.enabled || !ADS_CONFIG.inFeed.enabled) return null;

  const effectiveSlot = slot || ADS_CONFIG.inFeed.slot;

  // No configured ad unit: render a labelled dev placeholder only in devMode,
  // otherwise nothing (the app keeps working normally).
  if (!effectiveSlot) {
    return <AdPlaceholder label={label} className={`col-span-full ${className}`.trim()} />;
  }

  return (
    <div className={`col-span-full w-full ${className}`.trim()}>
      <div className="flex items-center gap-3 mb-1.5">
        <span className="h-px flex-1 bg-black/5 dark:bg-white/10" />
        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-black/30 dark:text-white/30">
          {label}
        </span>
        <span className="h-px flex-1 bg-black/5 dark:bg-white/10" />
      </div>
      <AdSense slot={effectiveSlot} format="auto" responsive="auto" />
    </div>
  );
}

export default InFeedAd;
