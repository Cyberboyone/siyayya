import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    const currentViews = parseInt(sessionStorage.getItem('siyayya_page_views') || '0', 10);
    sessionStorage.setItem('siyayya_page_views', (currentViews + 1).toString());

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const lastTracked = Number(sessionStorage.getItem('siyayya_last_active_tracked') || '0');
    if (Date.now() - lastTracked < 5 * 60 * 1000) return;

    sessionStorage.setItem('siyayya_last_active_tracked', Date.now().toString());
    setDoc(doc(db, 'users', uid), {
      lastActive: serverTimestamp(),
      lastPath: location.pathname,
    }, { merge: true }).catch(() => {});
  }, [location.pathname]);

  return null;
}
