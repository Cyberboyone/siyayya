/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  deleteUser,
  signInAnonymously
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
  isAdmin: boolean;
  isLoading: boolean;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<{ user: FirebaseUser, isNewUser: boolean }>;
  loginWithPhoneLite: (name: string, phone: string) => Promise<any>;
  addPhoneToGoogleAccount: (phone: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const phoneLiteInProgressRef = useRef(false);

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
          if (updatedUser.isBanned) {
            toast.error("Your account has been banned.");
            await firebaseSignOut(auth);
            setUser(null);
            return { isNewUser: false };
          }
          setUser(updatedUser);
        }
        return { isNewUser };
      } else {
        if (response.status >= 400) {
          console.warn(`[Auth] API sync issue (${response.status}). Falling back to direct Firestore fetch...`);
          
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const userData = { 
              id: firebaseUser.uid, 
              ...data,
              email: data.email || firebaseUser.email || "",
              name: data.name || firebaseUser.displayName || "Unknown User",
              businessName: data.businessName || ""
            } as User;

            if (userData.isBanned) {
              toast.error("Your account has been banned.");
              await firebaseSignOut(auth);
              setUser(null);
              return { isNewUser: false };
            }

            setUser(userData);
            return { isNewUser: !userData.businessName };
          } else {
             return { isNewUser: true };
          }
        }

        const errorData = await response.json().catch(() => ({}));
        console.error("[Auth] Profile sync failed:", response.status, errorData);
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "User",
          businessName: "",
          rating: 0,
          reviewCount: 0
        });
        return { isNewUser: false };
      }
    } catch (error) {
      console.error("[Auth] Profile sync error:", error);
      setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "User",
        businessName: "",
        rating: 0,
        reviewCount: 0
      });
      return { isNewUser: false };
    }
  };

  useEffect(() => {
    if (isFirebaseDisabled) {
      setIsLoading(false);
      return;
    }

    const loadingTimeout = setTimeout(() => {
      console.warn("[Auth] Loading state was stuck for 10s. Forcing release.");
      setIsLoading(false);
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      clearTimeout(loadingTimeout);
      try {
        if (firebaseUser) {
          console.log(`[Auth Context] User detected: uid=${firebaseUser.uid}, email=${firebaseUser.email}, anonymous=${firebaseUser.isAnonymous}`);
          
          try {
            const idTokenResult = await firebaseUser.getIdTokenResult();
            setIsAdmin(!!idTokenResult.claims.admin);
          } catch (e) {
            console.error("Failed to fetch custom claims:", e);
          }
          
          // If loginWithPhoneLite is actively running, skip — it handles its own user state
          if (phoneLiteInProgressRef.current) {
            console.log("[Auth Context] Phone-lite login in progress, skipping onAuthStateChanged processing.");
            return;
          }

          if (firebaseUser.isAnonymous) {
            // Anonymous users: read profile directly from Firestore (no API call)
            console.log("[Auth Context] Anonymous user detected, reading profile from Firestore...");
            const docRef = doc(db, "users", firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              const userData = {
                id: firebaseUser.uid,
                ...data,
                email: data.email || "",
                name: data.name || "User",
                businessName: data.businessName || data.name || ""
              } as User;

              if (userData.isBanned || userData.status === 'banned' || userData.status === 'suspended') {
                toast.error("Your account has been banned.");
                await firebaseSignOut(auth);
                setUser(null);
                return;
              }

              setUser(userData);
              console.log("[Auth Context] Anonymous user profile loaded from Firestore.");
            } else {
              console.warn("[Auth Context] Anonymous user has no Firestore profile.");
              // Don't set a minimal user — wait for loginWithPhoneLite to create the profile
            }
          } else {
            // Google / email users: use existing API sync flow
            await syncUserProfile(firebaseUser);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
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
      
      const docRef = doc(db, "users", result.user.uid);
      const docSnap = await getDoc(docRef);
      const isNewUser = !docSnap.exists() || !docSnap.data().phone;
      
      return { user: result.user, isNewUser };
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

  const loginWithPhoneLite = async (name: string, phone: string) => {
    try {
      setIsLoading(true);
      phoneLiteInProgressRef.current = true;
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInAnonymously(auth);
      
      const newUserProfile: User = {
        id: result.user.uid,
        name: name,
        phone: phone,
        email: "",
        businessName: name,
        businessNameLower: normalizeBusinessName(name),
        rating: 5.0,
        reviewCount: 0,
        account_type: "buyer",
        status: "active",
        phone_verified: false,
        profile_completed: false
      };
      
      const docRef = doc(db, "users", result.user.uid);
      await setDoc(docRef, newUserProfile, { merge: true });
      setUser(newUserProfile);
      return result.user;
    } catch (error: any) {
      console.error("[Auth Error] Phone Lite Login failed:", error);
      toast.error("Login failed. Check connection or try Google Sign In.");
      throw error;
    } finally {
      phoneLiteInProgressRef.current = false;
      setIsLoading(false);
    }
  };

  const addPhoneToGoogleAccount = async (phone: string) => {
    if (!user) throw new Error("No user session");
    const docRef = doc(db, "users", user.id);
    await setDoc(docRef, { phone, phone_verified: false }, { merge: true });
    setUser(prev => prev ? { ...prev, phone, phone_verified: false } as User : null);
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
      isAdmin,
      isLoading, 
      logout, 
      updateProfile, 
      loginWithGoogle, 
      loginWithPhoneLite,
      addPhoneToGoogleAccount,
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
