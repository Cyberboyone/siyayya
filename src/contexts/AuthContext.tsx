import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { auth, db, isFirebaseDisabled } from "@/lib/firebase";
import { User } from "@/lib/mock-data";
import { toast } from "sonner";

// ── Admin email list from environment variable ──────────────
// This is NOT hardcoded — it is read from the build-time environment config.
// To change admins, update VITE_ADMIN_EMAILS in .env / Vercel Dashboard.
const ADMIN_EMAILS: string[] = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<{ uid: string; isNewUser: boolean; role: string }>;
  checkBusinessNameUniqueness: (name: string) => Promise<boolean>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // DEV BYPASS for local testing without Google Sign-In
    if (localStorage.getItem("dev_impersonate_admin") === "true") {
      console.warn("[Auth] DEV MODE: Impersonating Admin");
      setUser({
        id: "dev-admin-uid",
        name: "Dev Admin",
        email: ADMIN_EMAILS[0] || "admin@siyayya.com",
        role: "admin",
        isVerified: true,
      } as User);
      setIsLoading(false);
      return;
    }

    if (isFirebaseDisabled) {
      console.log("[Auth] Firebase disabled — guest mode.");
      setIsLoading(false);
      return;
    }

    // ── Single Source of Truth: onAuthStateChanged ────────────
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        let userData: User;

        if (docSnap.exists()) {
          userData = { id: firebaseUser.uid, ...docSnap.data() } as User;
        } else {
          // Fallback profile when Firestore document doesn't exist yet
          userData = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || "Unknown User",
            email: firebaseUser.email || "",
            phone: firebaseUser.phoneNumber || "",
            rating: 0,
            reviewCount: 0,
            role: "user",
          };
        }

        // ── Self-healing admin promotion ──────────────────────
        // If email is in the admin list but role isn't set, fix it
        if (isAdminEmail(userData.email) && userData.role !== "admin") {
          console.log("[Auth] Promoting user to admin (env config match).");
          userData.role = "admin";
          // Persist to Firestore so future logins are instant
          try {
            if (docSnap.exists()) {
              await updateDoc(docRef, { role: "admin" });
            } else {
              await setDoc(docRef, { ...userData, role: "admin" });
            }
          } catch (e) {
            console.warn("[Auth] Could not persist admin role to Firestore:", e);
          }
        }

        setUser(userData);
        console.log("[Auth State]", { uid: firebaseUser.uid, email: userData.email, role: userData.role });
      } catch (error) {
        console.error("[Auth Context Error]:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ── Login with Google ──────────────────────────────────────
  const loginWithGoogle = async (): Promise<{ uid: string; isNewUser: boolean; role: string }> => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();

      let isNewUser = false;
      let role = isAdminEmail(firebaseUser.email) ? "admin" : "user";

      // Try backend sync, but don't crash if it fails
      try {
        const resp = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (resp.ok) {
          const data = await resp.json();
          isNewUser = data.isNewUser;
          role = data.role;
          console.log("[Auth] Backend sync OK:", { isNewUser, role });
        } else {
          console.warn("[Auth] Backend sync failed, using local role resolution.");
        }
      } catch {
        console.warn("[Auth] Backend unreachable, using local role resolution.");
      }

      // Ensure admin emails always get admin role regardless of backend response
      if (isAdminEmail(firebaseUser.email)) {
        role = "admin";
      }

      toast.success(`Welcome, ${firebaseUser.displayName || "User"}!`);
      return { uid: firebaseUser.uid, isNewUser, role };
    } catch (error: any) {
      let msg = "Google sign-in failed.";
      if (error.code === "auth/popup-closed-by-user") msg = "Sign-in cancelled.";
      else if (error.code === "auth/popup-blocked") msg = "Popup blocked — allow popups for this site.";
      else if (error.code === "auth/unauthorized-domain") msg = "Domain not authorized in Firebase.";
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkBusinessNameUniqueness = async (name: string): Promise<boolean> => {
    const q = query(collection(db, "users"), where("businessName", "==", name));
    const snap = await getDocs(q);
    if (snap.empty) return true;
    if (user && snap.docs.length === 1 && snap.docs[0].id === user.id) return true;
    return false;
  };

  const deleteAccount = async () => {
    if (!user || !auth.currentUser) throw new Error("No authenticated user");
    const uid = user.id;
    const batch = writeBatch(db);
    try {
      for (const coll of ["products", "services", "requests"]) {
        const snap = await getDocs(query(collection(db, coll), where("ownerId", "==", uid)));
        snap.forEach((d) => batch.delete(d.ref));
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
    setUser((prev) => (prev ? ({ ...prev, ...data } as User) : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        updateProfile,
        loginWithGoogle,
        checkBusinessNameUniqueness,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
