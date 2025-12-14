import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SpinningLogoLoader } from "@/components/brand/spinning-logo-loader";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'super_admin';
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ 
  children, 
  requiredRole = 'admin' 
}) => {
  const { user, isLoading, isAuthenticated, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();

  // Show loading state
  if (isLoading) {
    return <SpinningLogoLoader label="Loading…" />;
  }

  // Redirect to admin login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Clerk can be authenticated before the app profile finishes hydrating.
  // Avoid false "unauthorized" redirects during this brief window.
  if (!user) {
    return <SpinningLogoLoader label="Loading admin profile…" />;
  }

  const hasRequiredRole =
    requiredRole === "super_admin" ? isSuperAdmin : isAdmin;

  if (!hasRequiredRole) {
    return (
      <Navigate
        to="/unauthorized"
        state={{ from: location, requiredRole }}
        replace
      />
    );
  }

  // Render protected content
  return <>{children}</>;
};

export default AdminProtectedRoute; 