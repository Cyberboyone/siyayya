import { ADS_CONFIG } from "@/config/ads";
import { AdSense } from "./AdSense";
import { AdPlaceholder } from "./AdPlaceholder";

interface BannerAdProps {
  /** Override the configured banner ad slot (rare). */
  slot?: string;
  /** Extra classes added to the outer container. */
  className?: string;
  /** Visible/accessible label used to identify advertising content. */
  label?: string;
}

/**
 * Responsive display/banner advertisement for the homepage, placed between
 * meaningful content sections (never over hero/search/navigation).
 *
 * It spans the content width and is responsive across mobile, tablet and
 * desktop. If advertising is disabled or the banner ad slot is unconfigured, it
 * renders nothing (or a clearly-labelled dev placeholder) so layout stays intact.
 */
export function BannerAd({
  slot,
  className = "",
  label = "Advertisement",
}: BannerAdProps) {
  if (!ADS_CONFIG.enabled || !ADS_CONFIG.banner.enabled) return null;

  const effectiveSlot = slot || ADS_CONFIG.banner.slot;

  if (!effectiveSlot) {
    return <AdPlaceholder label={label} className={`w-full ${className}`.trim()} />;
  }

  return (
    <div className={`w-full ${className}`.trim()}>
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

export default BannerAd;
