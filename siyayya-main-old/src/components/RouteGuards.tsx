import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "./LoadingScreen";


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
    console.log(`[ProtectedRoute] Unauthenticated access attempt to ${location.pathname}. Redirecting to /signin`);
    return <Navigate to={`/signin?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  const isCompletingSignup = location.pathname === "/complete-signup";
  const hasBusinessName = user.businessName && user.businessName !== "" && user.businessName !== "Unknown User";
  const needsProfileSetup = !hasBusinessName;

  if (!isCompletingSignup && needsProfileSetup) {
    console.log(`[ProtectedRoute] User ${user.email} (UID: ${user.id}) needs profile setup. Redirecting to /complete-signup`);
    return <Navigate to={`/complete-signup?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return <>{children}</>;
}
