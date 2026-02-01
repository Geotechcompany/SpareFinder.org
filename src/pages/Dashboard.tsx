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
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Eye,
  Download,
  Search,
  Cpu,
  Database,
  Activity,
  Menu,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PlanRequiredCard } from "@/components/billing/PlanRequiredCard";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { dashboardApi, apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { PerformanceOverviewChart } from "@/components/PerformanceOverviewChart";
import { getCrewJobDisplayName } from "@/services/aiAnalysisCrew";

const Dashboard = () => {
  const { inLayout } = useDashboardLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading: authLoading, logout, isAuthenticated } = useAuth();
  const { isPlanActive, isLoading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use refs to prevent multiple simultaneous requests
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const storageKey = useCallback(
    (base: string) => {
      // IMPORTANT: scope dashboard caches to the logged-in app user.
      // Otherwise a canceled fetch can leave stale stats from a previous user/session.
      const uid = user?.id;
      return uid ? `${base}:${uid}` : base;
    },
    [user?.id]
  );

  // State for dashboard data (persist last successful stats to avoid flicker-to-zero)
  // Start with zero; hydrate from per-user cache once the user id is available.
  const [stats, setStats] = useState(() => ({
    totalUploads: 0,
    successfulUploads: 0,
    avgConfidence: 0,
    avgProcessTime: 0,
  }));

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
      color: "from-purple-600 to-violet-600",
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
    // Backend identifies the user from the Authorization bearer token.
    // Don't block dashboard fetch on `user?.id` because the profile can briefly be null
    // during refresh/revalidation, which would wipe the UI back to 0.
    return !authLoading && isAuthenticated;
  }, [authLoading, isAuthenticated]);

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
        const avgConfidence = Number(data.avgConfidence || 0);
        // Backend /dashboard/stats returns seconds already (History shows `${avgProcessTime}s`)
        const avgSec =
          typeof data.avgProcessTime === "number"
            ? data.avgProcessTime
            : typeof data.avgResponseTime === "number"
            ? Math.round(data.avgResponseTime / 1000)
            : 0;

        setStats({
          totalUploads: totalUploads,
          successfulUploads: successfulUploads,
          avgConfidence,
          avgProcessTime: avgSec,
        });
        try {
          localStorage.setItem(
            storageKey("dashboard_overview_stats_v1"),
            JSON.stringify({
              totalUploads,
              successfulUploads,
              avgConfidence,
              avgProcessTime: avgSec,
            })
          );
        } catch {}
      } else {
        // Keep last successful stats instead of wiping to 0 (avoids flicker on transient failures).
      }

      // Handle uploads response
      if (
        crewJobsResponse.status === "fulfilled" &&
        crewJobsResponse.value.data
      ) {
        const crewJobsPayload = crewJobsResponse.value.data as any;
        const crewJobs = (Array.isArray(crewJobsPayload?.data)
          ? crewJobsPayload.data
          : Array.isArray(crewJobsPayload?.jobs)
          ? crewJobsPayload.jobs
          : Array.isArray(crewJobsPayload)
          ? crewJobsPayload
          : []) as any[];

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

      console.log(
        `📊 Activities mapped: ${activitiesMapped.length}, AI jobs: ${aiJobsMapped.length}, Total: ${allActivities.length}`
      );

      // Sort by time (most recent first) and take top 3
      const mergedActivities = allActivities
        .sort((a, b) => {
          // Parse time strings back to dates for sorting
          const timeA = a.time ? new Date(a.time).getTime() : 0;
          const timeB = b.time ? new Date(b.time).getTime() : 0;
          return timeB - timeA; // Descending order
        })
        .slice(0, 3);

      console.log(
        `✅ Setting ${mergedActivities.length} recent activities:`,
        mergedActivities
      );

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
            color: "from-purple-600 to-violet-600",
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
            color: "from-purple-600 to-violet-600",
          },
        ]);
      }

      // Timeseries analytics powers the Performance Overview chart.
      // If it fails, show an empty-state chart rather than crashing.
      if (analyticsResponse.status === "fulfilled" && analyticsResponse.value.success) {
        const nextAnalyticsSeries =
          ((analyticsResponse.value.data as any)?.series as any[]) || [];
        setAnalyticsSeries(nextAnalyticsSeries);
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
  }, [canFetchDashboard, toast, logout, storageKey]);

  // Hydrate cached dashboard data once we know which user is signed in.
  // This keeps the UI stable during refresh, without risking cross-user leakage.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (!user?.id) return;

    try {
      const rawStats = localStorage.getItem(storageKey("dashboard_overview_stats_v1"));
      if (rawStats && !hasLoadedOnceRef.current) {
        const parsed = JSON.parse(rawStats) as Partial<{
          totalUploads: number;
          successfulUploads: number;
          avgConfidence: number;
          avgProcessTime: number;
        }>;
        setStats({
          totalUploads: Number(parsed.totalUploads || 0),
          successfulUploads: Number(parsed.successfulUploads || 0),
          avgConfidence: Number(parsed.avgConfidence || 0),
          avgProcessTime: Number(parsed.avgProcessTime || 0),
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
  }, [authLoading, isAuthenticated, user?.id, storageKey]);

  // Initialize data fetch - run whenever auth becomes ready and user is present.
  // Avoid one-shot gating; Clerk can take longer than a fixed timeout to hydrate.
  useEffect(() => {
    if (authLoading) return;

    // If unauthenticated, ProtectedRoute will redirect; don't wipe UI state to 0 (prevents flicker).
    if (!isAuthenticated) {
      hasLoadedOnceRef.current = false;
      return;
    }

    // Kick off (or retry) data fetch when auth is ready.
    // fetchDashboardData itself is guarded against parallel calls.
    fetchDashboardData();
  }, [
    authLoading,
    isAuthenticated,
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

  if (!subscriptionLoading && !isPlanActive) {
    return (
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-[#0B1026] dark:via-[#1A1033] dark:to-[#0C1226]">
        <PlanRequiredCard />
      </div>
    );
  }

  if (isDataLoading) {
    return <DashboardSkeleton variant="user" showSidebar={!inLayout} />;
  }

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-[#0B1026] dark:via-[#1A1033] dark:to-[#0C1226] text-slate-900 dark:text-slate-100">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-2xl opacity-30"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-2xl opacity-25"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

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
            className="fixed top-3 right-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/95 text-muted-foreground shadow-soft-elevated backdrop-blur-sm md:hidden dark:bg-black/70 dark:border-white/10 dark:text-white"
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
        className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 sm:space-y-6 lg:space-y-8"
        >
          {/* Header */}
          <div className="relative">
            <div className="relative rounded-2xl sm:rounded-3xl border border-border/80 bg-card shadow-soft-elevated dark:bg-card/90 dark:shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
              <div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl dark:bg-gradient-to-r dark:from-purple-500/15 dark:via-blue-500/10 dark:to-transparent" />
              <div className="flex flex-col gap-4 px-4 py-3 sm:px-6 sm:py-4">
                {/* Top Row - Welcome Message and Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div>
                    <motion.h1
                      className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground dark:bg-gradient-to-r dark:from-foreground dark:via-purple-300 dark:to-blue-300 dark:bg-clip-text dark:text-transparent"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Welcome back,{" "}
                      {user?.full_name || user?.email?.split("@")[0] || "User"}
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-muted-foreground mt-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Here's what's happening with your part identification
                      today
                    </motion.p>
                  </div>
                  <motion.div
                    className="flex flex-wrap items-center gap-2 sm:gap-3"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        onClick={() => navigate("/dashboard/upload")}
                        className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 shadow-lg shadow-blue-500/20 focus:ring-2 focus:ring-blue-400/40"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        New Upload
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        onClick={startOnboarding}
                        className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 focus:ring-2 focus:ring-purple-400/40"
                      >
                        <Zap className="w-4 h-4 mr-2" /> Start Guided Tour
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {[
              {
                title: "Total Uploads",
                value: String(stats.totalUploads || 0),
                icon: FileText,
                color: "from-purple-600 to-blue-600",
              },
              {
                title: "Completed",
                value: String(stats.successfulUploads || 0),
                icon: CheckCircle,
                color: "from-green-600 to-emerald-600",
              },
              {
                title: "Avg Confidence",
                value: `${Number(stats.avgConfidence || 0).toFixed(1)}%`,
                icon: TrendingUp,
                color: "from-blue-600 to-cyan-600",
              },
              {
                title: "Avg Processing",
                value: `${stats.avgProcessTime || 0}s`,
                icon: Clock,
                color: "from-orange-600 to-red-600",
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                whileHover={{ y: -2, scale: 1.02 }}
                className="relative group"
              >
                <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-card/80 blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
                <Card className="relative border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl transition-all duration-300 hover:border-[#C7D2FE] dark:bg-black/40 dark:border-white/10 dark:hover:border-white/20">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground md:text-sm truncate">
                          {stat.title}
                        </p>
                        <p className="mt-1 text-lg font-bold text-foreground md:text-xl lg:text-2xl truncate">
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg flex-shrink-0`}
                      >
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Performance Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <Card className="relative border border-border bg-card/95 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:bg-gradient-to-br dark:from-slate-900/70 dark:to-slate-800/40 dark:border-slate-700/60">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="h-full border border-border bg-card/95 bg-grid-soft backdrop-blur-xl shadow-soft-elevated dark:bg-gradient-to-br dark:from-slate-900/70 dark:to-slate-800/40 dark:border-slate-700/60 dark:shadow-[0_18px_45px_rgba(15,23,42,0.35)]">
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
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/80 shadow-sm group-hover:shadow-md dark:bg-gradient-to-r dark:from-slate-800/60 dark:to-slate-700/40 dark:border-slate-700/60">
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

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="h-full border border-border bg-card/95 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:bg-gradient-to-br dark:from-slate-900/70 dark:to-slate-800/40 dark:border-slate-700/60">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl text-foreground dark:text-white">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <span>Quick Actions</span>
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Frequently used features and tools
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6">
                  {[
                    {
                      label: "Upload New Part",
                      icon: Upload,
                      href: "/dashboard/upload",
                      color: "from-blue-500 to-blue-600",
                    },
                    {
                      label: "View History",
                      icon: FileText,
                      href: "/history",
                      color: "from-slate-600 to-slate-500",
                    },
                    {
                      label: "View Profile",
                      icon: Eye,
                      href: "/profile",
                      color: "from-emerald-500 to-emerald-600",
                    },
                    {
                      label: "Settings",
                      icon: Download,
                      href: "/settings",
                      color: "from-amber-500 to-amber-600",
                    },
                  ].map((action, index) => (
                    <motion.div
                      key={action.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 + index * 0.08 }}
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(action.href)}
                        className="flex w-full items-center justify-between rounded-2xl border border-border bg-background/80 px-3 py-2.5 text-left text-sm shadow-sm transition-all hover:border-primary/40 hover:bg-card hover:shadow-soft-elevated/60"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r ${action.color} shadow-md shadow-primary/20`}
                          >
                            <action.icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-foreground">
                            {action.label}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Open
                        </span>
                      </button>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
