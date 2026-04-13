import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 🔴 2. ROLE-BASED REDIRECT HANDLER
 * This component is used EXCLUSIVELY on the login page.
 * It routes the user to the correct dashboard based on their database-assigned role.
 */
const AuthRedirect = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (!user) return;

    // 🔴 3. Proper Redirect Strategy
    if (user.role === "admin") {
      console.log("[AuthRedirect] Admin detected via database role, redirecting to /admin");
      navigate("/admin", { replace: true });
    } else {
      console.log("[AuthRedirect] Regular user detected, redirecting Home");
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  return null;
};

export default AuthRedirect;
