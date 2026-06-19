import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db } from '@/lib/firebase';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { toast } from 'sonner';

export const useFCM = () => {
  const { user, isAuthenticated } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (!messaging || !isAuthenticated || !user) return;

    const setupFCM = async () => {
      try {
        // Register the service worker with the config as query parameters
        // This is necessary because import.meta.env is not available in the service worker
        const configParams = new URLSearchParams({
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
          appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
        });

        const registration = await navigator.serviceWorker.register(
          `/firebase-messaging-sw.js?${configParams.toString()}`
        );
        
        // Wait for SW to be ready
        await navigator.serviceWorker.ready;

        // If permission is already granted, get the token automatically
        if (Notification.permission === 'granted') {
          await retrieveToken(registration);
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    setupFCM();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!messaging) return;
    
    // Handle foreground messages
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
  }, []);

  const retrieveToken = async (registration?: ServiceWorkerRegistration) => {
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
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } catch (err) {
      console.log('An error occurred while retrieving token. ', err);
    }
  };

  const saveTokenToDatabase = async (token: string, userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token)
      });
    } catch (error) {
      console.error('Error saving FCM token to DB:', error);
    }
  };

  const requestPermission = async () => {
    try {
      const currentPermission = await Notification.requestPermission();
      setPermission(currentPermission);
      
      if (currentPermission === 'granted') {
        const registration = await navigator.serviceWorker.getRegistration();
        await retrieveToken(registration);
        return true;
      } else {
        console.log('Unable to get permission to notify.');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  return {
    fcmToken,
    permission,
    requestPermission
  };
};
