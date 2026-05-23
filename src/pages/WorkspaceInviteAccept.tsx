import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Shield, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { SpinningLogoLoader } from "@/components/brand/spinning-logo-loader";
import { AuthShell } from "@/components/auth/auth-shell";
import { cn } from "@/lib/utils";

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

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  member: "Member",
  owner: "Owner",
};

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
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const inviteReturnPath = useMemo(
    () => `/invite/workspace?token=${encodeURIComponent(token)}`,
    [token]
  );

  useEffect(() => {
    if (tokenFromUrl) {
      storePendingWorkspaceInvite(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  useEffect(() => {
    if (!token) {
      setIsPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setIsPreviewLoading(true);
    setPreviewError(null);

    const loadPreview = async () => {
      try {
        if (isAuthenticated && !authLoading) {
          const res = await api.workspaces.previewInvitation(token);
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
          return;
        }

        const res = await api.workspaces.publicPreviewInvitation(token);
        if (cancelled) return;
        if (!res.success || !res.data) {
          setPreviewError(res.message || "Invitation not found");
          return;
        }
        setPreview({
          workspaceName: res.data.workspace.name,
          role: res.data.invitation.role,
          emailMatches: false,
          inviteEmail: res.data.invitation.email,
        });
      } catch {
        if (!cancelled) {
          setPreviewError("Could not load this invitation.");
        }
      } finally {
        if (!cancelled) setIsPreviewLoading(false);
      }
    };

    void loadPreview();

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

  const authShellProps = {
    backHref: "/" as const,
    backLabel: "Back home",
    logoSrc: "/sparefinderlogo.png",
    badge: (
      <>
        <Users className="mr-1.5 h-3.5 w-3.5 text-primary" />
        Workspace invitation
      </>
    ),
    title: (
      <>
        Join your team on{" "}
        <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-300 bg-clip-text text-transparent">
          SpareFinder
        </span>
      </>
    ),
    description:
      "Accept this invite to collaborate on uploads, history, and AI part identification in a shared workspace.",
    rightImage: {
      src: "/registerphoto.png",
      alt: "SpareFinder workspace collaboration",
    },
    rightContent: (
      <div className="space-y-4">
        <div className="inline-flex items-center rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15 backdrop-blur">
          <Sparkles className="mr-1.5 h-3.5 w-3.5 text-emerald-300" />
          Shared workspace access
        </div>
        <h2 className="max-w-md text-balance text-2xl font-semibold tracking-tight text-slate-50">
          One workspace.{" "}
          <span className="text-emerald-300">Your whole team aligned.</span>
        </h2>
        <p className="max-w-md text-sm text-slate-300">
          Work from the same catalog, upload queue, and analysis history — with roles that keep
          settings secure.
        </p>
      </div>
    ),
  };

  if (!token) {
    return (
      <AuthShell {...authShellProps}>
        <div className="space-y-4 text-center sm:text-left">
          <p className="text-lg font-semibold">Invalid invitation link</p>
          <p className="text-sm text-muted-foreground">
            This link is missing a token. Ask your teammate to send a new invite.
          </p>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (authLoading && isAuthenticated) {
    return <SpinningLogoLoader label="Loading…" />;
  }

  if (accepted) {
    return <SpinningLogoLoader label="Opening your workspace…" />;
  }

  const loginHref = `/login?next=${encodeURIComponent(inviteReturnPath)}&email=${encodeURIComponent(preview?.inviteEmail || "")}`;
  const registerHref = `/register?next=${encodeURIComponent(inviteReturnPath)}&email=${encodeURIComponent(preview?.inviteEmail || "")}`;

  if (!isAuthenticated) {
    return (
      <AuthShell {...authShellProps}>
        <div className="space-y-5">
          {isPreviewLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand/70" />
            </div>
          ) : previewError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {previewError}
            </div>
          ) : preview ? (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-brand/[0.07] via-background to-muted/30 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                You&apos;re invited
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight">{preview.workspaceName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Role:{" "}
                <span className="font-medium capitalize text-foreground">
                  {ROLE_LABELS[preview.role] ?? preview.role}
                </span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Sign in or create an account with{" "}
                <span className="font-medium text-foreground">{preview.inviteEmail}</span> to join.
              </p>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild className="h-11">
              <Link to={loginHref}>Sign in to accept</Link>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <Link to={registerHref}>Create account</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  const userEmail = (user?.email || "").trim().toLowerCase();

  return (
    <AuthShell {...authShellProps}>
      <div className="space-y-5">
        {isPreviewLoading ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand/70" />
          </div>
        ) : previewError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {previewError}
          </div>
        ) : preview ? (
          <>
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-brand/[0.07] via-background to-muted/30 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Workspace invite
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-tight">{preview.workspaceName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Join as{" "}
                    <span className="font-medium capitalize text-foreground">
                      {ROLE_LABELS[preview.role] ?? preview.role}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {!preview.emailMatches ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
                This invite was sent to <strong>{preview.inviteEmail}</strong>. You are signed
                in as <strong>{userEmail || "another account"}</strong>. Sign out and sign in with
                the invited email to accept.
              </div>
            ) : null}

            {acceptError ? (
              <p className="text-sm text-destructive">{acceptError}</p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className={cn("h-11 flex-1")}
                disabled={!preview.emailMatches || isAccepting}
                onClick={() => void handleAccept()}
              >
                {isAccepting ? "Joining workspace…" : "Accept invitation"}
              </Button>
              <Button type="button" variant="outline" asChild className="h-11 flex-1">
                <Link to="/dashboard">Decline</Link>
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </AuthShell>
  );
};

export default WorkspaceInviteAccept;
