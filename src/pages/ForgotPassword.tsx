import React from "react";
import { SignIn } from "@clerk/clerk-react";
import { Navigate, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { authClerkAppearance } from "@/components/auth/clerk-appearance";
import { useAuth } from "@/contexts/AuthContext";

const ForgotPassword = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Clerk's password reset flow lives under the SignIn component as a nested route
  // (e.g. /reset-password/forgot-password). Redirect to it so users land directly
  // on the reset UI instead of the generic sign-in step.
  if (location.pathname === "/reset-password" || location.pathname === "/reset-password/") {
    return <Navigate to="/reset-password/forgot-password" replace />;
  }

  return (
    <AuthShell
      backHref="/login"
      backLabel="Back to login"
      logoSrc="/sparefinderlogo.png"
      badge={
        <>
          <Shield className="mr-1.5 h-3.5 w-3.5 text-primary" />
          Secure access
        </>
      }
      title="Reset your access"
      description="Reset your password using Clerk’s secure recovery flow."
      rightImage={{
        src: "https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80",
        alt: "Technician using an AI-powered platform",
      }}
      rightContent={
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15 backdrop-blur">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Account recovery
          </div>
          <h2 className="max-w-md text-balance text-2xl font-semibold tracking-tight text-slate-50">
            Keep your team in the system,{" "}
            <span className="text-emerald-300">even when passwords slip.</span>
          </h2>
          <p className="max-w-md text-sm text-slate-300">
            SpareFinder keeps access secure while making recovery fast for busy workshops and parts
            counters.
          </p>
        </div>
      }
    >
      <SignIn
        routing="path"
        path="/reset-password"
        signUpUrl="/register"
        signInUrl="/login"
        appearance={authClerkAppearance as any}
      />
    </AuthShell>
  );
};

export default ForgotPassword;
