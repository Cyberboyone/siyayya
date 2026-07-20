import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  noindex?: boolean;
  structuredData?: Record<string, any> | Record<string, any>[];
  twitterCard?: "summary" | "summary_large_image";
}

// The canonical production host. Search Console flagged every indexed URL
// as "Page with redirect" because siyayya.com (no www) actually 307s to
// www.siyayya.com, but every canonical tag, the sitemap, robots.txt, and
// structured data all declared the non-www URL as canonical — Google was
// being told "this is the real page" while that exact URL only ever serves
// a redirect. Vercel's domain settings are being changed to make siyayya.com
// (no www) primary again; in the meantime (and afterwards, defensively),
// every URL written into the page's SEO tags is force-normalized to this
// host so the app is never the source of a www/non-www mismatch regardless
// of which hostname actually served the request.
const CANONICAL_HOST = "siyayya.com";

// Only rewrites the hostname for relative URLs and URLs already on
// siyayya.com/www.siyayya.com — external asset URLs (Cloudinary product
// photos, third-party avatars, etc., which several pages pass as ogImage)
// must be left completely untouched, or the rewrite would silently break
// every one of those image previews by pointing them at siyayya.com.
const toCanonicalUrl = (url: string): string => {
  try {
    const parsed = new URL(url, `https://${CANONICAL_HOST}`);
    const isOwnDomain = parsed.hostname === CANONICAL_HOST || parsed.hostname === `www.${CANONICAL_HOST}`;
    if (!isOwnDomain) return url;
    parsed.protocol = "https:";
    parsed.hostname = CANONICAL_HOST;
    parsed.port = "";
    return parsed.toString();
  } catch {
    return `https://${CANONICAL_HOST}/`;
  }
};

export const useSEO = ({
  title,
  description,
  canonical,
  ogType = "website",
  ogImage = `https://${CANONICAL_HOST}/og-image.png`,
  noindex = false,
  structuredData,
  twitterCard = "summary_large_image",
}: SEOProps = {}) => {
  const siteName = "Siyayya";
  const fullTitle = title ? `${title} | ${siteName}` : "Siyayya : Your Campus Marketplace";
  const defaultDescription = "Buy, sell, and discover products and services across Nigerian university campuses. Your campus marketplace.";

  useEffect(() => {
    // Update Title
    document.title = fullTitle;

    // Update Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description || defaultDescription);

    // Update Canonical — always forced onto the canonical apex host, even
    // when a caller passes window.location.href (several detail pages do),
    // so a visitor who happens to land on www.siyayya.com never causes this
    // tag to declare www as canonical.
    const canonicalUrl = toCanonicalUrl(canonical || window.location.href);
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

    // Update OG Tags
    const ogTags = {
      'og:title': fullTitle,
      'og:description': description || defaultDescription,
      'og:type': ogType,
      'og:url': canonicalUrl,
      'og:image': toCanonicalUrl(ogImage),
      'og:site_name': siteName,
    };

    Object.entries(ogTags).forEach(([property, content]) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

    // Update Twitter Tags
    const twitterTags = {
      'twitter:card': twitterCard,
      'twitter:title': fullTitle,
      'twitter:description': description || defaultDescription,
      'twitter:image': toCanonicalUrl(ogImage),
    };

    Object.entries(twitterTags).forEach(([name, content]) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

    // Robots noindex if needed (mostly for auth/admin pages)
    let robotsTag = document.querySelector('meta[name="robots"]');
    if (noindex) {
      if (!robotsTag) {
        robotsTag = document.createElement('meta');
        robotsTag.setAttribute('name', 'robots');
        document.head.appendChild(robotsTag);
      }
      robotsTag.setAttribute('content', 'noindex, nofollow');
    } else if (robotsTag) {
      robotsTag.setAttribute('content', 'index, follow');
    }

    // Dynamic JSON-LD Schema injection
    const scriptId = "siyayya-jsonld-schema";
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.remove();
    }

    if (structuredData) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      const schemas = Array.isArray(structuredData) ? structuredData : [structuredData];
      
      script.innerHTML = JSON.stringify(
        schemas.length === 1 
          ? { "@context": "https://schema.org", ...schemas[0] }
          : {
              "@context": "https://schema.org",
              "@graph": schemas
            }
      );
      document.head.appendChild(script);
    }

    // Cleanup on unmount/update
    return () => {
      const script = document.getElementById(scriptId);
      if (script) {
        script.remove();
      }
    };

  }, [title, description, canonical, ogType, ogImage, noindex, fullTitle, defaultDescription, structuredData, twitterCard]);
};
