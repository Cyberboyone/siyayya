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
  // 🔴 1. CENTRALIZE AUTH STATE (SINGLE SOURCE OF TRUTH)
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ADMIN_EMAIL = "muhammadmusab372@gmail.com";

  useEffect(() => {
    if (isFirebaseDisabled) {
      console.log("[Auth] Firebase is disabled. Proceeding as guest.");
      setIsLoading(false);
      return;
    }

    // 🔴 1. Standard Auth Listener (ONLY PLACE TO SET USER)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          let userData: User;
          
          if (docSnap.exists()) {
            userData = { id: firebaseUser.uid, ...docSnap.data() } as User;
          } else {
            userData = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "Unknown User",
              email: firebaseUser.email || "",
              phone: firebaseUser.phoneNumber || "",
              rating: 0,
              reviewCount: 0
            };
          }

          // Step 9: Normalize & Sync Role
          const email = userData.email?.trim().toLowerCase();
          if (email === ADMIN_EMAIL.toLowerCase()) {
            userData.role = "admin";
          }

          setUser(userData);
          
          // 🔴 9. DEBUG (MANDATORY)
          console.log("--- AUTH STATE SNAPSHOT ---");
          console.log("USER:", firebaseUser.uid);
          console.log("EMAIL:", email);
          console.log("ROLE:", userData.role);
          console.log("----------------------------");
        } else {
          setUser(null);
          console.log("[Auth] No User Session.");
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

  // 🔴 3. FIX LOGIN FUNCTION (STRICTLY NO REDIRECTS)
  const loginWithGoogle = async (): Promise<{ uid: string, isNewUser: boolean, role: string }> => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Sync with backend
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
      
      console.log("[Auth] Google sign-in successful. No navigation triggered here.");
      return { uid: result.user.uid, isNewUser, role };
    } catch (error: any) {
      console.error("[Auth Error] Google Login failed:", error.message || error);
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
      toast.success("Account permanently deleted.");
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
