import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";

export function useRequireWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { activeWorkspaceId, needsSetup, isLoading } = useWorkspace();

  const hasWorkspace = isAdmin || Boolean(activeWorkspaceId);

  const promptCreateWorkspace = useCallback(() => {
    const next = encodeURIComponent(
      `${location.pathname}${location.search}${location.hash}`
    );
    navigate(`/onboarding/profile?next=${next}`);
  }, [location.hash, location.pathname, location.search, navigate]);

  const requireWorkspace = useCallback((): boolean => {
    if (isLoading || hasWorkspace) return true;
    toast({
      title: "Create a workspace first",
      description:
        "Set up your workspace before running analyses. This only takes a moment.",
    });
    promptCreateWorkspace();
    return false;
  }, [hasWorkspace, isLoading, promptCreateWorkspace, toast]);

  return {
    hasWorkspace,
    needsSetup,
    isLoading,
    requireWorkspace,
    promptCreateWorkspace,
  };
}
