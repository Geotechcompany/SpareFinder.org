import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { SpinningLogoLoader } from "@/components/brand/spinning-logo-loader";

const PENDING_WORKSPACE_INVITE_KEY = "sparefinder_pending_workspace_invite";

export function storePendingWorkspaceInvite(token: string) {
  if (token.trim()) {
    sessionStorage.setItem(PENDING_WORKSPACE_INVITE_KEY, token.trim());
  }
}

export function consumePendingWorkspaceInvite(): string | null {
  const token = sessionStorage.getItem(PENDING_WORKSPACE_INVITE_KEY);
  if (token) sessionStorage.removeItem(PENDING_WORKSPACE_INVITE_KEY);
  return token;
}

const WorkspaceInviteAccept = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();
  const { refreshWorkspaces } = useWorkspace();

  const tokenFromUrl = searchParams.get("token")?.trim() || "";
  const [token] = useState(() => tokenFromUrl || consumePendingWorkspaceInvite() || "");

  const [preview, setPreview] = useState<{
    workspaceName: string;
    role: string;
    emailMatches: boolean;
    inviteEmail: string;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      storePendingWorkspaceInvite(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  useEffect(() => {
    if (!token || authLoading || !isAuthenticated) return;

    let cancelled = false;
    setIsPreviewLoading(true);
    setPreviewError(null);

    void api.workspaces
      .previewInvitation(token)
      .then((res) => {
        if (cancelled) return;
        if (!res.success || !res.data) {
          setPreviewError(res.message || "Invitation not found");
          return;
        }
        setPreview({
          workspaceName: res.data.workspace.name,
          role: res.data.invitation.role,
          emailMatches: res.data.emailMatches,
          inviteEmail: res.data.invitation.email,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewError("Could not load this invitation.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    setAcceptError(null);
    try {
      const res = await api.workspaces.acceptInvitation(token);
      if (!res.success) {
        throw new Error(res.message || "Could not accept invitation");
      }
      sessionStorage.removeItem(PENDING_WORKSPACE_INVITE_KEY);
      await refreshWorkspaces();
      setAccepted(true);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setAcceptError(
        err instanceof Error ? err.message : "Could not accept invitation"
      );
    } finally {
      setIsAccepting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold">Invalid invitation link</p>
        <p className="max-w-md text-sm text-muted-foreground">
          This link is missing a token. Ask your teammate to send a new invite.
        </p>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    );
  }

  if (authLoading) {
    return <SpinningLogoLoader label="Loading…" />;
  }

  if (!isAuthenticated) {
    storePendingWorkspaceInvite(token);
    const next = encodeURIComponent(`/invite/workspace?token=${encodeURIComponent(token)}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (accepted) {
    return <SpinningLogoLoader label="Opening your workspace…" />;
  }

  const userEmail = (user?.email || "").trim().toLowerCase();

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] px-4 py-10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Users className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Workspace invitation</h1>

        {isPreviewLoading ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : previewError ? (
          <p className="mt-4 text-sm text-destructive">{previewError}</p>
        ) : preview ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              You have been invited to join{" "}
              <strong className="text-foreground">{preview.workspaceName}</strong> as{" "}
              <strong className="text-foreground capitalize">{preview.role}</strong>.
            </p>
            {!preview.emailMatches ? (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                This invite was sent to <strong>{preview.inviteEmail}</strong>. You are
                signed in as <strong>{userEmail || "another account"}</strong>. Sign in
                with the invited email to accept.
              </p>
            ) : null}
            {acceptError ? (
              <p className="mt-3 text-sm text-destructive">{acceptError}</p>
            ) : null}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="flex-1"
                disabled={!preview.emailMatches || isAccepting}
                onClick={() => void handleAccept()}
              >
                {isAccepting ? "Joining…" : "Accept invitation"}
              </Button>
              <Button type="button" variant="outline" asChild className="flex-1">
                <Link to="/dashboard">Decline</Link>
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default WorkspaceInviteAccept;
