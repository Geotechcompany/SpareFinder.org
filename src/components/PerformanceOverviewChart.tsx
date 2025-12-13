import React, { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="throughput">Throughput</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
          </TabsList>
          <div className="text-xs text-muted-foreground">
            {isLoading ? "Updating…" : isEmpty ? "No activity in the selected window." : "Daily trend"}
          </div>
        </div>

        <TabsContent value="throughput" className="mt-4">
          <div className="h-[260px] rounded-2xl border border-border bg-background/60 p-3 sm:p-4 backdrop-blur">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="4 4" opacity={0.35} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="count"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="time"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}s`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--background))",
                    boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                  formatter={(value: any, name: any) => {
                    if (name === "Avg processing") return [formatDuration(Number(value)), name];
                    return [value, name];
                  }}
                />

                <Area
                  yAxisId="count"
                  type="monotone"
                  dataKey="analyzedParts"
                  name="Analysed parts"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="completedAnalyses"
                  name="Completed analysis"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="time"
                  type="monotone"
                  dataKey="avgProcessingSeconds"
                  name="Avg processing"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <div className="h-[260px] rounded-2xl border border-border bg-background/60 p-3 sm:p-4 backdrop-blur">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="4 4" opacity={0.35} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="pct"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--background))",
                    boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
                  }}
                  formatter={(value: any, name: any) => [`${Number(value).toFixed(1)}%`, name]}
                />
                <Area
                  yAxisId="pct"
                  type="monotone"
                  dataKey="avgConfidence"
                  name="Avg confidence"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.14}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="completionRate"
                  name="Completion rate"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};


