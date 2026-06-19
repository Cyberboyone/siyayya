declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Initialize Google Analytics (called once in main.tsx or index.html)
export const initAnalytics = () => {
  if (typeof window !== 'undefined' && GA_MEASUREMENT_ID && import.meta.env.PROD) {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false // We handle page views manually for SPA
    });
  }
};

// Log a page view
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'page_view', {
      page_path: url,
    });
  }
};

// Log a custom event
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  } else if (!import.meta.env.PROD) {
    console.log(`[Analytics] Event: ${eventName}`, eventParams);
  }
};

// Specific typed events for consistency
export const trackLogin = (method: 'google' | 'phone') => {
  trackEvent('login', { method });
};

export const trackSignUp = (method: 'google' | 'phone') => {
  trackEvent('sign_up', { method });
};

export const trackProductView = (productId: string, productName: string, category: string) => {
  trackEvent('view_item', {
    items: [{
      item_id: productId,
      item_name: productName,
      item_category: category
    }]
  });
};

export const trackAddToCart = (productId: string, productName: string, price: number) => {
  trackEvent('add_to_cart', {
    currency: 'NGN',
    value: price,
    items: [{
      item_id: productId,
      item_name: productName,
      price: price
    }]
  });
};

export const trackBeginCheckout = (value: number, items: any[]) => {
  trackEvent('begin_checkout', {
    currency: 'NGN',
    value: value,
    items: items.map(i => ({ item_id: i.id, item_name: i.title, price: i.price, quantity: i.quantity }))
  });
};

export const trackPurchase = (transactionId: string, value: number, items: any[]) => {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: 'NGN',
    value: value,
    items: items.map(i => ({ item_id: i.id, item_name: i.title, price: i.price, quantity: i.quantity }))
  });
};
