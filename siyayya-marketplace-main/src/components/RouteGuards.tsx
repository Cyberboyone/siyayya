import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Wraps routes that require authentication.
 * Redirects unauthenticated users to /signin.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={`/signin?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Strict check for business name completion
  const isCompletingSignup = location.pathname === "/complete-signup";
  if (user && !isCompletingSignup && (!user.businessName || user.businessName === "" || user.businessName === "Unknown User")) {
    return <Navigate to={`/complete-signup?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return <>{children}</>;
}

/**
 * Wraps admin-only routes.
 * Redirects non-admins to / with an error toast.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null; // Wait for auth to resolve

  if (!isAuthenticated) {
    return <Navigate to={`/signin?from=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Wraps auth pages (signin/signup).
 * Redirects already-authenticated users based strictly on their role.
 */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null; // Wait for auth to resolve

  if (isAuthenticated) {
    const role = user?.role || "user";
    let redirectPath = "/";
    
    if (role === "admin") {
      redirectPath = "/admin";
    }

    console.log(`[AuthRedirect] User: ${user?.email}, Role: ${role}, Redirecting to: ${redirectPath}`);

    // Prevent infinite redirect loops if redirectPath is current location somehow (should not happen for Guest routes but safe)
    if (redirectPath === location.pathname) {
      return <Navigate to="/" replace />;
    }

    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
