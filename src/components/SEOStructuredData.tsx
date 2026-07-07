export interface BreadcrumbItem {
  name: string;
  item: string;
}

export function getOrganizationSchema() {
  return {
    "@type": "Organization",
    "name": "Siyayya",
    "url": window.location.origin,
    "logo": `${window.location.origin}/pwa-512x512.png`,
    "sameAs": [
      "https://twitter.com/siyayya",
      "https://facebook.com/siyayya"
    ]
  };
}

export function getWebsiteSchema() {
  return {
    "@type": "WebSite",
    "name": "Siyayya",
    "url": window.location.origin,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${window.location.origin}/marketplace?search={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function getBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.item.startsWith("http") ? item.item : `${window.location.origin}${item.item}`
    }))
  };
}

export function getProductSchema(product: {
  title: string;
  image: string;
  description: string;
  price: number;
  condition: string;
  location: string;
  ownerName: string;
  createdAt: string;
}) {
  return {
    "@type": "Product",
    "name": product.title,
    "image": product.image,
    "description": product.description,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "NGN",
      "price": product.price,
      "itemCondition": product.condition === "New" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      "availability": "https://schema.org/InStock",
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "seller": {
        "@type": "Person",
        "name": product.ownerName
      }
    }
  };
}



export function getFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

export function getLocalBusinessSchema(business: {
  name: string;
  image?: string;
  description?: string;
  phone?: string;
  location?: string;
}) {
  return {
    "@type": "LocalBusiness",
    "name": business.name,
    "image": business.image || `${window.location.origin}/pwa-512x512.png`,
    "description": business.description || "Campus Business Listing on Siyayya",
    "telephone": business.phone,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": business.location || "Nigeria",
      "addressCountry": "NG"
    }
  };
}
