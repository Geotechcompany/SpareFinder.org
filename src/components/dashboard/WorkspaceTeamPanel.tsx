import React, { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Mail, Shield, Trash2, UserMinus, Users } from "lucide-react";
import {
  api,
  type WorkspaceInvitationRecord,
  type WorkspaceInviteRole,
  type WorkspaceMemberRecord,
  type WorkspaceMemberRole,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const ROLE_DESCRIPTIONS: Record<WorkspaceInviteRole, string> = {
  admin: "Manage settings, invite teammates, and use all workspace data.",
  member: "View and use workspace data (uploads, history, reports).",
};

function roleBadgeClass(role: string) {
  if (role === "owner") {
    return "border-brand/30 bg-brand/10 text-brand";
  }
  if (role === "admin") {
    return "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-200";
  }
  return "border-border/80 bg-muted/50 text-muted-foreground";
}

type WorkspaceTeamPanelProps = {
  workspaceId: string;
  workspaceName: string;
  currentUserRole: WorkspaceMemberRole | string;
  canManage: boolean;
};

export function WorkspaceTeamPanel({
  workspaceId,
  workspaceName,
  currentUserRole,
  canManage,
}: WorkspaceTeamPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [members, setMembers] = useState<WorkspaceMemberRecord[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceInviteRole>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);

  const isOwner = currentUserRole === "owner";

  const loadTeam = useCallback(async () => {
    setIsLoading(true);
    try {
      const membersRes = await api.workspaces.listMembers(workspaceId);
      if (membersRes.success && membersRes.data) {
        setMembers(membersRes.data.members);
      }

      if (canManage) {
        const invitesRes = await api.workspaces.listInvitations(workspaceId);
        if (invitesRes.success && invitesRes.data) {
          setInvitations(invitesRes.data.invitations);
        }
      } else {
        setInvitations([]);
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Could not load team",
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [canManage, toast, workspaceId]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setIsInviting(true);
    setLastInviteUrl(null);
    try {
      const res = await api.workspaces.inviteMember(workspaceId, {
        email,
        role: inviteRole,
      });
      if (!res.success) {
        throw new Error(res.message || "Invite failed");
      }
      setInviteEmail("");
      setLastInviteUrl(res.data?.inviteUrl ?? null);
      await loadTeam();
      toast({
        title: res.data?.emailSent ? "Invitation sent" : "Invitation created",
        description: res.data?.emailSent
          ? `We emailed ${email} an invite to ${workspaceName}.`
          : "Email could not be sent — copy the invite link below.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not send invitation",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInviteLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Invite link copied" });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not copy link",
      });
    }
  };

  const handleRevoke = async (invitationId: string) => {
    setBusyInvitationId(invitationId);
    try {
      const res = await api.workspaces.revokeInvitation(workspaceId, invitationId);
      if (!res.success) throw new Error(res.message || "Revoke failed");
      await loadTeam();
      toast({ title: "Invitation revoked" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not revoke invitation",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyInvitationId(null);
    }
  };

  const handleRoleChange = async (
    memberUserId: string,
    role: WorkspaceInviteRole
  ) => {
    setBusyMemberId(memberUserId);
    try {
      const res = await api.workspaces.updateMemberRole(
        workspaceId,
        memberUserId,
        role
      );
      if (!res.success) throw new Error(res.message || "Update failed");
      await loadTeam();
      toast({ title: "Role updated" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not update role",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRemove = async (member: WorkspaceMemberRecord) => {
    setBusyMemberId(member.userId);
    try {
      const res = await api.workspaces.removeMember(workspaceId, member.userId);
      if (!res.success) throw new Error(res.message || "Remove failed");
      await loadTeam();
      toast({
        title: "Member removed",
        description: member.fullName || member.email,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not remove member",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyMemberId(null);
    }
  };

  const canChangeRole = (member: WorkspaceMemberRecord) => {
    if (!canManage || member.role === "owner") return false;
    if (member.userId === user?.id) return false;
    if (currentUserRole === "admin" && member.role === "admin") return false;
    return isOwner || member.role === "member";
  };

  const canRemoveMember = (member: WorkspaceMemberRecord) => {
    if (!canManage || member.userId === user?.id) return false;
    if (member.role === "owner") return false;
    if (member.role === "admin" && !isOwner) return false;
    return true;
  };

  if (isLoading) {
    return (
      <div
        className="flex min-h-[180px] items-center justify-center"
        aria-busy="true"
      >
        <Loader2 className="h-7 w-7 animate-spin text-brand/70" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-1">
      {canManage ? (
        <section className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-brand/[0.06] via-background to-muted/30 p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">Invite teammate</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Send a secure link to join {workspaceName}.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="team-invite-email"
                className="text-xs uppercase tracking-wide text-muted-foreground"
              >
                Email address
              </Label>
              <Input
                id="team-invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleInvite();
                }}
                autoComplete="email"
                className="h-11 bg-background/80"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Role
              </Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as WorkspaceInviteRole)}
              >
                <SelectTrigger className="h-11 w-full bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[250]">
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {ROLE_DESCRIPTIONS[inviteRole]}
              </p>
            </div>

            <Button
              type="button"
              className="h-11 w-full"
              disabled={!inviteEmail.trim() || isInviting}
              onClick={() => void handleInvite()}
            >
              {isInviting ? "Sending invitation…" : "Send invitation"}
            </Button>
          </div>

          {lastInviteUrl ? (
            <div className="mt-4 space-y-2 rounded-xl border border-dashed border-brand/25 bg-background/70 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Invite link
              </p>
              <p className="break-all text-xs leading-relaxed text-foreground/80">
                {lastInviteUrl}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => void handleCopyInviteLink(lastInviteUrl)}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy link
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center gap-2 px-0.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold tracking-tight">Team members</p>
          <Badge variant="outline" className="ml-auto rounded-full px-2.5">
            {members.length}
          </Badge>
        </div>

        <ul className="space-y-2">
          {members.map((member) => {
            const displayName = member.fullName || member.email || "User";
            const initials = displayName
              .split(/\s+/)
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <li
                key={member.userId}
                className="rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/10 text-xs font-semibold text-brand ring-2 ring-background">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>

                  {canRemoveMember(member) ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={busyMemberId === member.userId}
                      onClick={() => void handleRemove(member)}
                      aria-label={`Remove ${displayName}`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                  {canChangeRole(member) ? (
                    <Select
                      value={
                        member.role === "admin" || member.role === "member"
                          ? member.role
                          : "member"
                      }
                      onValueChange={(v) =>
                        void handleRoleChange(member.userId, v as WorkspaceInviteRole)
                      }
                      disabled={busyMemberId === member.userId}
                    >
                      <SelectTrigger className="h-9 w-full min-w-[120px] max-w-[160px] sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[250]">
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                        roleBadgeClass(member.role)
                      )}
                    >
                      {member.role === "owner" ? (
                        <Shield className="h-3 w-3" />
                      ) : null}
                      {ROLE_LABELS[member.role] ?? member.role}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {canManage && invitations.length > 0 ? (
        <section className="space-y-3">
          <p className="px-0.5 text-sm font-semibold tracking-tight">
            Pending invitations
          </p>
          <ul className="space-y-2">
            {invitations.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[invite.role] ?? invite.role} · expires{" "}
                    {invite.expiresAt
                      ? new Date(invite.expiresAt).toLocaleDateString()
                      : "soon"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-stretch sm:self-auto">
                  <Badge variant="outline" className="rounded-full">
                    Pending
                  </Badge>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    disabled={busyInvitationId === invite.id}
                    onClick={() => void handleRevoke(invite.id)}
                    aria-label={`Revoke invite for ${invite.email}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
