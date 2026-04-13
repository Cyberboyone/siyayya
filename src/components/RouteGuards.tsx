import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "./LoadingScreen";

// 🔴 5. NORMALIZE EMAIL COMPARISON
const ADMIN_EMAIL = "muhammadmusab372@gmail.com";

/**
 * 🔴 6. KEEP ADMIN ROUTE CLEAN
 * Wraps admin-only routes.
 * It should ONLY guard, not redirect based on login flow.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  const isAdmin = user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Wraps routes that require authentication.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
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
