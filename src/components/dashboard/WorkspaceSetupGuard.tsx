import React from "react";
import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/** Routes users may visit before they have an active workspace (e.g. billing, then onboarding). */
const ALLOWED_WITHOUT_WORKSPACE_PREFIXES = [
  "/onboarding",
  "/dashboard/billing",
  "/dashboard/settings",
] as const;

function isAllowedWithoutWorkspace(pathname: string): boolean {
  return ALLOWED_WITHOUT_WORKSPACE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
}

/** Sends users without an active workspace to onboarding; avoids mounting dashboard routes first. */
export function WorkspaceSetupGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const { activeWorkspaceId, isLoading: workspaceLoading } = useWorkspace();

  if (authLoading || workspaceLoading) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        aria-busy="true"
        aria-label="Loading workspace"
      >
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (
    isAuthenticated &&
    !isAdmin &&
    !activeWorkspaceId &&
    !isAllowedWithoutWorkspace(location.pathname)
  ) {
    const next = encodeURIComponent(
      `${location.pathname}${location.search}${location.hash}`
    );
    return <Navigate to={`/onboarding/profile?next=${next}`} replace />;
  }

  return <>{children}</>;
}
