import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5TE2M95Q7R"
};


// Initialize Firebase with safety checks to prevent white screens on missing variables
let app;
let isFirebaseDisabled = false;

try {
  const isProduction = import.meta.env.PROD;
  console.log(`[Firebase Init] Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log("ENV CHECK:", import.meta.env);
  
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    console.log("[Firebase Init] Success: Firebase client SDK initialized.");
  } else {
    isFirebaseDisabled = true;
    const errorMsg = isProduction 
      ? "[Firebase Init] Missing production environment variables on Vercel. Please check your Vercel Dashboard."
      : "[Firebase Init] Missing VITE_FIREBASE_API_KEY. Popup login will not function.";
    console.warn(errorMsg);
  }
} catch (error) {
  isFirebaseDisabled = true;
  console.error("[Firebase Init] Critical error during initialization:", error);
}

const analytics = typeof window !== 'undefined' && app ? getAnalytics(app) : null;
const auth = app ? getAuth(app) : ({} as any);
const db = app ? getFirestore(app) : ({} as any);
const storage = app ? getStorage(app) : ({} as any);

export { app, analytics, auth, db, storage, isFirebaseDisabled };
