import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload,
  AlertTriangle,
  Zap,
  Search,
  Cpu,
  Database,
  Activity,
  Menu,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import { useDashboardChrome } from "@/hooks/use-dashboard-chrome";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { PlanRequiredCard } from "@/components/billing/PlanRequiredCard";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { dashboardApi, apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { PerformanceOverviewChart } from "@/components/PerformanceOverviewChart";
import { getCrewJobDisplayName } from "@/services/aiAnalysisCrew";
import { DashboardWelcomeBanner } from "@/components/dashboard/DashboardWelcomeBanner";
import { DashboardQuickActionsDock } from "@/components/dashboard/DashboardQuickActionsDock";
import { useDashboardSidebarOffset } from "@/hooks/use-dashboard-sidebar-offset";
import {
  DashboardOverviewStats,
  type DashboardOverviewMetrics,
} from "@/components/dashboard/DashboardOverviewStats";

const IN_PROGRESS_STATUSES = new Set([
  "processing",
  "pending",
  "running",
  "queued",
  "in_progress",
  "started",
]);

const defaultOverviewMetrics = (): DashboardOverviewMetrics => ({
  totalUploads: 0,
  successfulUploads: 0,
  failedUploads: 0,
  inProgress: 0,
  avgConfidence: 0,
  avgProcessTime: 0,
  successRate: 0,
  analysesLast7Days: 0,
  trend7dPercent: null,
});

function parseCrewJobs(payload: unknown): any[] {
  const p = payload as any;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.jobs)) return p.jobs;
  if (Array.isArray(p)) return p;
  return [];
}

function buildSparklineFromAnalytics(series: any[]): number[] {
  return (series || []).map((p) => Number(p?.analyzedParts ?? p?.completedAnalyses ?? 0));
}

function computeAnalyticsRollups(series: any[]) {
  const points = (series || []).filter((p) => p?.date);
  const last7 = points.slice(-7);
  const prev7 = points.slice(-14, -7);
  const sum = (arr: any[]) =>
    arr.reduce((acc, p) => acc + Number(p?.analyzedParts ?? 0), 0);
  const last7Sum = sum(last7);
  const prev7Sum = sum(prev7);
  const trend7dPercent =
    prev7Sum > 0 ? ((last7Sum - prev7Sum) / prev7Sum) * 100 : last7Sum > 0 ? 100 : null;
  return { analysesLast7Days: last7Sum, trend7dPercent };
}

const Dashboard = () => {
  const { inLayout, sidebarCollapsed: layoutSidebarCollapsed } =
    useDashboardLayout();
  const { isSplitDashboard } = useDashboardChrome();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useDashboardSidebarOffset(
    inLayout ? layoutSidebarCollapsed : isCollapsed
  );
  const { user, isLoading: authLoading, logout, isAuthenticated, isAdmin } = useAuth();
  const { activeWorkspaceId, isLoading: workspaceLoading } = useWorkspace();
  const { isPlanActive, isLoading: subscriptionLoading } = useSubscription();
  const hasPlanAccess = isAdmin || isPlanActive;
  const navigate = useNavigate();
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use refs to prevent multiple simultaneous requests
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const storageKey = useCallback(
    (base: string) => {
      const uid = user?.id;
      const wid = activeWorkspaceId;
      if (uid && wid) return `${base}:${uid}:${wid}`;
      return uid ? `${base}:${uid}` : base;
    },
    [user?.id, activeWorkspaceId]
  );

  // State for dashboard data (persist last successful stats to avoid flicker-to-zero)
  // Start with zero; hydrate from per-user cache once the user id is available.
  const [overviewMetrics, setOverviewMetrics] = useState<DashboardOverviewMetrics>(
    defaultOverviewMetrics
  );

  const [recentUploads, setRecentUploads] = useState<any[]>(() => []);
  const [recentActivities, setRecentActivities] = useState<any[]>(() => []);
  const [performanceMetrics, setPerformanceMetrics] = useState([
    {
      label: "AI Model Accuracy",
      value: "0%",
      change: "0%",
      icon: Cpu,
      color: "from-green-600 to-emerald-600",
    },
    {
      label: "Database Coverage",
      value: "0",
      change: "0",
      icon: Database,
      color: "from-blue-600 to-cyan-600",
    },
    {
      label: "Response Time",
      value: "0ms",
      change: "0ms",
      icon: Activity,
      color: "bg-primary/20 text-primary",
    },
  ]);
  const [analyticsSeries, setAnalyticsSeries] = useState<any[]>(() => []);

  const { toast } = useToast();

  const getMetricProgress = (raw: string) => {
    const match = raw?.toString().match(/([\d.]+)/);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    if (Number.isNaN(value)) return 0;
    if (raw.includes("%")) {
      return Math.max(0, Math.min(100, value));
    }
    return 0;
  };
  // Trigger onboarding from overview: jump directly to Upload with forced tour
  const startOnboarding = () => {
    try {
      localStorage.setItem("onboarding_force_start_v1", "1");
    } catch (err) {
      console.warn("Failed to persist onboarding flag:", err);
    }
    navigate("/dashboard/upload");
  };

  // Clerk migration: tokens are no longer stored in tokenStorage.
  // Use Clerk-backed auth state + app user presence to decide readiness.
  const canFetchDashboard = useCallback(() => {
    return (
      !authLoading &&
      !workspaceLoading &&
      isAuthenticated &&
      Boolean(activeWorkspaceId)
    );
  }, [authLoading, workspaceLoading, isAuthenticated, activeWorkspaceId]);

  const fetchDashboardData = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isFetchingRef.current || !canFetchDashboard()) {
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      isFetchingRef.current = true;
      // Only show the global loading state on the very first load to avoid blinking
      if (!hasLoadedOnceRef.current) {
        setIsDataLoading(true);
      }
      setError(null);

      // Fetch all data in parallel with proper error handling
      const [
        statsResponse,
        crewJobsResponse,
        activitiesResponse,
        metricsResponse,
        analyticsResponse,
      ] = await Promise.allSettled([
        dashboardApi.getStats({ signal }).catch((err) => {
          if (signal.aborted) throw new Error("Request aborted");
          throw err;
        }),
        // Fetch crew analysis jobs instead of regular uploads
        apiClient.get("/upload/crew-analysis-jobs", { signal }).catch((err) => {
          if (signal.aborted) throw new Error("Request aborted");
          throw err;
        }),
        dashboardApi.getRecentActivities(5, { signal }).catch((err) => {
          if (signal.aborted) throw new Error("Request aborted");
          throw err;
        }),
        dashboardApi.getPerformanceMetrics({ signal }).catch((err) => {
          if (signal.aborted) throw new Error("Request aborted");
          throw err;
        }),
        dashboardApi.getAnalytics({ days: 30, signal }).catch((err) => {
          if (signal.aborted) throw new Error("Request aborted");
          throw err;
        }),
      ]);

      // Check if request was aborted
      if (signal.aborted) {
        return;
      }

      // Handle stats response with fallback calculation from uploads data
      if (statsResponse.status === "fulfilled" && statsResponse.value.success) {
        const data = statsResponse.value.data as any;

        // Match History page: use /dashboard/stats payload directly.
        const totalUploads = Number(data.totalUploads || 0);
        const successfulUploads = Number(data.successfulUploads || 0);
        const failedUploads = Number(data.failedUploads || 0);
        const avgConfidence = Number(data.avgConfidence || 0);
        const avgSec =
          typeof data.avgProcessTime === "number"
            ? data.avgProcessTime
            : typeof data.avgResponseTime === "number"
            ? Math.round(data.avgResponseTime / 1000)
            : 0;
        const successRate =
          totalUploads > 0 ? (successfulUploads / totalUploads) * 100 : 0;

        setOverviewMetrics((prev) => {
          const next = {
            ...prev,
            totalUploads,
            successfulUploads,
            failedUploads,
            avgConfidence,
            avgProcessTime: avgSec,
            successRate,
          };
          try {
            localStorage.setItem(
              storageKey("dashboard_overview_stats_v1"),
              JSON.stringify(next)
            );
          } catch {}
          return next;
        });
      } else {
        // Keep last successful stats instead of wiping to 0 (avoids flicker on transient failures).
      }

      // Handle uploads response
      if (
        crewJobsResponse.status === "fulfilled" &&
        crewJobsResponse.value.data
      ) {
        const crewJobs = parseCrewJobs(crewJobsResponse.value.data);

        const inProgress = crewJobs.filter((job: any) =>
          IN_PROGRESS_STATUSES.has(String(job.status || "").toLowerCase())
        ).length;
        setOverviewMetrics((prev) => ({ ...prev, inProgress }));

        // Show only completed jobs, sorted by most recent
        const recentCompleted = crewJobs
          .filter((job: any) => job.status === "completed")
          .sort(
            (a: any, b: any) =>
              new Date(b.completed_at || b.created_at).getTime() -
              new Date(a.completed_at || a.created_at).getTime()
          )
          .slice(0, 5); // Show top 5

        setRecentUploads(
          recentCompleted.map((job: any) => ({
            id: job.id,
            name: getCrewJobDisplayName(job) || "Part analysis",
            date: format(new Date(job.completed_at || job.created_at), "PPp"),
            status: job.status,
            confidence: job.progress || 100, // Use progress as confidence (completed jobs are 100%)
          }))
        );
        try {
          localStorage.setItem(
            storageKey("dashboard_recent_uploads_v1"),
            JSON.stringify(
              recentCompleted.map((job: any) => ({
                id: job.id,
                name: getCrewJobDisplayName(job) || "Part analysis",
                date: format(new Date(job.completed_at || job.created_at), "PPp"),
                status: job.status,
                confidence: job.progress || 100,
              }))
            )
          );
        } catch {}
      } else {
        // Keep last successful recent uploads instead of wiping on transient failures.
        console.warn("❌ Failed to fetch crew jobs:", crewJobsResponse);
      }

      // Handle activities response and augment with AI service jobs
      const activitiesMapped = (() => {
        if (
          activitiesResponse.status === "fulfilled" &&
          activitiesResponse.value.success
        ) {
          const activitiesData =
            (activitiesResponse.value.data as any)?.activities || [];
          return activitiesData.map((activity) => {
            // Normalize confidence (9500 -> 95, 95 -> 95)
            let confidence = activity.details.confidence ?? null;
            if (typeof confidence === "number" && confidence > 100) {
              confidence = Math.round(confidence / 100);
            }

            return {
              id: activity.id,
              type: activity.resource_type,
              title: activity.action,
              description: activity.details.description,
              time: format(new Date(activity.created_at), "PPp"),
              confidence: confidence,
              status: activity.details.status,
            };
          });
        }
        return [] as any[];
      })();

      const aiJobsMapped = (() => {
        if (
          crewJobsResponse.status === "fulfilled" &&
          crewJobsResponse.value?.data &&
          (Array.isArray((crewJobsResponse.value.data as any)?.data) ||
            Array.isArray((crewJobsResponse.value.data as any)?.jobs) ||
            Array.isArray(crewJobsResponse.value.data))
        ) {
          const payload = crewJobsResponse.value.data as any;
          const jobs = (Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.jobs)
            ? payload.jobs
            : Array.isArray(payload)
            ? payload
            : []) as any[];

          return jobs
            .filter((j) => j.status === "completed")
            .map((j) => {
              const title = getCrewJobDisplayName(j) || "Part analysis";
              const desc = j.keywords || title;
              const timeStr = j.completed_at
                ? format(new Date(j.completed_at), "PPp")
                : j.created_at
                ? format(new Date(j.created_at), "PPp")
                : "";
              return {
                id: j.id,
                type: "upload",
                title,
                description: desc,
                time: timeStr,
                confidence: j.progress || 100,
                status: j.status,
              };
            });
        }
        return [] as any[];
      })();

      // Merge both activity sources and show latest 3.
      // If the requests fail transiently, keep last successful list rather than wiping.
      const allActivities = [...activitiesMapped, ...aiJobsMapped];

      // Sort by time (most recent first) and take top 3
      const mergedActivities = allActivities
        .sort((a, b) => {
          // Parse time strings back to dates for sorting
          const timeA = a.time ? new Date(a.time).getTime() : 0;
          const timeB = b.time ? new Date(b.time).getTime() : 0;
          return timeB - timeA; // Descending order
        })
        .slice(0, 3);

      const activitiesFetchFailed =
        activitiesResponse.status === "rejected" || crewJobsResponse.status === "rejected";

      if (mergedActivities.length) {
        setRecentActivities(mergedActivities);
        try {
          localStorage.setItem(
            storageKey("dashboard_recent_activities_v1"),
            JSON.stringify(mergedActivities)
          );
        } catch {}
      } else if (!activitiesFetchFailed) {
        // Only set empty if both sources succeeded but there is genuinely no activity.
        setRecentActivities([]);
        try {
          localStorage.setItem(storageKey("dashboard_recent_activities_v1"), "[]");
        } catch {}
      } else {
        console.warn("❌ Recent activities fetch failed; keeping last successful list.");
      }

      // Stats are now fetched from the API endpoint above
      // No need to recalculate from jobs array

      // Handle performance metrics response
      if (
        metricsResponse.status === "fulfilled" &&
        metricsResponse.value.success
      ) {
        const data = metricsResponse.value.data as any;

        // Normalize backend payload shape (older/newer backends use different keys)
        const normalizedTotal =
          data.totalSearches ?? data.totalUploads ?? data.total_searches ?? 0;
        const normalizedMatchRate =
          data.matchRate ?? data.modelAccuracy ?? data.successRate ?? 0;
        const normalizedAvgResponseTime =
          data.avgResponseTime ?? data.avgProcessTime ?? data.avgProcessTimeMs ?? 0;
        const normalizedAccuracyChange = data.accuracyChange ?? 0;
        const normalizedSearchesGrowth = data.searchesGrowth ?? 0;
        const normalizedResponseTimeChange = data.responseTimeChange ?? 0;

        setPerformanceMetrics([
          {
            label: "AI Model Accuracy",
            value: `${Number(normalizedMatchRate || 0).toFixed(1)}%`,
            change: `${normalizedAccuracyChange > 0 ? "+" : ""}${Number(
              normalizedAccuracyChange || 0
            ).toFixed(1)}%`,
            icon: Cpu,
            color: "from-green-600 to-emerald-600",
          },
          {
            label: "Total Uploads",
            value: `${normalizedTotal || 0}`,
            change: `${normalizedSearchesGrowth > 0 ? "+" : ""}${Number(
              normalizedSearchesGrowth || 0
            ).toFixed(1)}%`,
            icon: Database,
            color: "from-blue-600 to-cyan-600",
          },
          {
            label: "Response Time",
            value: `${normalizedAvgResponseTime || 0}ms`,
            change: `${normalizedResponseTimeChange < 0 ? "" : "+"}${
              normalizedResponseTimeChange || 0
            }ms`,
            icon: Activity,
            color: "bg-primary/20 text-primary",
          },
        ]);
      } else {
        console.warn(
          "❌ Failed to fetch performance metrics:",
          metricsResponse
        );
        setPerformanceMetrics([
          {
            label: "AI Model Accuracy",
            value: "0%",
            change: "0%",
            icon: Cpu,
            color: "from-green-600 to-emerald-600",
          },
          {
            label: "Database Coverage",
            value: "0",
            change: "0",
            icon: Database,
            color: "from-blue-600 to-cyan-600",
          },
          {
            label: "Response Time",
            value: "0ms",
            change: "0ms",
            icon: Activity,
            color: "bg-primary/20 text-primary",
          },
        ]);
      }

      // Timeseries analytics powers the Performance Overview chart.
      // If it fails, show an empty-state chart rather than crashing.
      if (analyticsResponse.status === "fulfilled" && analyticsResponse.value.success) {
        const nextAnalyticsSeries =
          ((analyticsResponse.value.data as any)?.series as any[]) || [];
        setAnalyticsSeries(nextAnalyticsSeries);
        const rollups = computeAnalyticsRollups(nextAnalyticsSeries);
        setOverviewMetrics((prev) => ({ ...prev, ...rollups }));
        try {
          localStorage.setItem(
            storageKey("dashboard_analytics_series_v1"),
            JSON.stringify(nextAnalyticsSeries)
          );
        } catch {}
      } else {
        // Keep last successful analytics series instead of wiping to empty.
        console.warn("❌ Analytics fetch failed; keeping last successful series.", analyticsResponse);
      }

      // Check if any request failed with auth error
      const authErrors = [
        statsResponse,
        crewJobsResponse,
        activitiesResponse,
        metricsResponse,
        analyticsResponse,
      ].filter(
        (response) =>
          response.status === "rejected" &&
          (response as any).reason?.response?.status === 401
      );

      if (authErrors.length > 0) {
        console.log("🔒 Authentication errors detected, logging out...");
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        await logout();
        return;
      }

      // Mark that we've completed at least one successful load
      hasLoadedOnceRef.current = true;
    } catch (error: any) {
      if (error.message === "Request aborted") {
        console.log("🔄 Request was aborted");
        return;
      }

      console.error("❌ Error in fetchDashboardData:", error);

      // Handle authentication errors
      if (error.response?.status === 401) {
        console.log("🔒 Authentication error, logging out...");
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        await logout();
        return;
      }

      // Handle other errors
      setError(error.message || "Failed to load dashboard data");
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      isFetchingRef.current = false;
      setIsDataLoading(false);
    }
  }, [canFetchDashboard, toast, logout, storageKey, activeWorkspaceId]);

  // Hydrate cached dashboard data once we know which user/workspace is active.
  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    if (!isAuthenticated) return;
    if (!user?.id || !activeWorkspaceId) return;

    try {
      const rawStats = localStorage.getItem(storageKey("dashboard_overview_stats_v1"));
      if (rawStats && !hasLoadedOnceRef.current) {
        const parsed = JSON.parse(rawStats) as Partial<DashboardOverviewMetrics>;
        setOverviewMetrics({
          ...defaultOverviewMetrics(),
          ...parsed,
          totalUploads: Number(parsed.totalUploads ?? 0),
          successfulUploads: Number(parsed.successfulUploads ?? 0),
          failedUploads: Number(parsed.failedUploads ?? 0),
          inProgress: Number(parsed.inProgress ?? 0),
          avgConfidence: Number(parsed.avgConfidence ?? 0),
          avgProcessTime: Number(parsed.avgProcessTime ?? 0),
          successRate: Number(parsed.successRate ?? 0),
          analysesLast7Days: Number(parsed.analysesLast7Days ?? 0),
          trend7dPercent:
            parsed.trend7dPercent == null ? null : Number(parsed.trend7dPercent),
        });
      }

      const rawUploads = localStorage.getItem(storageKey("dashboard_recent_uploads_v1"));
      if (rawUploads && !hasLoadedOnceRef.current) {
        setRecentUploads(JSON.parse(rawUploads) as any[]);
      }

      const rawActivities = localStorage.getItem(
        storageKey("dashboard_recent_activities_v1")
      );
      if (rawActivities && !hasLoadedOnceRef.current) {
        setRecentActivities(JSON.parse(rawActivities) as any[]);
      }

      const rawSeries = localStorage.getItem(storageKey("dashboard_analytics_series_v1"));
      if (rawSeries && !hasLoadedOnceRef.current) {
        setAnalyticsSeries(JSON.parse(rawSeries) as any[]);
      }
    } catch {
      // ignore cache parse errors
    }
  }, [authLoading, workspaceLoading, isAuthenticated, user?.id, activeWorkspaceId, storageKey]);

  // Refetch dashboard data when auth or active workspace changes.
  useEffect(() => {
    if (authLoading || workspaceLoading) return;

    if (!isAuthenticated) {
      hasLoadedOnceRef.current = false;
      return;
    }

    if (!activeWorkspaceId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    isFetchingRef.current = false;
    hasLoadedOnceRef.current = false;

    fetchDashboardData();
  }, [
    authLoading,
    workspaceLoading,
    isAuthenticated,
    activeWorkspaceId,
    fetchDashboardData,
  ]);

  // Removed auto-refetch loop on empty stats to prevent infinite polling and UI blinking

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Removed periodic auto-refresh to avoid repeated background requests when stats are legitimately empty

  if (!subscriptionLoading && !hasPlanAccess) {
    if (inLayout) {
      return <PlanRequiredCard />;
    }
    return (
      <motion.div
        className={cn(
          "dashboard-premium flex min-h-screen w-full bg-background",
          isSplitDashboard && "dashboard-theme-split"
        )}
      >
        <DashboardSidebar
          isCollapsed={isCollapsed}
          onToggle={handleToggleSidebar}
        />
        <MobileSidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <motion.div
          className={cn(
            "dashboard-main-light min-h-screen flex-1 overflow-y-auto",
            isSplitDashboard && "dashboard-docked-panel"
          )}
        >
          <PlanRequiredCard />
        </motion.div>
      </motion.div>
    );
  }

  if (isDataLoading) {
    return <DashboardSkeleton variant="user" showSidebar={!inLayout} />;
  }

  const dashboardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 space-y-4 sm:space-y-6 lg:space-y-8"
    >
      <DashboardWelcomeBanner
        fullName={user?.full_name}
        email={user?.email}
        onNewUpload={() => navigate("/dashboard/upload")}
        onStartTour={startOnboarding}
      />

      <DashboardOverviewStats
        metrics={overviewMetrics}
        sparklineSeries={buildSparklineFromAnalytics(analyticsSeries)}
        isLoading={isDataLoading && !hasLoadedOnceRef.current}
      />

      {/* Performance Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative"
      >
        <Card className="premium-card relative bg-card/95 backdrop-blur-md">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl text-foreground dark:text-white">
              <Zap className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
              <span>Performance Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <PerformanceOverviewChart
              series={analyticsSeries}
              isLoading={isDataLoading && !hasLoadedOnceRef.current}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="relative"
      >
        <Card className="premium-card relative bg-card/95 backdrop-blur-md">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl text-foreground dark:text-white">
              <Activity className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent activity yet. Upload a part image to get started.
              </p>
            ) : (
              recentActivities.map((activity, index) => (
                <motion.div
                  key={`${activity.title}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="group flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3 transition-colors hover:border-accent/30 hover:bg-muted/50 dark:border-white/10 dark:bg-black/20 dark:hover:border-white/20"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-muted/80 shadow-sm group-hover:border-accent/40"
                  >
                    {activity.type === "upload" ? (
                      <Upload className="w-4 h-4 text-primary" />
                    ) : (
                      <Search className="w-4 h-4 text-primary" />
                    )}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate text-foreground dark:text-white">
                        {activity.title}
                      </p>
                      {activity.confidence !== null && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[11px] px-2 py-0.5 dark:bg-emerald-600/20 dark:text-emerald-300 dark:border-emerald-500/40"
                        >
                          {activity.confidence}%
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      {activity.time}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );

  if (inLayout) {
    return (
      <>
        {dashboardContent}
        <DashboardQuickActionsDock sidebarCollapsed={layoutSidebarCollapsed} />
      </>
    );
  }

  return (
    <motion.div
      className={cn(
        "dashboard-premium min-h-screen flex w-full bg-background text-foreground",
        isSplitDashboard && "dashboard-theme-split"
      )}
    >

      {/* Sidebar and mobile menu handled by layout when inLayout */}
      {!inLayout && (
        <>
          <DashboardSidebar
            isCollapsed={isCollapsed}
            onToggle={handleToggleSidebar}
          />
          <MobileSidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
          <button
            onClick={handleToggleMobileMenu}
            className="fixed top-3 right-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-sm md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={
          inLayout
            ? { marginLeft: 0, width: "100%" }
            : {
                marginLeft: isCollapsed
                  ? "var(--collapsed-sidebar-width, 80px)"
                  : "var(--expanded-sidebar-width, 320px)",
                width: isCollapsed
                  ? "calc(100% - var(--collapsed-sidebar-width, 80px))"
                  : "calc(100% - var(--expanded-sidebar-width, 320px))",
              }
        }
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "dashboard-main-light min-h-screen flex-1 overflow-y-auto overflow-x-hidden px-3 pb-28 pt-3 sm:px-6 sm:pt-6 sm:pb-24 lg:px-8 lg:py-8 lg:pb-32",
          isSplitDashboard && "dashboard-docked-panel"
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 space-y-4 sm:space-y-6 lg:space-y-8"
        >
          <DashboardWelcomeBanner
            fullName={user?.full_name}
            email={user?.email}
            onNewUpload={() => navigate("/dashboard/upload")}
            onStartTour={startOnboarding}
          />

          <DashboardOverviewStats
            metrics={overviewMetrics}
            sparklineSeries={buildSparklineFromAnalytics(analyticsSeries)}
            isLoading={isDataLoading && !hasLoadedOnceRef.current}
          />

          {/* Performance Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <Card className="premium-card relative bg-card/95 backdrop-blur-md">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl text-foreground dark:text-white">
                  <Zap className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                  <span>Performance Overview</span>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Trends over the last 30 days (analysis volume + quality)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <PerformanceOverviewChart
                  series={analyticsSeries}
                  isLoading={isDataLoading}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="premium-card bg-card/95 backdrop-blur-md">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl text-foreground dark:text-white">
                    <Activity className="w-5 h-5 text-primary" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Your latest part identification results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                  {recentActivities.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        No recent activities
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/80">
                        Upload some parts to see activity here
                      </p>
                    </div>
                  ) : (
                    recentActivities.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 + index * 0.08 }}
                        className="relative flex items-start gap-3 pl-5 py-3 rounded-xl hover:bg-muted/70 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {index !== recentActivities.length - 1 && (
                          <div className="pointer-events-none absolute left-4 top-8 bottom-0 w-px bg-border/70" />
                        )}
                        <div className="absolute left-0 top-4 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-full bg-background ring-4 ring-muted/80 dark:ring-slate-800">
                          <span className="block h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-muted/80 shadow-sm group-hover:border-accent/40">
                          {activity.type === "upload" ? (
                            <Upload className="w-4 h-4 text-primary" />
                          ) : (
                            <Search className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate text-foreground dark:text-white">
                              {activity.title}
                            </p>
                            {activity.confidence !== null && (
                              <Badge
                                variant="secondary"
                                className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[11px] px-2 py-0.5 dark:bg-emerald-600/20 dark:text-emerald-300 dark:border-emerald-500/40"
                              >
                                {activity.confidence}%
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {activity.description}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground/80">
                            {activity.time}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </CardContent>
            </Card>
          </motion.div>

        </motion.div>
      </motion.div>

      <DashboardQuickActionsDock sidebarCollapsed={isCollapsed} />
    </motion.div>
  );
};

export default Dashboard;
