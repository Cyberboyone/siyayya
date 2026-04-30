import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "./LoadingScreen";
import { isAdmin } from "@/lib/config";
import { useRef, useEffect } from "react";

/**
 * 🎯 SMART REDIRECT LOGIC
 * Shared utility to determine where a user should be based on their profile state.
 */
export const getSmartRedirectPath = (user: any) => {
  if (!user) return "/signin";
  
  // 1. Admins go to the admin panel
  if (isAdmin(user.email)) return "/admin";
  
  // 2. Users with incomplete profiles go to signup completion
  const hasBusinessName = user.businessName && 
                          user.businessName.trim() !== "" && 
                          user.businessName !== "Unknown User";
                          
  if (!hasBusinessName) return "/complete-signup";
  
  // 3. Everyone else goes to their dashboard
  return "/dashboard";
};

/**
 * 🔒 PROTECTED ROUTE
 * Ensures the user is logged in AND is on the correct page for their role/status.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const redirectPathRef = useRef<string | null>(null);

  if (isLoading) return <LoadingScreen />;

  if (!user) {
    console.log(`[ProtectedRoute] No session: Redirecting to /signin`);
    return <Navigate to={`/signin?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Intelligence: Redirect if they are on the wrong protected page
  // e.g. An admin trying to access the user dashboard, or a new user skipping signup.
  const targetPath = getSmartRedirectPath(user);
  const currentPath = location.pathname;

  // 🔴 LOOP GUARD: Prevent infinite navigation if we've already redirected to this path
  if (redirectPathRef.current === currentPath) {
    console.warn(`[ProtectedRoute] Loop detected/prevented: Already on ${currentPath}`);
  }

  // Only redirect if the current path isn't the target path
  if (targetPath === "/admin" && !currentPath.startsWith("/admin")) {
    redirectPathRef.current = "/admin";
    return <Navigate to="/admin" replace />;
  }
  
  if (targetPath === "/complete-signup" && currentPath !== "/complete-signup") {
    redirectPathRef.current = "/complete-signup";
    return <Navigate to="/complete-signup" replace />;
  }
  
  if (targetPath === "/dashboard" && currentPath === "/complete-signup") {
    redirectPathRef.current = "/dashboard";
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * 🔓 PUBLIC ROUTE
 * Prevents logged-in users from seeing sign-in pages.
 */
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const hasRedirected = useRef(false);

  if (isLoading) return <LoadingScreen />;

  if (user && !hasRedirected.current) {
    const targetPath = getSmartRedirectPath(user);
    // Don't redirect if we are already where we need to be
    if (location.pathname !== targetPath) {
      console.log(`[PublicRoute] Authenticated user detected: Redirecting to ${targetPath}`);
      hasRedirected.current = true;
      return <Navigate to={targetPath} replace />;
    }
  }

  return <>{children}</>;
}
