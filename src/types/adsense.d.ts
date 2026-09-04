/**
 * Global type augmentation for Google AdSense's `window.adsbygoogle` queue,
 * injected by the site-level script loaded once in index.html.
 */
interface Window {
  /** AdSense global initialization/push queue. */
  adsbygoogle?: unknown[];
}
