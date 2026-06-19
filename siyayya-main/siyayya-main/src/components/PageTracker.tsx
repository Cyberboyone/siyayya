import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';

export function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    // Legacy internal tracking
    const currentViews = parseInt(sessionStorage.getItem('siyayya_page_views') || '0', 10);
    sessionStorage.setItem('siyayya_page_views', (currentViews + 1).toString());

    // Google Analytics
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}
