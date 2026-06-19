import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/config";

/**
 * 🔴 2. WHITELIST REDIRECT HANDLER
 * Ensures that admins are instantly routed to the dashboard upon login.
 */
const AuthRedirect = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (!user) return;

    // 🔴 1. Isolated Admin Whitelist Check
    const isUserAdmin = isAdmin(user.email);

    if (isUserAdmin) {
      console.log("[AuthRedirect] Admin whitelist match detected, redirecting to /admin");
      navigate("/admin", { replace: true });
      return;
    }

    // 🔴 2. Profile Completeness Check
    const hasBusinessName = user.businessName && user.businessName !== "" && user.businessName !== "Unknown User";
    
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
