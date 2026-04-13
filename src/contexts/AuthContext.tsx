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
import { LoadingScreen } from "@/components/LoadingScreen";

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

  // 🔴 5. NORMALIZE EMAIL COMPARISON
  const ADMIN_EMAIL = "muhammadmusab372@gmail.com";

  useEffect(() => {
    if (isFirebaseDisabled) {
      console.log("[Auth] Firebase is disabled. Proceeding as guest.");
      setIsLoading(false);
      return;
    }

    // 🔴 1. FIX AUTH STATE MANAGEMENT
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      // 🔴 6. ADD DEBUG LOGGING (TEMPORARY)
      console.log("[Auth State Change] User:", firebaseUser?.email, "Loading:", true);
      
      try {
        if (firebaseUser) {
          // Fetch custom user data from Firestore
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          let userData: User;
          
          if (docSnap.exists()) {
            userData = { id: firebaseUser.uid, ...docSnap.data() } as User;
          } else {
            console.warn("[Auth] No Firestore document found. Using fallback for session.");
            userData = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "Unknown User",
              email: firebaseUser.email || "",
              phone: firebaseUser.phoneNumber || "",
              rating: 0,
              reviewCount: 0
            };
          }

          // Normalize Email & Detect Admin status consistently
          const canonicalEmail = userData.email?.trim().toLowerCase();
          const isAdmin = canonicalEmail === ADMIN_EMAIL.toLowerCase();
          
          if (isAdmin) {
            userData.role = "admin";
          }

          setUser(userData);
          console.log("[Auth State Change] Resolved User Email:", canonicalEmail, "Is Admin:", isAdmin);
        } else {
          setUser(null);
          console.log("[Auth State Change] No authenticated user.");
        }
      } catch (error) {
        console.error("[Auth State Change Error]:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
        console.log("[Auth State Change] Loading complete.");
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<{ uid: string, isNewUser: boolean, role: string }> => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Backend verification failed');
      }

      const { isNewUser, role } = await response.json();
      return { uid: result.user.uid, isNewUser, role };
    } catch (error: any) {
      console.error("[Auth Error] Google Login failed:", error);
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
      // Cleanup user data
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
      console.error("Delete account error:", error);
      throw error;
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) throw new Error("No user is logged in");
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
      {/* 🔴 1. REQUIREMENT: The app must NOT render protected routes until loading === false */}
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
