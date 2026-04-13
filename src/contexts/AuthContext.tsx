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

  // 🔴 HARDCODE ADMIN EMAIL FOR ABSOLUTE ENFORCEMENT
  const ADMIN_EMAIL = "muhammadmusab372@gmail.com";

  useEffect(() => {
    // 🔴 DEV BYPASS: Allows local testing of Admin Panel without real Sign-In
    const shouldImpersonate = localStorage.getItem("dev_impersonate_admin") === "true";
    if (shouldImpersonate) {
      console.warn("[Auth] DEV MODE: Impersonating Admin muhammadmusab372@gmail.com");
      setUser({
        id: "dev-admin-uid",
        name: "Dev Admin",
        email: "muhammadmusab372@gmail.com",
        role: "admin",
        isVerified: true,
        rating: 5,
        reviewCount: 100,
        phone: "0000000000"
      } as User);
      setIsLoading(false);
      return;
    }

    if (isFirebaseDisabled) {
      console.log("[Auth] Firebase is disabled. Proceeding as guest.");
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          console.log("[Auth State Change] User personalizing:", firebaseUser.email);
          
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          let userData: User;
          
          if (docSnap.exists()) {
            userData = { id: firebaseUser.uid, ...docSnap.data() } as User;
          } else {
            console.log("[Auth State Change] No Firestore doc; using fallback profile.");
            userData = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "Unknown User",
              email: firebaseUser.email || "",
              phone: firebaseUser.phoneNumber || "",
              rating: 0,
              reviewCount: 0
            };
          }

          // 🔴 1. DIRECT ADMIN ENFORCEMENT
          const canonicalEmail = userData.email?.trim().toLowerCase();
          if (canonicalEmail === ADMIN_EMAIL.toLowerCase()) {
            console.log("[Auth State Change] Admin Identity Verified by Email.");
            userData.role = "admin";
          }

          setUser(userData);
          
          console.log("--- AUTH STATE UPDATED ---");
          console.log("USER:", firebaseUser.uid);
          console.log("EMAIL:", canonicalEmail);
          console.log("ROLE:", userData.role);
          console.log("----------------------------");
        } else {
          setUser(null);
          console.log("[Auth State Change] No active session.");
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

  // 🔴 2. FAIL-SAFE LOGIN WITH "SOFT" BACKEND SYNC
  const loginWithGoogle = async (): Promise<{ uid: string, isNewUser: boolean, role: string }> => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();
      
      console.log("[Auth] Signed in via Firebase. Attempting backend sync...");

      let isNewUser = false;
      let role = "user";

      try {
        // Attempt backend sync, but don't let it crash the frontend if it fails
        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        if (response.ok) {
          const syncData = await response.json();
          isNewUser = syncData.isNewUser;
          role = syncData.role;
          console.log("[Auth] Backend sync successful.");
        } else {
          const errorText = await response.text();
          console.warn("[Auth] Backend sync failed with status:", response.status, errorText);
          // Fallback logic enabled
        }
      } catch (syncError) {
        console.warn("[Auth] Backend sync unavailable (Local Dev / Offline?):", syncError);
        // Fallback logic enabled
      }

      // 🔴 1. DIRECT ADMIN ENFORCEMENT (Fallback + Verification)
      if (firebaseUser.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        role = "admin";
        console.log("[Auth] Admin Role Enforced via Frontend Logic.");
      }

      toast.success(`Welcome, ${firebaseUser.displayName || 'User'}!`);
      return { uid: firebaseUser.uid, isNewUser, role };
    } catch (error: any) {
      console.error("[Auth Error] Google Login failed:", error);
      
      // Parse common Firebase errors into user-friendly messages
      let errorMessage = "Authentication failed. Please try again.";
      if (error.code === 'auth/popup-blocked') {
        errorMessage = "Sign-in popup was blocked. Please allow popups for this site.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign-in was cancelled.";
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "This domain is not authorized for Google Sign-In. Check Firebase settings.";
      }
      
      toast.error(errorMessage);
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
