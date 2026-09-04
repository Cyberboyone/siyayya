import React, { useEffect, useRef } from "react";
import { ADS_CONFIG, ADSENSE_PUBLISHER_ID } from "@/config/ads";

type AdFormat =
  | "auto"
  | "fluid"
  | "rectangle"
  | "horizontal"
  | "vertical";

interface AdSenseProps {
  /** Google ad-unit ID (e.g. "1234567890"). Falls back to a default from config if provided. */
  slot?: string;
  /** AdSense ad format attribute (`data-ad-format`). */
  format?: AdFormat;
  /** Responsive behavior — `true`/`false`/`"auto"`, mapped to `data-full-width-responsive`. */
  responsive?: boolean | "auto";
  /** Optional `data-ad-layout` (used mainly for "fluid" format). */
  layout?: string;
  /** Extra class names applied to the `<ins>` element. */
  className?: string;
  /** Inline styles applied to the `<ins>` element. */
  style?: React.CSSProperties;
}

/**
 * Core reusable AdSense unit.
 *
 * - Renders the official `<ins class="adsbygoogle">` and calls the AdSense
 *   queue exactly once per mount (guarded by a ref to avoid duplicate pushes).
 * - Gracefully renders nothing (no broken ad, no crash) when:
 *     • advertising is globally disabled, or
 *     • the ad slot is empty / not configured, and devMode is off.
 * - Safe on the server / before the AdSense script has loaded.
 */
export function AdSense({
  slot,
  format = "auto",
  responsive = "auto",
  layout,
  className = "",
  style,
}: AdSenseProps) {
  const initedRef = useRef(false);

  const effectiveSlot = slot || "";

  useEffect(() => {
    // Only attempt to serve an ad when everything required is present.
    if (!ADS_CONFIG.enabled || !effectiveSlot) return;
    if (typeof window === "undefined" || !window.adsbygoogle) return;
    if (initedRef.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      initedRef.current = true;
    } catch (err) {
      // Never let an ad failure break the page.
      console.error("[AdSense] Failed to initialize ad unit:", err);
    }
  }, [effectiveSlot]);

  if (!ADS_CONFIG.enabled || !effectiveSlot) return null;

  return (
    <ins
      className={`adsbygoogle ${className}`.trim()}
      data-ad-client={ADSENSE_PUBLISHER_ID}
      data-ad-slot={effectiveSlot}
      data-ad-format={format}
      data-full-width-responsive={
        responsive === "auto" ? "auto" : String(responsive)
      }
      {...(layout ? { "data-ad-layout": layout } : {})}
      style={{
        display: "block",
        minWidth: 0,
        ...style,
      }}
    />
  );
}

export default AdSense;
