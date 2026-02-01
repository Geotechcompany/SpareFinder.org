import React, { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence, motion } from "framer-motion";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import ChartSkeleton from "@/components/skeletons/ChartSkeleton";
import { cn } from "@/lib/utils";
import { Activity, Sparkles, TrendingUp } from "lucide-react";

type Point = {
  date: string; // YYYY-MM-DD
  analyzedParts: number;
  completedAnalyses: number;
  completionRate: number; // 0..100
  avgConfidence: number; // 0..100
  avgProcessingSeconds: number;
};

const formatShortDate = (isoDate: string) => {
  // isoDate is YYYY-MM-DD; render as "Dec 13"
  const [y, m, d] = isoDate.split("-").map((v) => Number(v));
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatDuration = (seconds: number) => {
  const sec = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  if (sec < 60) return `${Math.round(sec)}s`;
  const minutes = sec / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  return `${Math.round(hours)}h`;
};

export const PerformanceOverviewChart: React.FC<{
  series: Point[];
  isLoading?: boolean;
  className?: string;
}> = ({ series, isLoading = false, className }) => {
  const [tab, setTab] = useState<"throughput" | "quality">("throughput");

  const data = useMemo(() => {
    // Ensure stable ordering
    return [...(series || [])].sort((a, b) => a.date.localeCompare(b.date));
  }, [series]);

  const isEmpty = !data.length || data.every((d) => (d.analyzedParts || 0) === 0);

  const summary = useMemo(() => {
    const safe = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);
    const totalAnalyzed = data.reduce((acc, d) => acc + safe(d.analyzedParts), 0);
    const totalCompleted = data.reduce((acc, d) => acc + safe(d.completedAnalyses), 0);

    const confidenceVals = data.map((d) => safe(d.avgConfidence)).filter((v) => v > 0);
    const avgConfidence =
      confidenceVals.length ? confidenceVals.reduce((a, b) => a + b, 0) / confidenceVals.length : 0;

    const completionVals = data.map((d) => safe(d.completionRate)).filter((v) => v > 0);
    const avgCompletion =
      completionVals.length ? completionVals.reduce((a, b) => a + b, 0) / completionVals.length : 0;

    const procVals = data.map((d) => safe(d.avgProcessingSeconds)).filter((v) => v > 0);
    const avgProcessing =
      procVals.length ? procVals.reduce((a, b) => a + b, 0) / procVals.length : 0;

    return {
      totalAnalyzed,
      totalCompleted,
      avgConfidence,
      avgCompletion,
      avgProcessing,
    };
  }, [data]);

  const throughputConfig = useMemo(
    () => ({
      analyzedParts: { label: "Analyzed", color: "hsl(var(--primary))" },
      completedAnalyses: { label: "Completed", color: "hsl(142.1 76.2% 36.3%)" },
      avgProcessingSeconds: { label: "Avg processing", color: "hsl(38 92% 50%)" },
    }),
    []
  );

  const qualityConfig = useMemo(
    () => ({
      avgConfidence: { label: "Avg confidence", color: "hsl(217.2 91.2% 59.8%)" },
      completionRate: { label: "Completion rate", color: "hsl(271.5 81.3% 55.9%)" },
    }),
    []
  );

  const ChartShell: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    if (isLoading) {
      return (
        <div className="h-[260px] rounded-2xl border border-border bg-background/60 p-3 sm:p-4 backdrop-blur">
          <ChartSkeleton
            variant="area"
            showHeader={false}
            showLegend={false}
            className="border-0 bg-transparent shadow-none"
          />
        </div>
      );
    }

    if (isEmpty) {
      return (
        <div className="relative h-[260px] overflow-hidden rounded-2xl border border-border bg-background/60 p-4 backdrop-blur">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative flex h-full flex-col items-center justify-center text-center"
          >
            <div className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>No activity in the selected window</span>
            </div>
            <div className="mt-3 max-w-sm text-sm text-muted-foreground">
              Upload and analyze a part to start seeing daily activity and quality trends here.
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="h-[260px] rounded-2xl border border-border bg-background/60 p-3 sm:p-4 backdrop-blur">
        {children}
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="throughput" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="quality" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Quality
            </TabsTrigger>
          </TabsList>
          <div className="text-xs text-muted-foreground">
            {isLoading ? "Updating…" : isEmpty ? "No activity in the selected window." : "Daily trend"}
          </div>
        </div>

        {/* Lightweight summary strip (no extra API calls) */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            {
              label: "30d Analyzed",
              value: summary.totalAnalyzed.toLocaleString(),
            },
            {
              label: "30d Completed",
              value: summary.totalCompleted.toLocaleString(),
            },
            {
              label: "Avg Confidence",
              value: `${summary.avgConfidence.toFixed(1)}%`,
            },
            {
              label: "Avg Processing",
              value: formatDuration(summary.avgProcessing),
            },
          ].map((item) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-xl border border-border bg-card/60 px-3 py-2 backdrop-blur"
            >
              <div className="text-[11px] text-muted-foreground">{item.label}</div>
              <div className="mt-0.5 text-sm font-semibold text-foreground">{item.value}</div>
            </motion.div>
          ))}
        </div>

        <TabsContent value="throughput" className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="throughput"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <ChartShell>
                <ChartContainer
                  className="h-[228px] w-full !aspect-auto"
                  config={throughputConfig}
                >
                  <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="fill-analyzedParts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-analyzedParts)" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="var(--color-analyzedParts)" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="4 4" opacity={0.35} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={10}
                      minTickGap={18}
                    />
                    <YAxis
                      yAxisId="count"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={32}
                    />
                    <YAxis
                      yAxisId="time"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}s`}
                      width={44}
                    />

                    <ChartTooltip
                      cursor={{ opacity: 0.15 }}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => formatShortDate(String(label))}
                          formatter={(value: any, name: any) => {
                            if (name === "Avg processing") return [formatDuration(Number(value)), name];
                            if (name === "Avg processing" || name === "Avg processingSeconds")
                              return [formatDuration(Number(value)), "Avg processing"];
                            return [value, name];
                          }}
                        />
                      }
                    />

                    <Area
                      yAxisId="count"
                      type="monotone"
                      dataKey="analyzedParts"
                      name="Analyzed"
                      stroke="var(--color-analyzedParts)"
                      fill="url(#fill-analyzedParts)"
                      strokeWidth={2.2}
                      isAnimationActive
                      animationDuration={650}
                    />
                    <Line
                      yAxisId="count"
                      type="monotone"
                      dataKey="completedAnalyses"
                      name="Completed"
                      stroke="var(--color-completedAnalyses)"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive
                      animationDuration={650}
                    />
                    <Line
                      yAxisId="time"
                      type="monotone"
                      dataKey="avgProcessingSeconds"
                      name="Avg processing"
                      stroke="var(--color-avgProcessingSeconds)"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive
                      animationDuration={650}
                    />
                  </ComposedChart>
                </ChartContainer>
              </ChartShell>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="quality"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <ChartShell>
                <ChartContainer className="h-[228px] w-full !aspect-auto" config={qualityConfig}>
                  <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="fill-avgConfidence" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-avgConfidence)" stopOpacity={0.26} />
                        <stop offset="95%" stopColor="var(--color-avgConfidence)" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="4 4" opacity={0.35} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={10}
                      minTickGap={18}
                    />
                    <YAxis
                      yAxisId="pct"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                      width={32}
                    />

                    <ChartTooltip
                      cursor={{ opacity: 0.15 }}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => formatShortDate(String(label))}
                          formatter={(value: any, name: any) => [`${Number(value).toFixed(1)}%`, name]}
                        />
                      }
                    />

                    <Area
                      yAxisId="pct"
                      type="monotone"
                      dataKey="avgConfidence"
                      name="Avg confidence"
                      stroke="var(--color-avgConfidence)"
                      fill="url(#fill-avgConfidence)"
                      strokeWidth={2.2}
                      isAnimationActive
                      animationDuration={650}
                    />
                    <Line
                      yAxisId="pct"
                      type="monotone"
                      dataKey="completionRate"
                      name="Completion rate"
                      stroke="var(--color-completionRate)"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive
                      animationDuration={650}
                    />
                  </ComposedChart>
                </ChartContainer>
              </ChartShell>
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
};


