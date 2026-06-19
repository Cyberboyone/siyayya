import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  deleteUser
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { auth, db, isFirebaseDisabled } from "@/lib/firebase";
import { User } from "@/lib/mock-data";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<{ uid: string, isNewUser: boolean }>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("[AUTH PROVIDER] Component Rendered");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔴 Refactored for Simplicity:
  // Role logic has been removed from AuthContext.
  // Administrative status is now determined by the whitelist in src/lib/config.ts

  const isSafari = () => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  };

  const isWebView = () => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return (
      (ua.indexOf('FBAN') > -1) || 
      (ua.indexOf('FBAV') > -1) || 
      (ua.indexOf('Instagram') > -1) || 
      (ua.indexOf('Twitter') > -1) || 
      (ua.indexOf('LinkedInApp') > -1) ||
      (ua.indexOf('Messenger') > -1) ||
      (ua.indexOf('WebView') > -1) ||
      (ua.indexOf('wv') > -1)
    );
  };

  const syncUserProfile = async (firebaseUser: FirebaseUser): Promise<{ isNewUser: boolean }> => {
    const idToken = await firebaseUser.getIdToken();
    console.log(`[Auth] Synchronizing profile for UID: ${firebaseUser.uid}...`);

    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        const syncData = await response.json();
        const isNewUser = syncData.isNewUser;
        console.log(`[Auth] Profile sync successful. isNewUser: ${isNewUser}`);
        
        // Refetch the document to ensure local state is fresh
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const updatedUser = { 
            id: firebaseUser.uid, 
            ...data,
            email: data.email || firebaseUser.email || "",
            name: data.name || firebaseUser.displayName || "Unknown User",
            businessName: data.businessName || ""
          } as User;
          setUser(updatedUser);
        }
        return { isNewUser };
      } else {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost && response.status === 404) {
          console.warn("[Auth] API endpoint not found on localhost. This is normal if not running 'vercel dev'. Attempting to continue with direct Firestore fetch...");
          
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({ 
              id: firebaseUser.uid, 
              ...data,
              email: data.email || firebaseUser.email || "",
              name: data.name || firebaseUser.displayName || "Unknown User",
              businessName: data.businessName || ""
            } as User);
            return { isNewUser: !data.businessName };
          }
        }

        const errorData = await response.json().catch(() => ({}));
        console.error("[Auth] Profile sync failed:", response.status, errorData);
        toast.error("Profile sync issue", {
          description: errorData.message || "Please refresh the page."
        });
        return { isNewUser: false };
      }
    } catch (error) {
      console.error("[Auth] Profile sync error:", error);
      return { isNewUser: false };
    }
  };

  const hasHandledRedirect = useRef(false);

  useEffect(() => {
    if (isFirebaseDisabled) {
      setIsLoading(false);
      return;
    }

    // 🔴 1. Handle Redirect Result (Logging ONLY)
    // We neutralize this as a state driver to avoid race conditions with onAuthStateChanged.
    const handleRedirectResultLogging = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("[Auth] Google Redirect result detected (Logging only):", result.user.uid);
        }
      } catch (error) {
        console.error("[Auth] Redirect handling error:", error);
      }
    };

    handleRedirectResultLogging();

    // 🔴 2. SAFETY TIMEOUT: Ensure loading state doesn't stay stuck forever
    const loadingTimeout = setTimeout(() => {
      console.warn("[Auth] Loading state was stuck for 10s. Forcing release.");
      setIsLoading(false);
    }, 10000);

    // 🔴 3. CENTRALIZED AUTH LISTENER (Single Source of Truth)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      clearTimeout(loadingTimeout);
      console.log(`[AUTH STATE CHANGED] Firebase user: ${firebaseUser?.email || "Guest"}`);
      
      try {
        if (firebaseUser) {
          console.log(`[Auth] Session active: ${firebaseUser.email}`);
          
          // 🔴 1. Trigger Profile Sync (Single Point of Synchronization)
          await syncUserProfile(firebaseUser);
          
          // 🔴 2. Fetch the newly synced or existing profile
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const userData = { 
              id: firebaseUser.uid, 
              ...docSnap.data(),
              email: docSnap.data().email || firebaseUser.email || "", 
              name: docSnap.data().name || firebaseUser.displayName || "Unknown User",
              businessName: docSnap.data().businessName || "" 
            } as User;

            if (userData.isBanned) {
              toast.error("Your account has been banned.");
              await firebaseSignOut(auth);
              setUser(null);
              return;
            }

            console.log(`[USER SET] Active user: ${userData.email} (BusinessName: ${userData.businessName})`);
            setUser(userData);
          }
        } else {
          console.log("[USER SET] No session found.");
          setUser(null);
        }
      } catch (error) {
        console.error("[Auth] Listener processing error:", error);
        setUser(null);
      } finally {
        // 🔴 CRITICAL: Only stop loading once auth state is fully determined
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔴 5. Simplified Login Flow
const normalizeBusinessName = (name: string) => {
  return name.trim().toLowerCase();
};

  const loginWithGoogle = async (): Promise<{ uid: string, isNewUser: boolean }> => {
    try {
      setIsLoading(true);
      if (isFirebaseDisabled) {
        toast.error("Authentication service unavailable.");
        return { uid: "", isNewUser: false };
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // 1. Ensure local persistence
      await setPersistence(auth, browserLocalPersistence);

      console.log("[Auth] Opening Google Login Popup...");
      try {
        const result = await signInWithPopup(auth, provider);
        console.log("[Auth] Popup login successful:", result.user.email);
        return { uid: result.user.uid, isNewUser: false };
      } catch (popupError: any) {
        // If popup is blocked, we can still fallback to redirect as a safety measure
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/cancelled-popup-request') {
          console.log("[Auth] Popup blocked or cancelled, falling back to Redirect...");
          await signInWithRedirect(auth, provider);
          return { uid: "", isNewUser: false };
        }
        throw popupError;
      }
    } catch (error: any) {
      console.error("[Auth Error] Google Login failed:", error);
      let msg = "Login failed.";
      if (error.code === 'auth/popup-closed-by-user') msg = "Login was cancelled.";
      
      toast.error(msg);
      throw error;
    } finally {
      // Note: isLoading will be set to false by onAuthStateChanged listener
    }
  };

  const deleteAccount = async () => {
    if (!user || !auth.currentUser) throw new Error("No authenticated user");
    const uid = user.id;
    const batch = writeBatch(db);
    try {
      const collections = ["products", "services", "requests"];
      for (const coll of collections) {
        const snap = await getDocs(query(collection(db, coll), where("ownerId", "==", uid)));
        snap.forEach(d => batch.delete(d.ref));
      }
      batch.delete(doc(db, "users", uid));
      await batch.commit();
      await deleteUser(auth.currentUser);
      setUser(null);
      toast.success("Account deleted.");
    } catch (error) {
      console.error("Account deletion failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) throw new Error("No user session");
    
    const updateData = { ...data };
    if (data.businessName) {
      updateData.businessNameLower = normalizeBusinessName(data.businessName);
    }
    
    const docRef = doc(db, "users", user.id);
    await setDoc(docRef, updateData, { merge: true });
    setUser(prev => prev ? { ...prev, ...updateData } as User : null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      logout, 
      updateProfile, 
      loginWithGoogle, 
      deleteAccount 
    }}>
      {isLoading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
};



export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
