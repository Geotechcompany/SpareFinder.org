import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Loader2, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton, SkeletonAvatar } from "@/components/ui/skeleton";

const CARD_BG_IMAGE = "/welcome_banner.png";

/** Profile avatar in sidebar footer — half inside card, half above (50/50 on top edge). */
const PROFILE_AVATAR_SIZE = "h-16 w-16 min-h-16 min-w-16";

const MS_PER_DAY = 86_400_000;

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY));
}

function formatRenewalDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function tierDisplayName(tier: string, status: string | null): string {
  if (tier === "free") return "Starter";
  if (tier === "pro") return "Professional";
  if (tier === "enterprise") return "Enterprise";
  if (status === "trialing") return "Trial";
  return "Plan";
}

type PlanStatusVariant = "trial" | "active" | "inactive" | "admin";

type PlanStatus = {
  variant: PlanStatusVariant;
  progress: number;
  planName: string;
  countdownLabel: string;
  subline?: string;
  ariaLabel: string;
};

function usePlanStatus({
  isAdmin,
  isPlanActive,
  tier,
  status,
  isTrialing,
  currentPeriodStart,
  currentPeriodEnd,
}: {
  isAdmin: boolean;
  isPlanActive: boolean;
  tier: string;
  status: string | null;
  isTrialing: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}): PlanStatus {
  return useMemo(() => {
    if (isAdmin) {
      return {
        variant: "admin",
        progress: 100,
        planName: "Admin access",
        countdownLabel: "Full platform access",
        ariaLabel: "Admin access — full platform access",
      };
    }

    if (!isPlanActive) {
      return {
        variant: "inactive",
        progress: 0,
        planName: "No active plan",
        countdownLabel: "Choose a plan to unlock",
        subline: "Billing required",
        ariaLabel: "No active plan",
      };
    }

    const planName = tierDisplayName(tier, status);
    const end = currentPeriodEnd;
    const start = currentPeriodStart;

    const buildCountdown = (daysLeft: number, endDate: Date) => {
      const total =
        start && endDate.getTime() > start.getTime()
          ? Math.max(1, daysBetween(start, endDate))
          : Math.max(daysLeft, 30);
      const progress = Math.min(100, Math.max(0, (daysLeft / total) * 100));
      const countdownLabel =
        daysLeft === 0
          ? "Renews today"
          : daysLeft === 1
            ? "1 day left"
            : `${daysLeft} days left`;

      return { progress, countdownLabel, total };
    };

    if (isTrialing && end) {
      const daysLeft = daysBetween(new Date(), end);
      const { progress, countdownLabel } = buildCountdown(daysLeft, end);
      return {
        variant: "trial",
        progress,
        planName: `${planName} trial`,
        countdownLabel,
        subline: `Ends ${formatRenewalDate(end)}`,
        ariaLabel: `${daysLeft} trial days remaining`,
      };
    }

    if (end) {
      const daysLeft = daysBetween(new Date(), end);
      const { progress, countdownLabel } = buildCountdown(daysLeft, end);
      return {
        variant: "active",
        progress,
        planName,
        countdownLabel,
        subline: `Renews ${formatRenewalDate(end)}`,
        ariaLabel: `Renews on ${formatRenewalDate(end)}`,
      };
    }

    return {
      variant: "active",
      progress: 100,
      planName,
      countdownLabel: "Active subscription",
      ariaLabel: `${planName} active`,
    };
  }, [
    isAdmin,
    isPlanActive,
    tier,
    status,
    isTrialing,
    currentPeriodStart,
    currentPeriodEnd,
  ]);
}

const BAR_FILL: Record<PlanStatusVariant, string> = {
  trial: "bg-brand",
  active: "bg-emerald-500",
  admin: "bg-sky-400",
  inactive: "bg-white/25",
};

function PlanRenewalBar({
  plan,
  isAdmin,
  showLocked,
  compact = false,
}: {
  plan: PlanStatus;
  isAdmin: boolean;
  showLocked: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn("w-full min-w-0", compact ? "space-y-1.5" : "space-y-2")}
      role="group"
      aria-label={plan.ariaLabel}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex min-w-0 items-center gap-1 font-semibold text-white",
            compact ? "text-[10px]" : "text-xs"
          )}
        >
          {isAdmin ? (
            <Shield className="h-3 w-3 shrink-0 text-sky-300" aria-hidden />
          ) : null}
          <span className="truncate">{plan.planName}</span>
        </span>
        {showLocked ? (
          <span className="shrink-0 rounded-full border border-amber-400/35 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-100">
            Locked
          </span>
        ) : null}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 text-[10px] leading-none text-white/65">
          <span className="font-medium tabular-nums text-white/80">
            {plan.countdownLabel}
          </span>
          {plan.subline ? (
            <span className="truncate text-right text-white/50">{plan.subline}</span>
          ) : null}
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={plan.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={plan.countdownLabel}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${plan.progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full transition-colors",
              BAR_FILL[plan.variant]
            )}
          />
        </div>
      </div>
    </div>
  );
}

export type SidebarUserPlanCardProps = {
  isCollapsed?: boolean;
  className?: string;
  onSignOut: () => void;
};

function SidebarPlanCardSkeleton({
  isCollapsed,
}: {
  isCollapsed: boolean;
}) {
  return (
    <div className="relative">
      <div
        className={cn(
          "relative overflow-visible rounded-2xl border border-white/10 shadow-lg shadow-black/10",
          isCollapsed ? "p-2" : "px-4 pb-4 pt-10"
        )}
        aria-busy="true"
        aria-label="Loading plan details"
      >
        {!isCollapsed ? (
          <SkeletonAvatar
            size="sm"
            className={cn(
              "absolute left-1/2 top-0 z-40 -translate-x-1/2 -translate-y-1/2 bg-white/10",
              PROFILE_AVATAR_SIZE
            )}
          />
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          aria-hidden
        >
          <img
            src={CARD_BG_IMAGE}
            alt=""
            className="h-full w-full scale-110 object-cover object-[center_40%] opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/82 to-brand-dark/75" />
        </div>
        <div
          className={cn(
            "relative z-10",
            isCollapsed
              ? "flex flex-col items-center gap-2"
              : "flex flex-col gap-3"
          )}
        >
          {!isCollapsed ? (
            <>
              <div className="min-w-0 space-y-2 text-center">
                <Skeleton
                  variant="shimmer"
                  className="mx-auto h-4 w-full max-w-[10rem] rounded-md bg-white/10"
                />
                <Skeleton
                  variant="shimmer"
                  className="mx-auto h-3 w-20 rounded-md bg-white/10"
                />
              </div>
              <div className="space-y-2">
                <Skeleton
                  variant="shimmer"
                  className="h-3 w-24 rounded-md bg-white/10"
                />
                <Skeleton
                  variant="shimmer"
                  className="h-1.5 w-full rounded-full bg-white/10"
                />
              </div>
            </>
          ) : (
            <Skeleton
              variant="shimmer"
              className="h-1.5 w-full rounded-full bg-white/10"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function SidebarUserPlanCard({
  isCollapsed = false,
  className,
  onSignOut,
}: SidebarUserPlanCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, checkAuth } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const {
    tier,
    status,
    isPlanActive,
    isLoading: subscriptionLoading,
    isTrialing,
    currentPeriodStart,
    currentPeriodEnd,
  } = useSubscription();

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";
  const workspaceName = activeWorkspace?.name?.trim() || "";

  const initials = useMemo(() => {
    const parts = [user?.full_name, user?.email].filter(Boolean)[0]?.split(" ") || [];
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [user?.full_name, user?.email]);

  const plan = usePlanStatus({
    isAdmin,
    isPlanActive,
    tier,
    status,
    isTrialing,
    currentPeriodStart,
    currentPeriodEnd,
  });

  const planCtaLabel = (() => {
    if (isAdmin) return null;
    if (!isPlanActive) return "Choose plan";
    if (tier === "enterprise") return "Manage plan";
    return "Upgrade plan";
  })();

  const handlePlanCta = () => {
    navigate(
      !subscriptionLoading && !isPlanActive ? "/onboarding/trial" : "/dashboard/billing"
    );
  };

  const handleAvatarFile = async (file: File | null) => {
    if (!file || isUploadingAvatar) return;
    setIsUploadingAvatar(true);
    try {
      const res = await api.user.uploadAvatar(file);
      const avatarUrl =
        (res as { data?: { avatar_url?: string } })?.data?.avatar_url ??
        (res as { avatar_url?: string })?.avatar_url ??
        null;
      if (!res.success || !avatarUrl) {
        throw new Error(
          (res as { message?: string }).message || "Upload failed"
        );
      }
      await checkAuth();
      toast({
        title: "Photo updated",
        description: "Your profile picture has been saved.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description:
          err instanceof Error ? err.message : "Could not upload photo.",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const showLocked = !subscriptionLoading && !isPlanActive && !isAdmin;

  if (subscriptionLoading) {
    const signOutButton = (
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "h-10 w-full justify-center rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-400",
          isCollapsed && "px-0"
        )}
        onClick={onSignOut}
      >
        <LogOut className="mr-2 h-4 w-4 shrink-0" />
        {!isCollapsed ? "Sign out" : <span className="sr-only">Sign out</span>}
      </Button>
    );

    if (isCollapsed) {
      return (
        <div className={cn("space-y-2", className)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <SidebarPlanCardSkeleton isCollapsed />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Loading account…</TooltipContent>
          </Tooltip>
          {signOutButton}
        </div>
      );
    }

    return (
      <div className={cn("space-y-2", className)}>
        <SidebarPlanCardSkeleton isCollapsed={isCollapsed} />
        {!isCollapsed ? (
          <Skeleton
            variant="shimmer"
            className="h-10 w-full rounded-xl bg-white/10"
            aria-hidden
          />
        ) : null}
        {signOutButton}
      </div>
    );
  }

  const card = (
    <div className="relative">
      <div
        className={cn(
          "relative overflow-visible rounded-2xl border border-white/10 shadow-lg shadow-black/10",
          isCollapsed ? "p-2" : "px-4 pb-4 pt-10"
        )}
      >
        {!isCollapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className={cn(
                    "group absolute left-1/2 top-0 z-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/90 bg-zinc-900 shadow-[0_10px_28px_rgba(0,0,0,0.5)] ring-4 ring-brand/30 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/50 disabled:pointer-events-none",
                    PROFILE_AVATAR_SIZE
                  )}
                  aria-label="Change profile photo"
                >
                  <Avatar className="h-full w-full">
                    <AvatarImage
                      src={user?.avatar_url}
                      alt={displayName}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-brand/80 to-brand-dark text-base font-semibold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    {isUploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Change profile photo</TooltipContent>
            </Tooltip>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handleAvatarFile(e.target.files?.[0] ?? null)}
            />
          </>
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          aria-hidden
        >
          <img
            src={CARD_BG_IMAGE}
            alt=""
            className="h-full w-full scale-110 object-cover object-[center_40%]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/82 to-brand-dark/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand/20 blur-2xl" />
        </div>
        <div
          className={cn(
            "relative z-10",
            isCollapsed
              ? "flex flex-col items-center gap-2 px-1 py-1"
              : "flex flex-col gap-3"
          )}
        >
          {isCollapsed ? (
            <PlanRenewalBar
              plan={plan}
              isAdmin={isAdmin}
              showLocked={showLocked}
              compact
            />
          ) : (
            <>
              <div className="min-w-0 text-center">
                <p
                  className="text-sm font-semibold leading-snug text-white [overflow-wrap:anywhere]"
                  title={displayName}
                >
                  {displayName}
                </p>
                {workspaceName ? (
                  <p
                    className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-white/60 [overflow-wrap:anywhere]"
                    title={workspaceName}
                  >
                    {workspaceName}
                  </p>
                ) : null}
              </div>
              <PlanRenewalBar
                plan={plan}
                isAdmin={isAdmin}
                showLocked={showLocked}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (isCollapsed) {
    return (
      <motion.div className={cn("space-y-2", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="w-full text-left">
              {card}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[220px] text-xs">
            <p className="font-semibold">{displayName}</p>
            {workspaceName ? (
              <p className="text-muted-foreground">{workspaceName}</p>
            ) : null}
            <p>{plan.planName}</p>
            <p className="text-muted-foreground">{plan.countdownLabel}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={onSignOut}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Sign out</TooltipContent>
        </Tooltip>
      </motion.div>
    );
  }

  return (
    <div className={cn("space-y-2", !isCollapsed && "pt-8", className)}>
      {card}
      {planCtaLabel ? (
        <Button
          type="button"
          onClick={handlePlanCta}
          disabled={subscriptionLoading}
          className="h-10 w-full rounded-xl bg-primary text-sm font-medium hover:bg-primary/90"
        >
          {planCtaLabel}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-full justify-center rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-400"
        onClick={onSignOut}
      >
        <LogOut className="mr-2 h-4 w-4 shrink-0" />
        Sign out
      </Button>
    </div>
  );
}
