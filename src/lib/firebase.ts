import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
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

// Initialize Firebase with safety checks to prevent white screens on missing variables
let app;
let isFirebaseDisabled = !isFirebaseConfigured;

try {
  const isProduction = import.meta.env.PROD;
  console.log(`[Firebase Init] Environment: ${isProduction ? 'Production' : 'Development'}`);
  
  if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
    console.log("[Firebase Init] Success: Firebase client SDK initialized.");
  } else {
    const missingVars = [];
    if (!import.meta.env.VITE_FIREBASE_API_KEY) missingVars.push('VITE_FIREBASE_API_KEY');
    if (!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) missingVars.push('VITE_FIREBASE_AUTH_DOMAIN');
    if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) missingVars.push('VITE_FIREBASE_PROJECT_ID');
    
    const errorMsg = isProduction 
      ? `[Firebase Init] Missing production variables on Vercel: ${missingVars.join(', ')}. Please check your Vercel Dashboard.`
      : `[Firebase Init] Missing local variables: ${missingVars.join(', ')}. Running in fallback mode.`;
    console.warn(errorMsg);
  }
} catch (error) {
  isFirebaseDisabled = true;
  console.error("[Firebase Init] Critical error during initialization:", error);
}

const analytics = typeof window !== 'undefined' && app ? getAnalytics(app) : null;

if (!app) {
  throw new Error("Firebase is not properly configured. Check environment variables.");
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// 🔴 Set Persistence to Local
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("[Firebase Init] Auth persistence set to local."))
  .catch((error) => console.error("[Firebase Init] Persistence error:", error));

export { app, analytics, auth, db, storage, isFirebaseDisabled };
