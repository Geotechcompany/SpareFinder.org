import React from "react";
import { Navigate } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";
import { Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthShell } from "@/components/auth/auth-shell";
import { authClerkAppearance } from "@/components/auth/clerk-appearance";

const AdminLogin = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <AuthShell
      backHref="/"
      backLabel="Back home"
      logoSrc="/sparefinderlogo.png"
      badge={
        <>
          <Shield className="mr-1.5 h-3.5 w-3.5 text-primary" />
          Admin access
        </>
      }
      title="Admin Console"
      description="Restricted access for administrators only."
      rightImage={{
        src: "https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80",
        alt: "Admin access",
      }}
    >
      <SignIn
        routing="path"
        path="/admin/login"
        signUpUrl="/register"
        signInUrl="/login"
        forceRedirectUrl="/admin/dashboard"
        appearance={authClerkAppearance as any}
      />
    </AuthShell>
  );
};

export default AdminLogin;
