import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { ADMIN_EMAILS } from "@/lib/config";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center p-20">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Double check: if no user or email not in list, redirect to Home
  if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
     console.warn(`[AdminRoute] Unauthorized access attempt by: ${user?.email || "Guest"}`);
     return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
