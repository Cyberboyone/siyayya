import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/config";
import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * 👑 ADMIN ROUTE
 * Only accessible by users in the admin whitelist.
 */
export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (!user || !isAdmin(user.email)) {
     console.warn(`[AdminRoute] Unauthorized access attempt by: ${user?.email || "Guest"}`);
     return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
