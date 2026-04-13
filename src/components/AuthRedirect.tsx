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

    // 🔴 Step 2: Immediate Whitelist Check
    if (isAdmin(user.email)) {
      console.log("[AuthRedirect] Admin whitelist match detected, redirecting to /admin");
      navigate("/admin", { replace: true });
    } else {
      console.log("[AuthRedirect] Regular user detected, redirecting Home");
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  return null;
};

export default AuthRedirect;
