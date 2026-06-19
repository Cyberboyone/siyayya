import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  noindex?: boolean;
}

export const useSEO = ({
  title,
  description,
  canonical,
  ogType = "website",
  ogImage = "https://siyayya.com/og-image.png",
  noindex = false,
}: SEOProps = {}) => {
  const siteName = "Siyayya";
  const fullTitle = title ? `${title} | ${siteName}` : "Siyayya - Buy & Sell Easily in Nigeria";
  const defaultDescription = "Federal University of Kashere's Premium Campus Marketplace. Buy, sell, and find services easily within the FUK community.";

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

  }, [title, description, canonical, ogType, ogImage, noindex, fullTitle, defaultDescription]);
};
