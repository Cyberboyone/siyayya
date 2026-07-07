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

export const useSEO = ({
  title,
  description,
  canonical,
  ogType = "website",
  ogImage = "https://siyayya.com/og-image.png",
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

    // Update Canonical
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonical || window.location.href);

    // Update OG Tags
    const ogTags = {
      'og:title': fullTitle,
      'og:description': description || defaultDescription,
      'og:type': ogType,
      'og:url': window.location.href,
      'og:image': ogImage,
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
      'twitter:image': ogImage,
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
