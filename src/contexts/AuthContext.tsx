import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  setPersistence,
  browserLocalPersistence,
  deleteUser,
  getRedirectResult
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { auth, db, isFirebaseDisabled } from "@/lib/firebase";
import { User } from "@/lib/mock-data";
import { toast } from "sonner";

export const normalizeBusinessName = (name: string): string => {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<any>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

    // Handle Redirect Result on Load
    const handleRedirect = async () => {
      if (hasHandledRedirect.current) return;
      
      // Only attempt to handle redirect if we are not on localhost (which uses popups)
      // OR if we specifically want to check for a redirect result.
      // However, it's safer to always check but handle the "no result" case quickly.
      hasHandledRedirect.current = true;

      try {
        console.log("[Auth] Checking redirect result...");
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("[Auth] Redirect sign-in successful:", result.user.uid);
          await syncUserProfile(result.user);
          toast.success(`Welcome back, ${result.user.displayName || 'User'}!`);
        } else {
          console.log("[Auth] No redirect result found.");
        }
      } catch (error: any) {
        console.error("[Auth] Redirect error:", error);
        if (error.code !== 'auth/no-auth-event' && error.code !== 'auth/operation-not-supported-in-this-environment') {
          toast.error("Login session could not be completed. Please try again.", {
            description: "Try opening the site in your main browser (Chrome/Safari) instead of an in-app browser."
          });
        }
      } finally {
        // Ensure loading is released
        setIsLoading(false);
      }
    };

    handleRedirect();

    // 🔴 SAFETY TIMEOUT: Ensure loading state doesn't stay stuck forever
    const loadingTimeout = setTimeout(() => {
      console.warn("[Auth] Loading state was stuck for 10s. Forcing release.");
      setIsLoading(false);
    }, 10000); // 10 seconds timeout

    // 🔴 CENTRALIZED AUTH LISTENER
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      clearTimeout(loadingTimeout); // Clear timeout if listener fires
      try {
        if (firebaseUser) {
          console.log(`[Auth Context] User detected: uid=${firebaseUser.uid}, email=${firebaseUser.email}`);
          
          await syncUserProfile(firebaseUser);
          
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          let userData: User;
          
          if (docSnap.exists()) {
            console.log(`[Auth Context] Profile found in Firestore for ${firebaseUser.uid}`);
            const data = docSnap.data();
            userData = { 
              id: firebaseUser.uid, 
              ...data,
              email: data.email || firebaseUser.email || "", 
              name: data.name || firebaseUser.displayName || "Unknown User",
              businessName: data.businessName || "" 
            } as User;
          } else {
            console.log(`[Auth Context] No profile found for ${firebaseUser.uid}. Initializing temp state.`);
            userData = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "Unknown User",
              email: firebaseUser.email || "",
              phone: firebaseUser.phoneNumber || "",
              businessName: "", 
              rating: 0,
              reviewCount: 0
            };
          }

          if (userData.isBanned) {
            toast.error("Your account has been banned.");
            await firebaseSignOut(auth);
            setUser(null);
            return;
          }

          setUser(userData);
        } else {
          setUser(null);
          console.log("[Auth Context] No active session.");
        }
      } catch (error) {
        console.error("[Auth Context Error]:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error: any) {
      console.error("[Auth Error] Google Login failed:", error);
      let msg = "Login failed.";
      if (error.code === 'auth/popup-closed-by-user') msg = "Login was cancelled.";
      else if (error.code === 'auth/cancelled-popup-request') return;
      
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
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
      {children}
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
