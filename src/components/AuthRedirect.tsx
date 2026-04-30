import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/config";

/**
 * 🎯 AUTH REDIRECT HANDLER
 * Ensures that users are instantly routed to the correct dashboard upon login.
 * Uses a guard to prevent redirect loops or multiple triggerings.
 */
const AuthRedirect = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading || !user || hasRedirected.current) return;

    // Mark as redirected to prevent double-firing in the same lifecycle
    hasRedirected.current = true;

    // 🔴 1. Isolated Admin Whitelist Check
    const isUserAdmin = isAdmin(user.email);

    if (isUserAdmin) {
      console.log("[AuthRedirect] Admin whitelist match detected, redirecting to /admin");
      navigate("/admin", { replace: true });
      return;
    }

    // 🔴 2. Profile Completeness Check
    const hasBusinessName = user.businessName && 
                          user.businessName.trim() !== "" && 
                          user.businessName !== "Unknown User";
    
    if (hasBusinessName) {
      console.log(`[AuthRedirect] Existing user ${user.email} (profile complete) redirecting to /dashboard`);
      navigate("/dashboard", { replace: true });
    } else {
      console.log(`[AuthRedirect] New user ${user.email} (profile incomplete) redirecting to /complete-signup`);
      navigate("/complete-signup", { replace: true });
    }
  }, [user, isLoading, navigate]);

  return null;
};

export default AuthRedirect;
