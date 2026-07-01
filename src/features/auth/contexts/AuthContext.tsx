/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  reauthenticateWithPopup,
  deleteUser,
  setPersistence,
  browserLocalPersistence
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
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Prevents onAuthStateChanged from duplicating work that loginWithGoogle already did
  const justLoggedInRef = useRef(false);

  // Read user profile directly from Firestore — no server API call needed
  const loadUserFromFirestore = async (firebaseUser: FirebaseUser): Promise<{ isNewUser: boolean }> => {
    try {
      const docRef = doc(db, "users", firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const userData = {
          ...data,
          // Always trust Firebase Auth UID over any stale id saved in Firestore.
          // Old accounts can have a mismatched `id`, which makes listing writes fail
          // Firestore rules because ownerId must equal request.auth.uid.
          id: firebaseUser.uid,
          email: data.email || firebaseUser.email || "",
          name: data.name || firebaseUser.displayName || "Unknown User",
          businessName: data.businessName || ""
        } as User;

        if (data.id !== firebaseUser.uid) {
          setDoc(docRef, { id: firebaseUser.uid }, { merge: true }).catch(() => {});
        }

        if (userData.isBanned) {
          toast.error("Your account has been banned.");
          await firebaseSignOut(auth);
          setUser(null);
          return { isNewUser: false };
        }

        setUser(userData);
        return { isNewUser: !data.phone };
      } else {
        const newProfile = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || "User",
          email: firebaseUser.email || "",
          avatar: firebaseUser.photoURL || "",
          businessName: "",
          status: "active",
          rating: 0,
          reviewCount: 0,
          isVerified: false,
          joinedAt: new Date().toISOString(),
        };
        await setDoc(docRef, newProfile, { merge: true });
        setUser(newProfile as User);
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

  const completeGoogleSession = async (firebaseUser: FirebaseUser): Promise<{ user: FirebaseUser, isNewUser: boolean }> => {
    const { isNewUser } = await loadUserFromFirestore(firebaseUser);

    firebaseUser.getIdToken().then(idToken => {
      syncToServerBackground(idToken);
    }).catch(() => {});

    firebaseUser.getIdTokenResult().then(result => {
      setIsAdmin(!!result.claims.admin);
    }).catch(() => {});

    return { user: firebaseUser, isNewUser };
  };

  useEffect(() => {
    if (isFirebaseDisabled) {
      setIsLoading(false);
      return;
    }

    getRedirectResult(auth).then(async (result) => {
      if (!result?.user) return;
      justLoggedInRef.current = true;
      await completeGoogleSession(result.user);
    }).catch((error) => {
      console.error("[Auth Error] Google redirect failed:", error);
      toast.error("Google sign-in failed. Please try again.");
    }).finally(() => {
      sessionStorage.removeItem("siyayya_google_redirect_pending");
    });

    const loadingTimeout = setTimeout(() => {
      console.warn("[Auth] Loading stuck for 5s, releasing.");
      setIsLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      clearTimeout(loadingTimeout);
      try {
        if (firebaseUser) {
          // Skip if loginWithGoogle already handled this auth event
          if (justLoggedInRef.current) {
            justLoggedInRef.current = false;
            return;
          }

          if (firebaseUser.isAnonymous) {
            const docRef = doc(db, "users", firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              const userData = {
                ...data,
                // Always trust Firebase Auth UID over any stale id saved in Firestore.
                id: firebaseUser.uid,
                email: data.email || "",
                name: data.name || "User",
                businessName: data.businessName || data.name || ""
              } as User;

              if (data.id !== firebaseUser.uid) {
                setDoc(docRef, { id: firebaseUser.uid }, { merge: true }).catch(() => {});
              }

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
    sessionStorage.removeItem("siyayya_google_redirect_pending");

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      // Ensure persistence is ready before the Google flow starts. This is
      // especially important on Android/iOS where auth storage can be fragile.
      await setPersistence(auth, browserLocalPersistence).catch(() => {});

      // IMPORTANT: Do not use signInWithRedirect here. On Android, Google
      // redirect can hand the user from Chrome back into the installed PWA,
      // losing the Firebase result and leaving them stuck on /signin. Popup
      // keeps the flow inside the browser tab instead.
      const result = await signInWithPopup(auth, provider);

      // Mark so onAuthStateChanged skips re-processing this login event
      justLoggedInRef.current = true;

      return await completeGoogleSession(result.user);
    } catch (error: any) {
      justLoggedInRef.current = false;
      sessionStorage.removeItem("siyayya_google_redirect_pending");
      setIsLoading(false);

      if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
        toast.error("Sign-in was cancelled.");
        throw error;
      }

      if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/web-storage-unsupported"].includes(error.code)) {
        toast.error("Google sign-in popup was blocked. Please allow pop-ups for Siyayya or open the site in Chrome browser, not the installed app.");
        throw error;
      }

      console.error("[Auth Error] Google Login failed:", error);
      if (error.message !== "Account banned") toast.error("Sign-in failed. Please try again.");
      throw error;
    } finally {
      setIsLoading(false);
    }
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
