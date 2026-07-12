import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage, getMessaging, isSupported, Messaging } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { toast } from 'sonner';

const getFirebaseConfigParams = () => new URLSearchParams({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
});

export const useFCM = () => {
  const { user, isAuthenticated } = useAuth();
  const [messaging, setMessaging] = useState<Messaging | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    let cancelled = false;

    const initMessaging = async () => {
      if (!app || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
        return;
      }

      try {
        const supported = await isSupported();
        if (!supported || cancelled) return;
        setMessaging(getMessaging(app));
      } catch (error) {
        console.error('[FCM] Messaging is not supported on this device/browser:', error);
      }
    };

    initMessaging();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveTokenToDatabase = useCallback(async (token: string, userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token)
      });
    } catch (error) {
      console.error('Error saving FCM token to DB:', error);
    }
  }, []);

  const retrieveToken = useCallback(async (registration?: ServiceWorkerRegistration) => {
    if (!messaging) return null;

    try {
      const currentToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (currentToken) {
        setFcmToken(currentToken);
        if (user?.id) {
          await saveTokenToDatabase(currentToken, user.id);
        }
        return currentToken;
      }

      console.log('No registration token available. Request permission to generate one.');
      return null;
    } catch (err) {
      console.error('An error occurred while retrieving FCM token:', err);
      return null;
    }
  }, [messaging, saveTokenToDatabase, user?.id]);

  useEffect(() => {
    if (!messaging || !isAuthenticated || !user) return;

    const setupFCM = async () => {
      try {
        // Registered at Firebase's own dedicated push scope (NOT the default
        // '/' scope) so it never collides with vite-plugin-pwa's workbox
        // service worker (sw.js), which also registers at '/' with
        // skipWaiting+clientsClaim. Previously both service workers fought
        // over the same scope — whichever registered last on a given page
        // load silently evicted the other, so push notifications worked
        // right after granting permission but stopped again once the PWA
        // service worker reclaimed the scope on a later visit/update. Each
        // worker now owns its own scope permanently, so this can't happen.
        const registration = await navigator.serviceWorker.register(
          `/firebase-messaging-sw.js?${getFirebaseConfigParams().toString()}`,
          { scope: '/firebase-cloud-messaging-push-scope' }
        );
        
        await navigator.serviceWorker.ready;

        if (Notification.permission === 'granted') {
          await retrieveToken(registration);
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    setupFCM();
  }, [isAuthenticated, messaging, retrieveToken, user]);

  useEffect(() => {
    if (!messaging) return;
    
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Received foreground message: ', payload);
      
      const title = payload.notification?.title || 'New Notification';
      const body = payload.notification?.body || '';
      
      toast(title, {
        description: body,
        action: payload.data?.link ? {
          label: 'View',
          onClick: () => window.location.href = payload.data!.link!
        } : undefined
      });
    });

    return () => unsubscribe();
  }, [messaging]);

  const requestPermission = async () => {
    try {
      if (!messaging) {
        toast.error('Push notifications are not supported on this device/browser.');
        return false;
      }

      const currentPermission = await Notification.requestPermission();
      setPermission(currentPermission);
      
      if (currentPermission === 'granted') {
        const registration = await navigator.serviceWorker.register(
          `/firebase-messaging-sw.js?${getFirebaseConfigParams().toString()}`,
          { scope: '/firebase-cloud-messaging-push-scope' }
        );
        await retrieveToken(registration);
        toast.success('Push notifications enabled');
        return true;
      }

      toast.error('Notification permission was not granted.');
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Could not enable push notifications. Please try again.');
      return false;
    }
  };

  return {
    fcmToken,
    permission,
    requestPermission
  };
};
