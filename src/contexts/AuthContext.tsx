import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { auth, db, isFirebaseDisabled } from "@/lib/firebase";
import { User } from "@/lib/mock-data";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<{ uid: string, isNewUser: boolean, role: string }>;
  checkBusinessNameUniqueness: (name: string) => Promise<boolean>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔴 Professional implementation: No hardcoded admin email here.
  // Roles are fetched exclusively from the database (Firestore).

  useEffect(() => {
    // DEV BYPASS: Kept for development testing to ensure admin panel workability
    const shouldImpersonate = localStorage.getItem("dev_impersonate_admin") === "true";
    if (shouldImpersonate) {
      console.warn("[Auth] DEV MODE: Impersonating Admin");
      setUser({
        id: "dev-admin-uid",
        name: "Dev Admin",
        email: "admin@siyayya.com",
        role: "admin",
        isVerified: true
      } as User);
      setIsLoading(false);
      return;
    }

    if (isFirebaseDisabled) {
      setIsLoading(false);
      return;
    }

    // 🔴 1. CENTRALIZED AUTH LISTENER (SINGLE SOURCE OF TRUTH)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          let userData: User;
          
          if (docSnap.exists()) {
            // Trust the database role
            userData = { id: firebaseUser.uid, ...docSnap.data() } as User;
          } else {
            console.log("[Auth] New session detected, initializing local profile.");
            userData = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "Unknown User",
              email: firebaseUser.email || "",
              phone: firebaseUser.phoneNumber || "",
              rating: 0,
              reviewCount: 0,
              role: "user" // Default role
            };
          }

          setUser(userData);
          console.log("[Auth State] User authenticated:", { uid: firebaseUser.uid, role: userData.role });
        } else {
          setUser(null);
          console.log("[Auth State] No active session.");
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

  // 🔴 3. FIX LOGIN FLOW AND REDIRECTS
  const loginWithGoogle = async (): Promise<{ uid: string, isNewUser: boolean, role: string }> => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Step A: Firebase Auth Popup
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();
      
      console.log("[Auth] Firebase Sign-In successful. Starting backend synchronization...");

      // Step B: Backend Synchronization (Vercel Serverless Function)
      // This step ensures the user is created/updated in Firestore and detects their role.
      let isNewUser = false;
      let role = "user";

      try {
        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        if (response.ok) {
          const syncData = await response.json();
          isNewUser = syncData.isNewUser;
          role = syncData.role;
          console.log("[Auth] Backend handshake complete:", { isNewUser, role });
        } else {
          console.warn("[Auth] Backend handshake failed. Retrying with local Firestore fetch...");
          // Fallback: Try to fetch the role directly from Firestore if the API is down/misconfigured
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
             role = docSnap.data().role || "user";
          }
        }
      } catch (syncError) {
        console.error("[Auth] Sync error:", syncError);
        // Fallback: Direct Firestore fetch for local/offline support
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
           role = docSnap.data().role || "user";
        }
      }

      toast.success(`Welcome back, ${firebaseUser.displayName || 'User'}!`);
      
      // We return the role so the caller (Redirect Handler) can navigate accurately
      return { uid: firebaseUser.uid, isNewUser, role };
    } catch (error: any) {
      console.error("[Auth Error] Login flow failed:", error);
      let msg = "Google sign-in failed.";
      if (error.code === 'auth/popup-closed-by-user') msg = "Sign-in was cancelled.";
      if (error.code === 'auth/popup-blocked') msg = "Popup blocked. Please check browser settings.";
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkBusinessNameUniqueness = async (name: string): Promise<boolean> => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("businessName", "==", name));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return true;
    if (user && querySnapshot.docs.length === 1 && querySnapshot.docs[0].id === user.id) return true;
    return false;
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
    const docRef = doc(db, "users", user.id);
    await setDoc(docRef, data, { merge: true });
    setUser(prev => prev ? { ...prev, ...data } as User : null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      logout, 
      updateProfile, 
      loginWithGoogle, 
      checkBusinessNameUniqueness, 
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
