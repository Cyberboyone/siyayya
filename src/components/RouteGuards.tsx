import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "./LoadingScreen";

/**
 * 🔴 4. PROFESSIONAL ADMIN ROUTE PROTECTION
 * Only allows access if the user is authenticated AND has role 'admin' in Firestore.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading: loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  // If no user, redirect to sign-in and save this location
  if (!user) {
    console.log("[AdminGuard] No user found, redirecting to signin.");
    return <Navigate to={`/signin?from=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // 🔴 Check for 'admin' role directly from the authenticated user object
  const isAdmin = user.role === "admin";

  if (!isAdmin) {
    console.warn(`[AdminGuard] Unauthorized access by ${user.email}. Role: ${user.role}`);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Wraps routes that require general authentication.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading: loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={`/signin?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  const isCompletingSignup = location.pathname === "/complete-signup";
  const needsProfileSetup = !user.businessName || user.businessName === "" || user.businessName === "Unknown User";

  if (!isCompletingSignup && needsProfileSetup) {
    return <Navigate to={`/complete-signup?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return <>{children}</>;
}
