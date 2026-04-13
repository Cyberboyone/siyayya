import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "./LoadingScreen";
import { isAdmin } from "@/lib/config";

/**
 * 🔴 3. PROTECT ADMIN ROUTES (WHITELIST APPROACH)
 * Only allows access if the user email is present in the ADMIN_EMAILS constant.
 * This approach is extremely simple, reliable, and consistent across all environments.
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

  // 🔴 Use the whitelist check from central config
  const isWhitelisted = isAdmin(user.email);

  if (!isWhitelisted) {
    console.warn(`[AdminGuard] Access denied for ${user.email}. (Not in whitelist)`);
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
