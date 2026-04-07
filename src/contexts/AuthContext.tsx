import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
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
          // Fetch custom user data from Firestore if not already set or if UID changed
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const fetchedUser = { id: firebaseUser.uid, ...docSnap.data() } as User;
            setUser(fetchedUser);
          } else {
            // Fallback if no firestore document exists yet (common in immediate signup)
            setUser(prev => {
              if (prev && prev.id === firebaseUser.uid && prev.name !== "Unknown User") {
                return prev;
              }
              return {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || "Unknown User",
                email: firebaseUser.email || "",
                phone: firebaseUser.phoneNumber || "",
                rating: 0,
                reviewCount: 0
              };
            });
          }
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
          // Fallback user even if Firestore fails
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || "Unknown User",
            email: firebaseUser.email || "",
            phone: firebaseUser.phoneNumber || "",
            rating: 0,
            reviewCount: 0
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);


  // ─── Google Sign In (client-side popup — works locally and on Vercel) ───
  const loginWithGoogle = async (): Promise<{ uid: string, isNewUser: boolean, role: string }> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    const uid = firebaseUser.uid;
    const email = firebaseUser.email || "";

    // Determine role: only the admin email gets admin access
    const assignedRole = email === "muhammadmusab372@gmail.com" ? "admin" : "user";

    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // New user — create their Firestore profile
      await setDoc(docRef, {
        id: uid,
        name: firebaseUser.displayName || "Unknown User",
        email,
        avatar: firebaseUser.photoURL || "",
        businessName: "",
        role: assignedRole,
        status: "active",
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        joinedAt: new Date().toISOString(),
      });
      console.log(`[Login] New user created. Email: ${email}, Role: ${assignedRole}`);
      return { uid, isNewUser: true, role: assignedRole };
    } else {
      // Existing user — enforce role based on email (always up-to-date)
      await setDoc(docRef, { role: assignedRole }, { merge: true });
      const userData = docSnap.data();
      const hasBusinessName = !!(userData?.businessName && userData.businessName !== "");
      console.log(`[Login] Existing user. Email: ${email}, Role: ${assignedRole}, HasBusinessName: ${hasBusinessName}`);
      return { uid, isNewUser: !hasBusinessName, role: assignedRole };
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
