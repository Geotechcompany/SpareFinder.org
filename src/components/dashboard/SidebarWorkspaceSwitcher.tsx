import React, { useState } from "react";
import { Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react";
import { api } from "@/lib/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { WorkspaceIcon } from "@/components/dashboard/WorkspaceIcon";
import { ProfileImageUploader } from "@/components/profile/ProfileImageUploader";
import { Skeleton } from "@/components/ui/skeleton";
function formatWorkspaceQuota(quota: {
  workspaceCount: number;
  maxWorkspaces: number;
  planName?: string;
}) {
  if (quota.maxWorkspaces < 0) {
    return `${quota.workspaceCount} workspaces · unlimited on ${quota.planName ?? "your plan"}`;
  }
  return `${quota.workspaceCount} / ${quota.maxWorkspaces} workspaces · ${quota.planName ?? "plan"} limits shared`;
}

export function SidebarWorkspaceSwitcher({
  isCollapsed = false,
}: {
  isCollapsed?: boolean;
}) {
  const { toast } = useToast();
  const {
    workspaces,
    activeWorkspace,
    quota,
    isLoading,
    switchWorkspace,
    createWorkspace,
    refreshWorkspaces,
  } = useWorkspace();

  const canCreate = quota?.canCreateWorkspace ?? true;
  const quotaLabel = quota ? formatWorkspaceQuota(quota) : null;

  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const canManageActiveImage =
    activeWorkspace &&
    (activeWorkspace.role === "owner" || activeWorkspace.role === "admin");

  const displayName = activeWorkspace?.name || "Select workspace";

  const handleSwitch = async (id: string) => {
    if (id === activeWorkspace?.id) {
      setOpen(false);
      return;
    }
    setIsSwitching(id);
    try {
      await switchWorkspace(id);
      setOpen(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Could not switch workspace",
        description: "Please try again.",
      });
    } finally {
      setIsSwitching(null);
    }
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setIsCreating(true);
    try {
      await createWorkspace(trimmed);
      setCreateOpen(false);
      setNewName("");
      setOpen(false);
      toast({ title: "Workspace created", description: trimmed });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Check the name and try again.";
      toast({
        variant: "destructive",
        title: "Could not create workspace",
        description: message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const trigger = isLoading ? (
    <div
      className={cn(
        "relative z-10 flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5",
        isCollapsed && "justify-center px-2"
      )}
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <Skeleton
        variant="shimmer"
        className="h-9 w-9 shrink-0 rounded-lg bg-white/10"
      />
      {!isCollapsed ? (
        <>
          <Skeleton
            variant="shimmer"
            className="h-4 min-w-0 flex-1 rounded-md bg-white/10"
          />
          <Skeleton
            variant="shimmer"
            className="h-4 w-4 shrink-0 rounded bg-white/10"
          />
        </>
      ) : null}
    </div>
  ) : (
    <button
      type="button"
      className={cn(
        "relative z-10 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-left transition-colors hover:border-brand/30 hover:bg-white/[0.07]",
        isCollapsed && "justify-center px-2"
      )}
      aria-label="Switch workspace"
    >
      <WorkspaceIcon
        name={activeWorkspace?.name}
        imageUrl={activeWorkspace?.imageUrl}
        className="h-9 w-9 rounded-lg"
      />
      {!isCollapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
            {displayName}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </>
      ) : null}
    </button>
  );

  const switcher = (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-1"
          side={isCollapsed ? "right" : "bottom"}
        >
          <div className="px-2 py-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Workspaces
            </p>
            {quotaLabel ? (
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                {quotaLabel}
              </p>
            ) : null}
          </div>
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {workspaces.map((ws) => {
              const isActive = ws.id === activeWorkspace?.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  disabled={isSwitching === ws.id}
                  onClick={() => void handleSwitch(ws.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-brand/15 text-foreground"
                      : "hover:bg-muted/80"
                  )}
                >
                  <WorkspaceIcon name={ws.name} imageUrl={ws.imageUrl} />
                  <span className="min-w-0 flex-1 truncate text-left font-medium">
                    {ws.name}
                  </span>
                  {isActive ? (
                    <Check className="h-4 w-4 shrink-0 text-brand" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="my-1 h-px bg-border" />
          {canManageActiveImage ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setManageOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80"
            >
              <Settings2 className="h-4 w-4" />
              Workspace photo
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canCreate}
            onClick={() => {
              if (!canCreate) {
                toast({
                  variant: "destructive",
                  title: "Workspace limit reached",
                  description:
                    quota?.maxWorkspaces != null && quota.maxWorkspaces > 0
                      ? `Your ${quota.planName} plan allows up to ${quota.maxWorkspaces} workspaces. Upgrade for more.`
                      : "Upgrade your plan to create more workspaces.",
                });
                return;
              }
              setOpen(false);
              setCreateOpen(true);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
              canCreate
                ? "sidebar-workspace-active text-brand hover:bg-brand/10 dark:text-brand-light"
                : "cursor-not-allowed text-muted-foreground opacity-60"
            )}
          >
            <Plus className="h-4 w-4" />
            Create workspace
          </button>
        </PopoverContent>
      </Popover>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Workspace photo</DialogTitle>
            <DialogDescription>
              Upload a logo or image for {activeWorkspace?.name ?? "this workspace"}.
            </DialogDescription>
          </DialogHeader>
          {activeWorkspace ? (
            <ProfileImageUploader
              size="lg"
              imageUrl={activeWorkspace.imageUrl}
              fallbackLabel={activeWorkspace.name}
              onUpload={async (file) => {
                const res = await api.workspaces.uploadImage(activeWorkspace.id, file);
                const imageUrl =
                  res.data?.imageUrl ??
                  res.data?.workspace?.imageUrl ??
                  null;
                if (!res.success || !imageUrl) {
                  throw new Error(
                    (res as { message?: string }).message || "Upload failed"
                  );
                }
                await refreshWorkspaces();
                toast({
                  title: "Workspace photo updated",
                  description: activeWorkspace.name,
                });
                return imageUrl;
              }}
            />
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setManageOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>
              Analyses and monthly limits are shared across all workspaces on your plan.
              {quota && quota.maxWorkspaces > 0
                ? ` You can create up to ${quota.maxWorkspaces} workspaces on ${quota.planName}.`
                : quota?.maxWorkspaces === -1
                  ? " Your plan includes unlimited workspaces."
                  : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              placeholder="e.g. Fleet Operations, Plant A"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              autoComplete="organization"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!newName.trim() || isCreating}
            >
              {isCreating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="px-2.5 pb-1">{switcher}</div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-semibold">{displayName}</p>
          <p className="text-muted-foreground">Switch workspace</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <div className="relative z-10 px-3 pb-1.5">{switcher}</div>;
}
