import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/** Sends users without a workspace to onboarding to create one. */
export function WorkspaceSetupGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const { needsSetup, isLoading: workspaceLoading } = useWorkspace();

  useEffect(() => {
    if (authLoading || workspaceLoading || !isAuthenticated || isAdmin) return;
    if (!needsSetup) return;
    if (location.pathname.startsWith("/onboarding")) return;

    navigate("/onboarding/profile?next=/dashboard", { replace: true });
  }, [
    authLoading,
    workspaceLoading,
    isAuthenticated,
    isAdmin,
    needsSetup,
    location.pathname,
    navigate,
  ]);

  return <>{children}</>;
}
