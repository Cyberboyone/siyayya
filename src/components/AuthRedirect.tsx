import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { getSmartRedirectPath, isProfileComplete } from "@/features/auth/components/RouteGuards";

/**
 * 🎯 AUTH REDIRECT HANDLER
 * Ensures that users are instantly routed to the correct dashboard upon login.
 * Uses a guard to prevent redirect loops or multiple triggerings.
 */
const AuthRedirect = () => {
  const { user, isLoading, isAdmin: hasAdminClaim } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading || !user || hasRedirected.current) return;

    // Mark as redirected to prevent double-firing in the same lifecycle
    hasRedirected.current = true;

    // Get the return path if it exists
    const searchParams = new URLSearchParams(location.search);
    const fromPath = searchParams.get("from");

    // Checks the email whitelist, Firestore account_type/isAdmin, AND the
    // live Firebase custom claim from AuthContext — using getSmartRedirectPath
    // directly keeps this in sync with ProtectedRoute/PublicRoute instead of
    // duplicating an email-only check that missed dynamically-promoted admins.
    const targetPath = getSmartRedirectPath({ ...user, isAdmin: hasAdminClaim || (user as any).isAdmin });

    if (targetPath === "/admin") {
      console.log("[AuthRedirect] Admin detected, redirecting to /admin");
      navigate(fromPath || "/admin", { replace: true });
      return;
    }

    // Profile Completeness Check
    if (isProfileComplete(user)) {
      console.log(`[AuthRedirect] Existing user ${user.email} (profile complete) redirecting to ${fromPath || "/dashboard"}`);
      navigate(fromPath || "/dashboard", { replace: true });
    } else {
      console.log(`[AuthRedirect] New user ${user.email} (profile incomplete) redirecting to /complete-signup`);
      const targetUrl = fromPath 
        ? `/complete-signup?from=${encodeURIComponent(fromPath)}` 
        : "/complete-signup";
      navigate(targetUrl, { replace: true });
    }
  }, [user, isLoading, navigate, location.search, hasAdminClaim]);

  return null;
};

export default AuthRedirect;
