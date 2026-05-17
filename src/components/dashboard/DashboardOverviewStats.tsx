import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileStack,
  Loader2,
  Percent,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatProcessingDisplay } from "@/lib/utils";

export type DashboardOverviewMetrics = {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  inProgress: number;
  avgConfidence: number;
  avgProcessTime: number;
  successRate: number;
  analysesLast7Days: number;
  trend7dPercent: number | null;
};

type StatAccent = "violet" | "emerald" | "sky" | "amber" | "rose" | "cyan" | "slate";

type StatConfig = {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: StatAccent;
  trend?: number | null;
  sparkline?: number[];
};

const ACCENT: Record<
  StatAccent,
  { bar: string; icon: string; glow: string; spark: string }
> = {
  violet: {
    bar: "from-brand to-brand-light",
    icon: "bg-brand/15 text-brand dark:text-brand-light",
    glow: "bg-brand/10",
    spark: "stroke-brand",
  },
  emerald: {
    bar: "from-emerald-500 to-teal-400",
    icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    glow: "bg-emerald-500/10",
    spark: "stroke-emerald-500",
  },
  sky: {
    bar: "from-sky-500 to-cyan-400",
    icon: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    glow: "bg-sky-500/10",
    spark: "stroke-sky-500",
  },
  amber: {
    bar: "from-amber-500 to-orange-400",
    icon: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    glow: "bg-amber-500/10",
    spark: "stroke-amber-500",
  },
  rose: {
    bar: "from-rose-500 to-red-400",
    icon: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    glow: "bg-rose-500/10",
    spark: "stroke-rose-500",
  },
  cyan: {
    bar: "from-cyan-500 to-blue-400",
    icon: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    glow: "bg-cyan-500/10",
    spark: "stroke-cyan-500",
  },
  slate: {
    bar: "from-slate-500 to-slate-400",
    icon: "bg-muted text-muted-foreground",
    glow: "bg-muted/40",
    spark: "stroke-muted-foreground",
  },
};

function MiniSparkline({
  values,
  strokeClass,
}: {
  values: number[];
  strokeClass: string;
}) {
  const path = useMemo(() => {
    if (!values.length) return "";
    const w = 88;
    const h = 28;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const pts = values.map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${pts.join(" L ")}`;
  }, [values]);

  if (!values.length) return null;

  return (
    <svg
      viewBox="0 0 88 28"
      className="h-7 w-full opacity-80"
      aria-hidden
      preserveAspectRatio="none"
    >
      <path
        d={path}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClass}
      />
    </svg>
  );
}

function TrendBadge({ trend }: { trend: number | null | undefined }) {
  if (trend == null || Number.isNaN(trend)) return null;
  const up = trend >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
        up
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {up ? "+" : ""}
      {trend.toFixed(0)}%
    </span>
  );
}

function StatCard({
  stat,
  index,
  isLoading,
}: {
  stat: StatConfig;
  index: number;
  isLoading: boolean;
}) {
  const theme = ACCENT[stat.accent];
  const Icon = stat.icon;

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm backdrop-blur-md">
        <Skeleton className="mb-3 h-1 w-12 rounded-full" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-11 w-11 rounded-xl" />
        </div>
        <Skeleton className="mt-4 h-7 w-full" />
      </div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/85 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-md dark:border-white/10 dark:bg-card/60"
    >
      <motion.div
        className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", theme.bar)}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl",
          theme.glow
        )}
        aria-hidden
      />
      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <TrendBadge trend={stat.trend} />
            </div>
            <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-[1.65rem]">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
          </div>
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/40",
              theme.icon
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        </div>
        {stat.sparkline && stat.sparkline.length > 1 ? (
          <div className="mt-4 border-t border-border/40 pt-3 dark:border-white/10">
            <MiniSparkline values={stat.sparkline} strokeClass={theme.spark} />
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}

export type DashboardOverviewStatsProps = {
  metrics: DashboardOverviewMetrics;
  sparklineSeries?: number[];
  isLoading?: boolean;
  className?: string;
};

export function DashboardOverviewStats({
  metrics,
  sparklineSeries = [],
  isLoading = false,
  className,
}: DashboardOverviewStatsProps) {
  const stats: StatConfig[] = useMemo(
    () => [
      {
        id: "total",
        label: "Total analyses",
        value: metrics.totalUploads.toLocaleString(),
        hint: "All part identification analyses",
        icon: FileStack,
        accent: "violet",
        sparkline: sparklineSeries,
      },
      {
        id: "completed",
        label: "Completed",
        value: metrics.successfulUploads.toLocaleString(),
        hint: "Successfully finished analyses",
        icon: CheckCircle2,
        accent: "emerald",
        sparkline: sparklineSeries,
      },
      {
        id: "success-rate",
        label: "Success rate",
        value: `${metrics.successRate.toFixed(1)}%`,
        hint: "Completed vs total analyses",
        icon: Percent,
        accent: "sky",
      },
      {
        id: "in-progress",
        label: "In progress",
        value: metrics.inProgress.toLocaleString(),
        hint: "Queued or running right now",
        icon: Loader2,
        accent: "amber",
      },
      {
        id: "failed",
        label: "Failed",
        value: metrics.failedUploads.toLocaleString(),
        hint: "Analyses that did not complete",
        icon: AlertCircle,
        accent: "rose",
      },
      {
        id: "confidence",
        label: "Avg confidence",
        value: `${metrics.avgConfidence.toFixed(1)}%`,
        hint: "Model match quality",
        icon: Activity,
        accent: "cyan",
      },
      {
        id: "processing",
        label: "Avg processing",
        value: formatProcessingDisplay(metrics.avgProcessTime),
        hint: "Typical time per completed analysis",
        icon: Clock3,
        accent: "slate",
      },
      {
        id: "last-7",
        label: "Last 7 days",
        value: metrics.analysesLast7Days.toLocaleString(),
        hint: "Analyses started this week",
        icon: TrendingUp,
        accent: "violet",
        trend: metrics.trend7dPercent,
        sparkline: sparklineSeries.slice(-7),
      },
    ],
    [metrics, sparklineSeries]
  );

  return (
    <section className={cn("space-y-3", className)} aria-label="Overview statistics">
      <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Overview
          </h2>
          <p className="text-xs text-muted-foreground">
            Live metrics from your identification workspace
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.id} stat={stat} index={index} isLoading={isLoading} />
        ))}
      </div>
    </section>
  );
}
