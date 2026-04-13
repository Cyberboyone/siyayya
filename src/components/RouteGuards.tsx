import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "./LoadingScreen";

// 🔴 5. NORMALIZE EMAIL COMPARISON
const ADMIN_EMAIL = "muhammadmusab372@gmail.com";

/**
 * 🔴 2. IMPLEMENT PROPER ADMIN ROUTE GUARD
 * Wraps admin-only routes.
 * Redirects non-admins to / with state-aware logic.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  // 🔴 Waits for auth to finish loading
  if (isLoading) {
    return <LoadingScreen />;
  }

  // 🔴 Validates user existence
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // 🔴 5. NORMALIZE EMAIL COMPARISON
  // Confirms admin identity
  const isAdmin = user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // 🔴 6. ADD DEBUG LOGGING (TEMPORARY)
  console.log("[AdminRoute Check]", {
    email: user.email,
    isAdmin,
    isLoading
  });

  if (!isAdmin) {
    console.warn(`[AdminRoute] Unauthorized access attempt by ${user.email}`);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Wraps routes that require general authentication.
 * Redirects unauthenticated users to /signin.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 🔴 4. FIX PREMATURE REDIRECTS: Wait for auth to finish loading
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={`/signin?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Strict check for business name completion
  const isCompletingSignup = location.pathname === "/complete-signup";
  const needsProfileSetup = !user.businessName || user.businessName === "" || user.businessName === "Unknown User";

  if (!isCompletingSignup && needsProfileSetup) {
    return <Navigate to={`/complete-signup?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return <>{children}</>;
}

/**
 * Wraps auth pages (signin/signup).
 * Redirects already-authenticated users to their appropriate dashboard.
 */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // 🔴 Wait for auth to resolve
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && user) {
    const isAdmin = user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const redirectPath = isAdmin ? "/admin" : "/dashboard";
    
    console.log(`[GuestRoute] Authenticated user ${user.email} redirecting to ${redirectPath}`);
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
