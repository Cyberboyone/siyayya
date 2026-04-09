import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  deleteUser
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch, deleteDoc } from "firebase/firestore";
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

  useEffect(() => {
    if (isFirebaseDisabled) {
      console.log("[Auth] Firebase is disabled. Proceeding as guest.");
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Fetch custom user data from Firestore
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const fetchedUser = { id: firebaseUser.uid, ...docSnap.data() } as User;
            setUser(fetchedUser);
          } else {
            console.warn("User authenticated but no Firestore document found.");
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "Unknown User",
              email: firebaseUser.email || "",
              phone: firebaseUser.phoneNumber || "",
              rating: 0,
              reviewCount: 0
            });
          }
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);


  // --- Combined Firebase Popup Login & Backend Verification ---
  const loginWithGoogle = async (): Promise<{ uid: string, isNewUser: boolean, role: string }> => {
    try {
      setIsLoading(true);
      console.log("[Auth] Triggering Google Popup...");
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      console.log("[Auth] Popup result received:", !!result.user);

      const idToken = await result.user.getIdToken();
      console.log("[Auth] ID Token retrieved successfully.");

      // 1. Verify with our backend and sync user data
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
      console.log(`[Auth] Backend sync successful. New User: ${isNewUser}, Role: ${role}`);

      return { uid: result.user.uid, isNewUser, role };
    } catch (error: any) {
      console.error("[Auth Error] Google Login Failed!");
      console.error("  Error Code:", error.code);
      console.error("  Error Message:", error.message);
      
      // Production-specific whitelisting error
      if (error.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        toast.error(`Domain "${currentDomain}" is not authorized! Please whitelist it in the Firebase Console (Authentication > Settings > Authorized Domains).`, { duration: 10000 });
      } else if (error.code === 'auth/popup-blocked') {
        toast.error("Sign-in popup blocked. Please allow popups for this site.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.info("Sign-in cancelled.");
      } else {
        toast.error(error.message || "Authentication failed. Please try again.");
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkBusinessNameUniqueness = async (name: string): Promise<boolean> => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("businessName", "==", name));
    const querySnapshot = await getDocs(q);
    
    // If we find any other user with this business name, it's not unique
    // (Excluding the current user if they're already set it)
    if (querySnapshot.empty) return true;
    
    if (user && querySnapshot.docs.length === 1 && querySnapshot.docs[0].id === user.id) {
      return true;
    }
    
    return false;
  };


  const deleteAccount = async () => {
    if (!user || !auth.currentUser) throw new Error("No authenticated user");

    const uid = user.id;
    const batch = writeBatch(db);

    try {
      // 1. Delete listings (products)
      const productsQuery = query(collection(db, "products"), where("ownerId", "==", uid));
      const productsSnap = await getDocs(productsQuery);
      productsSnap.forEach(d => batch.delete(d.ref));

      // 2. Delete services
      const servicesQuery = query(collection(db, "services"), where("ownerId", "==", uid));
      const servicesSnap = await getDocs(servicesQuery);
      servicesSnap.forEach(d => batch.delete(d.ref));

      // 3. Delete requests
      const requestsQuery = query(collection(db, "requests"), where("ownerId", "==", uid));
      const requestsSnap = await getDocs(requestsQuery);
      requestsSnap.forEach(d => batch.delete(d.ref));

      // 4. Delete user profile
      batch.delete(doc(db, "users", uid));

      // Commit all Firestore deletions
      await batch.commit();

      // 5. Delete authentication record
      await deleteUser(auth.currentUser);
      
      setUser(null);
      toast.success("Your account and all data have been permanently deleted.");
    } catch (error) {
      console.error("Error deleting account:", error);
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
    
    // Update local state
    setUser(prev => prev ? { ...prev, ...data } as User : null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, logout, updateProfile, loginWithGoogle, checkBusinessNameUniqueness, deleteAccount }}>
      {!isLoading && children}
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
