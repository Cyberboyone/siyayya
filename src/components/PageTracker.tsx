import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    const currentViews = parseInt(sessionStorage.getItem('siyayya_page_views') || '0', 10);
    sessionStorage.setItem('siyayya_page_views', (currentViews + 1).toString());
  }, [location.pathname]);

  return null;
}
