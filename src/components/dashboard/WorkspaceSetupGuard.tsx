import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/** Routes users may visit before they have an active workspace (e.g. billing, then onboarding). */
const ALLOWED_WITHOUT_WORKSPACE_PREFIXES = [
  "/onboarding",
  "/dashboard/billing",
  "/dashboard/settings",
] as const;

/** Sends users without an active workspace to onboarding to create one. */
export function WorkspaceSetupGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const { activeWorkspaceId, isLoading: workspaceLoading } = useWorkspace();

  useEffect(() => {
    if (authLoading || workspaceLoading || !isAuthenticated || isAdmin) return;
    if (activeWorkspaceId) return;

    const path = location.pathname;
    if (
      ALLOWED_WITHOUT_WORKSPACE_PREFIXES.some((prefix) => path.startsWith(prefix))
    ) {
      return;
    }

    const next = encodeURIComponent(
      `${location.pathname}${location.search}${location.hash}`
    );
    navigate(`/onboarding/profile?next=${next}`, { replace: true });
  }, [
    authLoading,
    workspaceLoading,
    isAuthenticated,
    isAdmin,
    activeWorkspaceId,
    location.pathname,
    location.search,
    location.hash,
    navigate,
  ]);

  return <>{children}</>;
}
