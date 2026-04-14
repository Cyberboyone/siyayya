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
  loginWithGoogle: () => Promise<{ uid: string, isNewUser: boolean }>;
  checkBusinessNameUniqueness: (name: string) => Promise<boolean>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔴 Refactored for Simplicity:
  // Role logic has been removed from AuthContext.
  // Administrative status is now determined by the whitelist in src/lib/config.ts

  useEffect(() => {
    if (isFirebaseDisabled) {
      setIsLoading(false);
      return;
    }

    // 🔴 CENTRALIZED AUTH LISTENER
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          let userData: User;
          
          if (docSnap.exists()) {
            userData = { 
              id: firebaseUser.uid, 
              ...docSnap.data(),
              businessName: docSnap.data().businessName || "" // Ensure businessName is at least an empty string
            } as User;
          } else {
            console.log("[Auth] New user profile initialization required.");
            userData = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "Unknown User",
              email: firebaseUser.email || "",
              phone: firebaseUser.phoneNumber || "",
              businessName: "", // Initialize as empty string
              rating: 0,
              reviewCount: 0
            };
          }

          setUser(userData);
        } else {
          setUser(null);
          console.log("[Auth] No active session.");
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

  // 🔴 5. Simplified Login Flow
  const loginWithGoogle = async (): Promise<{ uid: string, isNewUser: boolean }> => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();
      
      console.log("[Auth] Signed in via Google. Synchronizing profile...");

      let isNewUser = false;

      try {
        // We still perform a backend sync to ensure the user is registered in Firestore.
        // We no longer expect or care about a 'role' from the response.
        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        if (response.ok) {
          const syncData = await response.json();
          isNewUser = syncData.isNewUser;
          console.log("[Auth] Profile sync successful.");
        } else {
          console.warn("[Auth] Profile sync failed, continuing with client-side state.");
        }
      } catch (syncError) {
        console.warn("[Auth] Profile sync error:", syncError);
      }

      toast.success(`Welcome, ${firebaseUser.displayName || 'User'}!`);
      return { uid: firebaseUser.uid, isNewUser };
    } catch (error: any) {
      console.error("[Auth Error] Google Login failed:", error);
      let msg = "Login failed.";
      if (error.code === 'auth/popup-closed-by-user') msg = "Login was cancelled.";
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkBusinessNameUniqueness = async (name: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("businessName", "==", name));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return true;
      
      // If there are results, check if they belong to the current user
      // We use auth.currentUser.uid to be absolutely sure we're comparing against the current session
      const currentUid = auth.currentUser?.uid;
      const isOwnedByCurrentUser = querySnapshot.docs.every(doc => doc.id === currentUid);
      
      return isOwnedByCurrentUser;
    } catch (error) {
      console.error("Uniqueness check failed:", error);
      return false; // Error defaults to "taken" for safety
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
