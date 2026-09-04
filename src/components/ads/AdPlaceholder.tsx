import { ADS_CONFIG } from "@/config/ads";

interface AdPlaceholderProps {
  /** Label rendered by the placeholder (e.g. "Advertisement"). */
  label?: string;
  className?: string;
  title?: string;
}

/**
 * Development-only placeholder shown IN PLACE of a live ad when an ad slot has
 * not yet been configured AND devMode is enabled.
 *
 * It is intentionally neutral and non-deceptive:
 *  - clearly labelled as an advertisement placeholder,
 *  - makes no revenue / counts no impression / tracks no click,
 *  - never resembles a real Siyayya listing.
 *
 * When devMode is off, callers should render `null` instead of this component.
 */
export function AdPlaceholder({ label = "Advertisement", className = "", title = "Ad slot not configured" }: AdPlaceholderProps) {
  if (!ADS_CONFIG.devMode) return null;
  return (
    <div
      aria-hidden="true"
      className={`rounded-2xl border border-dashed border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-center ${className}`.trim()}
      title={title}
      style={{ minHeight: 120 }}
    >
      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-black/30 dark:text-white/30">
        {label} · Not configured
      </span>
    </div>
  );
}

export default AdPlaceholder;
