import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "./LoadingScreen";

const ADMIN_EMAIL = "muhammadmusab372@gmail.com";

/**
 * 🔴 6. REBUILD ADMIN ROUTE (CLEAN)
 * It should ONLY guard, not redirect based on login flow.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading: loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  // 🔴 6. If no user, redirect to sign-in
  if (!user) {
    return <Navigate to={`/signin?from=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // 🔴 6. Normalize & Validate Admin identity
  const isAdmin = user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // 🔴 6. If not admin, redirect to home
  if (!isAdmin) {
    console.warn(`[AdminGuard] Unauthorized access attempt by ${user.email}`);
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

  // Strict check for profile completion
  const isCompletingSignup = location.pathname === "/complete-signup";
  const needsProfileSetup = !user.businessName || user.businessName === "" || user.businessName === "Unknown User";

  if (!isCompletingSignup && needsProfileSetup) {
    return <Navigate to={`/complete-signup?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return <>{children}</>;
}
