import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 🔴 4. CREATE A SEPARATE REDIRECT HANDLER COMPONENT
 * This component is used EXCLUSIVELY on the login page.
 * It handles the one-time transition from the auth flow to the application dashboard/admin.
 */
const ADMIN_EMAIL = "muhammadmusab372@gmail.com";

const AuthRedirect = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 🔴 9. DEBUG (MANDATORY)
    console.log("[AuthRedirect] Check:", { user: user?.email, isLoading });

    if (isLoading) return;

    if (!user) return;

    const email = user.email?.trim().toLowerCase();

    // 🔴 4. Redirect Logic
    if (email === ADMIN_EMAIL.toLowerCase()) {
      console.log("[AuthRedirect] Admin detected after login, redirecting to /admin");
      navigate("/admin", { replace: true });
    } else {
      console.log("[AuthRedirect] Regular user detected after login, redirecting Home");
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  return null;
};

export default AuthRedirect;
