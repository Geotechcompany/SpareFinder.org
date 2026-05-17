import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { cn } from "@/lib/utils";

const CARD_BG_IMAGE = "/welcome_banner.png";

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

type PlanRingProps = {
  size?: number;
  stroke?: number;
  progress: number;
  centerPrimary: string;
  centerSecondary?: string;
  variant: "trial" | "active" | "inactive" | "admin";
  ariaLabel: string;
};

function PlanRing({
  size = 56,
  stroke = 3,
  progress,
  centerPrimary,
  centerSecondary,
  variant,
  ariaLabel,
}: PlanRingProps) {
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, progress));
  const offset = c - (clamped / 100) * c;
  const innerInset = Math.max(6, Math.round(size * 0.11));
  const primaryTextClass =
    size >= 80 ? "text-xl" : size >= 64 ? "text-base" : "text-sm";
  const secondaryTextClass =
    size >= 80 ? "text-[11px]" : size >= 64 ? "text-[10px]" : "text-[9px]";

  const strokeClass =
    variant === "trial"
      ? "text-violet-500"
      : variant === "active"
        ? "text-emerald-500"
        : variant === "admin"
          ? "text-sky-500"
          : "text-muted-foreground/40";

  const trackClass = "text-muted-foreground/15 dark:text-white/10";

  return (
    <motion.div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={trackClass}
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn(strokeClass, "transition-all duration-500")}
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={variant === "inactive" ? c : offset}
        />
      </svg>
      <div
        className={cn(
          "absolute flex flex-col items-center justify-center rounded-full border border-border/50 bg-card/95 text-center shadow-inner backdrop-blur-sm",
          "dark:border-white/10 dark:bg-zinc-900/90"
        )}
        style={{ inset: innerInset }}
      >
        <span
          className={cn(
            "font-bold leading-none tabular-nums text-foreground",
            primaryTextClass
          )}
        >
          {centerPrimary}
        </span>
        {centerSecondary ? (
          <span
            className={cn(
              "mt-0.5 font-semibold uppercase tracking-wide text-muted-foreground",
              secondaryTextClass
            )}
          >
            {centerSecondary}
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}

export type SidebarUserPlanCardProps = {
  isCollapsed?: boolean;
  className?: string;
  onSignOut: () => void;
};

export function SidebarUserPlanCard({
  isCollapsed = false,
  className,
  onSignOut,
}: SidebarUserPlanCardProps) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
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
  const company = (user as { company?: string })?.company?.trim() || "";

  const initials = useMemo(() => {
    const parts = [user?.full_name, user?.email].filter(Boolean)[0]?.split(" ") || [];
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [user?.full_name, user?.email]);

  const ring = useMemo(() => {
    if (subscriptionLoading) {
      return {
        variant: "inactive" as const,
        progress: 0,
        centerPrimary: "…",
        centerSecondary: "plan",
        ariaLabel: "Loading plan",
        planName: "Checking plan…",
        subline: "",
      };
    }
    if (isAdmin) {
      return {
        variant: "admin" as const,
        progress: 100,
        centerPrimary: "∞",
        centerSecondary: "admin",
        ariaLabel: "Admin access",
        planName: "Admin access",
        subline: "Full platform access",
      };
    }
    if (!isPlanActive) {
      return {
        variant: "inactive" as const,
        progress: 0,
        centerPrimary: "—",
        centerSecondary: "plan",
        ariaLabel: "No active plan",
        planName: "No active plan",
        subline: "Choose a plan to unlock features",
      };
    }

    const planName = tierDisplayName(tier, status);
    const end = currentPeriodEnd;
    const start = currentPeriodStart;

    if (isTrialing && end) {
      const now = new Date();
      const daysLeft = daysBetween(now, end);
      const total =
        start && end.getTime() > start.getTime()
          ? Math.max(1, daysBetween(start, end))
          : Math.max(daysLeft, 30);
      const progress = Math.min(100, (daysLeft / total) * 100);
      return {
        variant: "trial" as const,
        progress,
        centerPrimary: String(daysLeft),
        centerSecondary: daysLeft === 1 ? "day" : "days",
        ariaLabel: `${daysLeft} trial days remaining`,
        planName: `${planName} trial`,
        subline: `Ends ${formatRenewalDate(end)}`,
      };
    }

    if (end) {
      const renewDay = end.getDate();
      return {
        variant: "active" as const,
        progress: 100,
        centerPrimary: String(renewDay),
        centerSecondary: end
          .toLocaleDateString(undefined, { month: "short" })
          .toLowerCase(),
        ariaLabel: `Renews on ${formatRenewalDate(end)}`,
        planName,
        subline: `Renews ${formatRenewalDate(end)}`,
      };
    }

    return {
      variant: "active" as const,
      progress: 100,
      centerPrimary: "✓",
      centerSecondary: "active",
      ariaLabel: `${planName} active`,
      planName,
      subline: "Active subscription",
    };
  }, [
    subscriptionLoading,
    isAdmin,
    isPlanActive,
    tier,
    status,
    isTrialing,
    currentPeriodStart,
    currentPeriodEnd,
  ]);

  const planCtaLabel = (() => {
    if (subscriptionLoading) return "Checking plan…";
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

  const ringSize = isCollapsed ? 64 : 84;
  const ringStroke = isCollapsed ? 3.5 : 4;

  const card = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 shadow-lg shadow-black/10",
        isCollapsed ? "p-2" : "p-4"
      )}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <img
          src={CARD_BG_IMAGE}
          alt=""
          className="h-full w-full scale-110 object-cover object-[center_40%]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/82 to-violet-950/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-500/20 blur-2xl" />
      </div>
      <motion.div
        className={cn(
          "relative z-10",
          isCollapsed
            ? "flex flex-col items-center gap-2"
            : "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4"
        )}
      >
        <div className="flex shrink-0 items-center justify-center self-center">
          <PlanRing
            size={ringSize}
            stroke={ringStroke}
            progress={ring.progress}
            centerPrimary={ring.centerPrimary}
            centerSecondary={ring.centerSecondary}
            variant={ring.variant}
            ariaLabel={ring.ariaLabel}
          />
        </div>
        {!isCollapsed ? (
          <div className="min-w-0">
            <motion.div className="flex items-start gap-2">
              <Avatar className="h-9 w-9 shrink-0 border border-white/20 ring-2 ring-white/10">
                <AvatarImage src={user?.avatar_url} alt={displayName} />
                <AvatarFallback className="bg-white/15 text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {displayName}
                </p>
                {company ? (
                  <p className="truncate text-[11px] font-medium uppercase tracking-wide text-white/60">
                    {company}
                  </p>
                ) : null}
              </div>
            </motion.div>
            <div className="mt-2 space-y-1">
              <motion.div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    ring.variant === "trial" &&
                      "border border-violet-400/30 bg-violet-500/25 text-violet-100",
                    ring.variant === "active" &&
                      "border border-emerald-400/30 bg-emerald-500/25 text-emerald-100",
                    ring.variant === "admin" &&
                      "border border-sky-400/30 bg-sky-500/25 text-sky-100",
                    ring.variant === "inactive" &&
                      "border border-white/15 bg-white/10 text-white/80"
                  )}
                >
                  {isAdmin ? (
                    <Shield className="mr-1 h-3 w-3 shrink-0" aria-hidden />
                  ) : null}
                  {ring.planName}
                </span>
                {!subscriptionLoading && !isPlanActive && !isAdmin ? (
                  <span className="inline-flex items-center rounded-full border border-amber-400/35 bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-100">
                    Locked
                  </span>
                ) : null}
              </motion.div>
              {ring.subline ? (
                <p className="text-[11px] text-white/65">{ring.subline}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );

  if (isCollapsed) {
    return (
      <div className={cn("space-y-2", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="w-full text-left">
              {card}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[220px] text-xs">
            <p className="font-semibold">{displayName}</p>
            <p>{ring.planName}</p>
            {ring.subline ? <p className="text-muted-foreground">{ring.subline}</p> : null}
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
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
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
        className="h-10 w-full justify-start rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-400"
        onClick={onSignOut}
      >
        <LogOut className="mr-2 h-4 w-4 shrink-0" />
        Sign out
      </Button>
    </div>
  );
}
