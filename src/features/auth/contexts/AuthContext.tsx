/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
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

  // Prevents onAuthStateChanged from duplicating work that loginWithGoogle already did
  const justLoggedInRef = useRef(false);
  const phoneLiteInProgressRef = useRef(false);

  // Read user profile directly from Firestore — no server API call needed
  const loadUserFromFirestore = async (firebaseUser: FirebaseUser): Promise<{ isNewUser: boolean }> => {
    try {
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
        return { isNewUser: !data.phone };
      } else {
        return { isNewUser: true };
      }
    } catch (error) {
      console.error("[Auth] Firestore read error:", error);
      // Set minimal user so the app doesn't block
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

  // Background sync to server — non-blocking, best-effort
  const syncToServerBackground = (idToken: string) => {
    fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }).catch(() => {
      // Silent — server sync is best-effort, client state is source of truth
    });
  };

  useEffect(() => {
    if (isFirebaseDisabled) {
      setIsLoading(false);
      return;
    }

    const loadingTimeout = setTimeout(() => {
      console.warn("[Auth] Loading stuck for 5s, releasing.");
      setIsLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      clearTimeout(loadingTimeout);
      try {
        if (firebaseUser) {
          // Skip if loginWithGoogle or loginWithPhoneLite already handled this auth event
          if (justLoggedInRef.current || phoneLiteInProgressRef.current) {
            justLoggedInRef.current = false;
            return;
          }

          if (firebaseUser.isAnonymous) {
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
            }
          } else {
            // Returning session — load from Firestore directly (fast path)
            await loadUserFromFirestore(firebaseUser);

            // Check admin claim without blocking — runs after user is set
            firebaseUser.getIdTokenResult().then(result => {
              setIsAdmin(!!result.claims.admin);
            }).catch(() => {});
          }
        } else {
          setUser(null);
          setIsAdmin(false);
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
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);

      // Mark so onAuthStateChanged skips re-processing this login event
      justLoggedInRef.current = true;

      // Check/create Firestore doc directly — no API round trip
      const docRef = doc(db, "users", result.user.uid);
      const docSnap = await getDoc(docRef);
      let isNewUser = false;

      if (!docSnap.exists()) {
        isNewUser = true;
        const newProfile = {
          id: result.user.uid,
          name: result.user.displayName || "User",
          email: result.user.email || "",
          avatar: result.user.photoURL || "",
          businessName: "",
          status: "active",
          rating: 0,
          reviewCount: 0,
          isVerified: false,
          joinedAt: new Date().toISOString(),
        };
        await setDoc(docRef, newProfile);
        setUser({ ...newProfile, businessName: "" } as User);
      } else {
        const data = docSnap.data();
        isNewUser = !data.phone;
        const userData = {
          id: result.user.uid,
          ...data,
          email: data.email || result.user.email || "",
          name: data.name || result.user.displayName || "User",
          avatar: data.avatar || result.user.photoURL || "",
        } as User;

        if (userData.isBanned) {
          toast.error("Your account has been banned.");
          await firebaseSignOut(auth);
          setUser(null);
          setIsLoading(false);
          throw new Error("Account banned");
        }
        setUser(userData);

        // Update basic profile info in background
        setDoc(docRef, {
          name: result.user.displayName || data.name,
          email: result.user.email || data.email,
          avatar: result.user.photoURL || data.avatar,
        }, { merge: true }).catch(() => {});
      }

      // Fire-and-forget server sync — doesn't block login
      result.user.getIdToken().then(idToken => {
        syncToServerBackground(idToken);
      }).catch(() => {});

      return { user: result.user, isNewUser };
    } catch (error: any) {
      justLoggedInRef.current = false;
      setIsLoading(false);
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        toast.error("Sign-in was cancelled.");
        throw error;
      }
      console.error("[Auth Error] Google Login failed:", error);
      if (error.message !== "Account banned") toast.error("Sign-in failed. Please try again.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPhoneLite = async (name: string, phone: string) => {
    try {
      setIsLoading(true);
      phoneLiteInProgressRef.current = true;
      const result = await signInAnonymously(auth);

      const newUserProfile: User = {
        id: result.user.uid,
        name,
        phone,
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

    try {
      if (!auth.currentUser.isAnonymous) {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(auth.currentUser, provider);
      }
    } catch (reAuthError: any) {
      if (reAuthError.code !== 'auth/cancelled-popup-request') {
        toast.error("Please sign in again before deleting your account.");
        throw reAuthError;
      }
      throw reAuthError;
    }

    const uid = user.id;
    try {
      const collections = ["products", "services"];
      const allRefs: any[] = [];

      for (const coll of collections) {
        const snap = await getDocs(query(collection(db, coll), where("ownerId", "==", uid)));
        snap.forEach(d => allRefs.push(d.ref));
      }

      const BATCH_LIMIT = 499;
      for (let i = 0; i < allRefs.length; i += BATCH_LIMIT) {
        const chunk = allRefs.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach(ref => batch.delete(ref));
        await batch.commit();
      }

      const userBatch = writeBatch(db);
      userBatch.delete(doc(db, "users", uid));
      await userBatch.commit();

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
