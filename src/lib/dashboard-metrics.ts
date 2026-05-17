import type { DashboardOverviewMetrics } from "@/components/dashboard/DashboardOverviewStats";

export function defaultOverviewMetrics(): DashboardOverviewMetrics {
  return {
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    inProgress: 0,
    avgConfidence: 0,
    avgProcessTime: 0,
    successRate: 0,
    analysesLast7Days: 0,
    trend7dPercent: null,
  };
}

/** Normalize confidence from API (0–1 decimal or 0–100 percentage). */
export function normalizeConfidenceValue(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value > 100) return Math.round(value / 100);
  if (value > 0 && value <= 1) return Math.round(value * 100);
  return Math.round(value * 10) / 10;
}

export function parseDashboardStatsPayload(
  data: Record<string, unknown> | null | undefined
): Partial<DashboardOverviewMetrics> {
  if (!data) return {};

  const totalUploads = Number(data.totalUploads ?? 0);
  const successfulUploads = Number(data.successfulUploads ?? 0);
  const failedUploads = Number(data.failedUploads ?? 0);
  const avgConfidence = normalizeConfidenceValue(Number(data.avgConfidence ?? 0));
  const avgSec =
    typeof data.avgProcessTime === "number"
      ? data.avgProcessTime
      : typeof data.avgResponseTime === "number"
        ? Math.round(Number(data.avgResponseTime) / 1000)
        : 0;

  return {
    totalUploads,
    successfulUploads,
    failedUploads,
    avgConfidence,
    avgProcessTime: avgSec,
    successRate: totalUploads > 0 ? (successfulUploads / totalUploads) * 100 : 0,
  };
}

export function computeAnalyticsRollups(series: { date?: string; analyzedParts?: number; completedAnalyses?: number }[]) {
  const points = (series || []).filter((p) => p?.date);
  const last7 = points.slice(-7);
  const prev7 = points.slice(-14, -7);
  const sum = (arr: typeof points) =>
    arr.reduce((acc, p) => acc + Number(p?.analyzedParts ?? p?.completedAnalyses ?? 0), 0);
  const last7Sum = sum(last7);
  const prev7Sum = sum(prev7);
  const trend7dPercent =
    prev7Sum > 0 ? ((last7Sum - prev7Sum) / prev7Sum) * 100 : last7Sum > 0 ? 100 : null;

  return {
    analysesLast7Days: last7Sum,
    trend7dPercent,
  };
}

export function buildSparklineFromAnalytics(
  series: { analyzedParts?: number; completedAnalyses?: number }[]
): number[] {
  return (series || []).map((p) =>
    Number(p?.analyzedParts ?? p?.completedAnalyses ?? 0)
  );
}
