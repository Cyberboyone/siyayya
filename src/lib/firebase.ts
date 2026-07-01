import { initializeApp } from "firebase/app";
  import { getAuth, setPersistence, indexedDBLocalPersistence, browserLocalPersistence } from "firebase/auth";
  import { getFirestore } from "firebase/firestore";
  import { getStorage } from "firebase/storage";

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  const isFirebaseConfigured = Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );

  let app: any;
  let isFirebaseDisabled = !isFirebaseConfigured;

  try {
    if (isFirebaseConfigured) {
      app = initializeApp(firebaseConfig);
    } else {
      const missing = [
        !import.meta.env.VITE_FIREBASE_API_KEY && 'VITE_FIREBASE_API_KEY',
        !import.meta.env.VITE_FIREBASE_AUTH_DOMAIN && 'VITE_FIREBASE_AUTH_DOMAIN',
        !import.meta.env.VITE_FIREBASE_PROJECT_ID && 'VITE_FIREBASE_PROJECT_ID',
      ].filter(Boolean);
      console.warn('[Firebase] Missing env vars:', missing.join(', '));
      isFirebaseDisabled = true;
    }
  } catch (err) {
    isFirebaseDisabled = true;
    console.error('[Firebase] Init error:', err);
  }

  const auth = app ? getAuth(app) : (null as unknown as ReturnType<typeof getAuth>);
  const db = app ? getFirestore(app) : (null as unknown as ReturnType<typeof getFirestore>);
  const storage = app ? getStorage(app) : (null as unknown as ReturnType<typeof getStorage>);

  const authPersistenceReady = app
    ? setPersistence(auth, indexedDBLocalPersistence).catch(() =>
        setPersistence(auth, browserLocalPersistence).catch(() => {})
      )
    : Promise.resolve();

  // analytics + messaging are heavy — deferred to after page load so they don't
  // block the critical rendering path (~125 KB of JS execution saved up front)
  let analytics: any = null;
  let messaging: any = null;

  if (app && typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      import('firebase/analytics').then(({ getAnalytics }) => {
        try { analytics = getAnalytics(app); } catch (_) {}
      }).catch(() => {});
      if ('serviceWorker' in navigator) {
        import('firebase/messaging').then(({ getMessaging }) => {
          try { messaging = getMessaging(app); } catch (_) {}
        }).catch(() => {});
      }
    }, { once: true });
  }

  export { app, analytics, auth, db, storage, messaging, isFirebaseDisabled, authPersistenceReady };
  