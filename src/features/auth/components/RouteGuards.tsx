/* eslint-disable react-refresh/only-export-components */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { isAdmin } from "@/lib/config";
import { useRef } from "react";

/**
 * 🎯 SMART REDIRECT LOGIC
 * Shared utility to determine where a user should be based on their profile state.
 */
type AuthUserProfile = {
  email?: string;
  businessName?: string;
  name?: string;
  campusId?: string;
  profile_completed?: boolean;
};

export const isProfileComplete = (user: AuthUserProfile | null | undefined) => {
  if (!user) return false;

  const hasDisplayName = !!user.businessName?.trim() && user.businessName !== "Unknown User";
  const hasCampus = !!user.campusId?.trim();

  return user.profile_completed === true || (hasDisplayName && hasCampus);
};

export const getSmartRedirectPath = (user: AuthUserProfile | null | undefined) => {
  if (!user) return "/signin";
  
  // 1. Admins go to the admin panel
  if (isAdmin(user.email)) return "/admin";
  
  // 2. Users with incomplete profiles go to signup completion
  if (!isProfileComplete(user)) return "/complete-signup";
  
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
  const lastUserIdRef = useRef<string | null>(null);

  // Reset loop guard if user changes
  if (user?.id !== lastUserIdRef.current) {
    redirectPathRef.current = null;
    lastUserIdRef.current = user?.id || null;
  }

  if (isLoading) return <LoadingScreen />;

  if (!user) {
    console.log(`[ProtectedRoute] No session: Redirecting to /signin`);
    return <Navigate to={`/signin?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Intelligence: Redirect if they are on the wrong protected page
  const targetPath = getSmartRedirectPath(user);
  const currentPath = location.pathname;

  // 🔴 LOOP GUARD
  if (redirectPathRef.current === currentPath) {
    return <>{children}</>;
  }

  if (targetPath === "/complete-signup" && currentPath !== "/complete-signup") {
    redirectPathRef.current = "/complete-signup";
    // Preserve the original destination so CompleteSignup can send them back after completion
    return <Navigate to={`/complete-signup?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
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
    if (location.pathname !== targetPath) {
      console.log(`[PublicRoute] Authenticated user detected: Redirecting to ${targetPath}`);
      hasRedirected.current = true;
      return <Navigate to={targetPath} replace />;
    }
  }

  return <>{children}</>;
}
