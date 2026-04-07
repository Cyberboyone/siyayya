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
try {
  app = initializeApp(firebaseConfig);
  if (!firebaseConfig.apiKey) {
    console.warn("Firebase config is missing VITE_FIREBASE_API_KEY. Authentication and Database features will fail to load properly.");
  }
} catch (error) {
  console.error("Firebase initialization error. Please check your environment variables:", error);
  // Optional: you can manually construct a dummy app object here if you want to prevent all crashes,
  // but usually `initializeApp` will just wait to throw when an actual feature is used anyway.
}

const analytics = typeof window !== 'undefined' && app ? getAnalytics(app) : null;
const auth = app ? getAuth(app) : ({} as any);
const db = app ? getFirestore(app) : ({} as any);
const storage = app ? getStorage(app) : ({} as any);

export { app, analytics, auth, db, storage };
