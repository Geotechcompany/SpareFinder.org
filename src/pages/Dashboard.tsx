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
import CreditsDisplay from "@/components/CreditsDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import OnboardingGuide from "@/components/OnboardingGuide";
import { dashboardApi, tokenStorage } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import DashboardSkeleton from "@/components/DashboardSkeleton";

const Dashboard = () => {
  const { inLayout } = useDashboardLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading: authLoading, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use refs to prevent multiple simultaneous requests
  const isInitializedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedOnceRef = useRef(false);

  // State for dashboard data
  const [stats, setStats] = useState({
    totalUploads: 0,
    successfulUploads: 0,
    avgConfidence: 0,
    avgProcessTime: 0,
  });

  const [recentUploads, setRecentUploads] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
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

  const { toast } = useToast();
  // Trigger onboarding from overview
  const [showTourNow, setShowTourNow] = useState(false);
  const startOnboarding = () => {
    setShowTourNow(true);
  };

  // Check if user has valid token and is authenticated
  const hasValidToken = useCallback(() => {
    const token = tokenStorage.getToken();
    return !!token && isAuthenticated && !!user?.id;
  }, [isAuthenticated, user?.id]);

  const fetchDashboardData = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isFetchingRef.current || !hasValidToken()) {
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
        uploadsResponse,
        activitiesResponse,
        metricsResponse,
        aiJobsResponse,
      ] = await Promise.allSettled([
        dashboardApi.getStats().catch((err) => {
          if (signal.aborted) throw new Error("Request aborted");
          throw err;
        }),
        dashboardApi.getRecentUploads().catch((err) => {
          if (signal.aborted) throw new Error("Request aborted");
          throw err;
        }),
        dashboardApi.getRecentActivities().catch((err) => {
          if (signal.aborted) throw new Error("Request aborted");
          throw err;
        }),
        dashboardApi.getPerformanceMetrics().catch((err) => {
          if (signal.aborted) throw new Error("Request aborted");
          throw err;
        }),
        (async () => {
          try {
            const API_BASE =
              (import.meta as any).env?.VITE_AI_SERVICE_URL ||
              "http://localhost:8000";
            const r = await fetch(`${API_BASE}/jobs`);
            return await r.json();
          } catch (e) {
            return { success: false, results: [] } as any;
          }
        })(),
      ]);

      // Check if request was aborted
      if (signal.aborted) {
        return;
      }

      // Handle stats response with fallback calculation from uploads data
      if (statsResponse.status === "fulfilled" && statsResponse.value.success) {
        const data = statsResponse.value.data;

        // Map the API response to dashboard state
        // Backend returns: totalSearches, avgConfidence, matchRate, avgProcessTime
        // Frontend needs: totalUploads, successfulUploads, avgConfidence, avgProcessTime
        const totalUploads = data.totalUploads || data.totalSearches || 0;
        const successfulUploads =
          data.successfulUploads ||
          Math.round(((data.matchRate || 0) * totalUploads) / 100) ||
          0;

        const rawTime = data.avgProcessTime || data.avgResponseTime || 0;
        const avgSec =
          typeof rawTime === "number"
            ? rawTime > 100
              ? Math.round(rawTime / 1000)
              : Math.round(rawTime)
            : 0;
        setStats({
          totalUploads: totalUploads,
          successfulUploads: successfulUploads,
          avgConfidence: data.avgConfidence || 0,
          avgProcessTime: avgSec,
        });
      } else {
        // Fallback: Calculate stats from uploads data if available
        if (
          uploadsResponse.status === "fulfilled" &&
          uploadsResponse.value.success
        ) {
          const uploadsData = uploadsResponse.value.data?.uploads || [];

          const totalUploads = uploadsData.length;
          const successfulUploads = uploadsData.filter(
            (upload: any) => upload.confidence_score > 0
          ).length;
          const avgConfidence =
            totalUploads > 0
              ? uploadsData.reduce(
                  (sum: number, upload: any) =>
                    sum + (upload.confidence_score * 100 || 0),
                  0
                ) / totalUploads
              : 0;

          const avgSecFallback = 0; // unknown from uploads list
          setStats({
            totalUploads,
            successfulUploads,
            avgConfidence: Math.round(avgConfidence),
            avgProcessTime: avgSecFallback,
          });
        } else {
          setStats({
            totalUploads: 0,
            successfulUploads: 0,
            avgConfidence: 0,
            avgProcessTime: 0,
          });
        }
      }

      // Handle uploads response
      if (
        uploadsResponse.status === "fulfilled" &&
        uploadsResponse.value.success
      ) {
        const uploadsData = uploadsResponse.value.data?.uploads || [];
        setRecentUploads(
          uploadsData.map((upload) => ({
            id: upload.id,
            name: upload.image_name || "Unknown",
            date: format(new Date(upload.created_at), "PPp"),
            status: "completed",
            confidence: Math.round((upload.confidence_score || 0) * 100),
          }))
        );
      } else {
        console.warn("❌ Failed to fetch recent uploads:", uploadsResponse);
        setRecentUploads([]);
      }

      // Handle activities response and augment with AI service jobs
      const activitiesMapped = (() => {
        if (
          activitiesResponse.status === "fulfilled" &&
          activitiesResponse.value.success
        ) {
          const activitiesData =
            activitiesResponse.value.data?.activities || [];
          return activitiesData.map((activity) => ({
            id: activity.id,
            type: activity.resource_type,
            title: activity.action,
            description: activity.details.description,
            time: format(new Date(activity.created_at), "PPp"),
            confidence: activity.details.confidence ?? null,
            status: activity.details.status,
          }));
        }
        return [] as any[];
      })();

      const aiJobsMapped = (() => {
        if (
          aiJobsResponse.status === "fulfilled" &&
          aiJobsResponse.value?.success &&
          Array.isArray(aiJobsResponse.value.results)
        ) {
          const jobs = aiJobsResponse.value.results as any[];
          const normalizeConfidence = (val: any): number | null => {
            if (typeof val !== "number" || isNaN(val)) return null;
            return val <= 1 ? Math.round(val * 100) : Math.round(val);
          };

          return jobs.map((j) => {
            const isKeyword = String(j.mode) === "keywords_only";
            const rawConf =
              typeof j.confidence_score === "number"
                ? j.confidence_score
                : typeof j.confidence === "number"
                ? j.confidence
                : undefined;
            const confidence = normalizeConfidence(rawConf);
            const title = isKeyword
              ? `Keyword search ${j.status}`
              : `Image analysis ${j.status}`;
            const desc =
              j.precise_part_name ||
              j.class_name ||
              (Array.isArray(j.query?.keywords)
                ? j.query.keywords.join(", ")
                : "");
            return {
              id: j.id || j.filename,
              type: isKeyword ? "search" : "upload",
              title,
              description: desc || "",
              time: "",
              confidence,
              status: j.status,
            };
          });
        }
        return [] as any[];
      })();

      // Show only latest 3 image analyses with accurate confidence
      const mergedActivities = aiJobsMapped
        .filter((a) => a.type === "upload")
        .slice(0, 3);
      if (!mergedActivities.length) {
        console.warn("❌ No recent activities available");
      }
      setRecentActivities(mergedActivities);

      // Derive accurate stats from AI jobs when available
      if (
        aiJobsResponse.status === "fulfilled" &&
        aiJobsResponse.value?.success &&
        Array.isArray(aiJobsResponse.value.results)
      ) {
        const normalizeConfidence = (val: any): number | null => {
          if (typeof val !== "number" || isNaN(val)) return null;
          return val <= 1 ? val * 100 : val;
        };
        const toMs = (t: any): number | null => {
          if (typeof t !== "number" || isNaN(t)) return null;
          // if looks like seconds, convert to ms
          return t < 50 ? Math.round(t * 1000) : Math.round(t);
        };
        const jobs = (aiJobsResponse.value.results as any[]).filter(
          (j) => String(j.mode) !== "keywords_only"
        );
        const total = jobs.length;
        const completed = jobs.filter(
          (j) => String(j.status) === "completed" || j.success === true
        ).length;
        const confs = jobs
          .map((j) =>
            normalizeConfidence(
              typeof j.confidence_score === "number"
                ? j.confidence_score
                : (j as any).confidence
            )
          )
          .filter((n): n is number => typeof n === "number");
        const times = jobs
          .map((j) =>
            toMs(
              typeof j.processing_time_seconds === "number"
                ? j.processing_time_seconds
                : (j as any).processing_time
            )
          )
          .filter((n): n is number => typeof n === "number");
        const avgConf = confs.length
          ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length)
          : 0;
        const avgMs = times.length
          ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
          : 0;
        const avgSec = Math.round(avgMs / 1000);

        setStats({
          totalUploads: total,
          successfulUploads: completed,
          avgConfidence: avgConf,
          avgProcessTime: avgSec,
        });
      }

      // Handle performance metrics response
      if (
        metricsResponse.status === "fulfilled" &&
        metricsResponse.value.success
      ) {
        const data = metricsResponse.value.data;

        // If stats endpoint failed but performance metrics has the data, use it as fallback
        if (
          (statsResponse.status === "rejected" ||
            !(statsResponse as any).value?.success) &&
          data.totalSearches
        ) {
          const totalUploads = data.totalSearches || 0;
          const successfulUploads =
            Math.round(((data.matchRate || 0) * totalUploads) / 100) || 0;

          setStats({
            totalUploads: totalUploads,
            successfulUploads: successfulUploads,
            avgConfidence: data.avgConfidence || 0,
            avgProcessTime: data.avgResponseTime || 0,
          });
        }

        setPerformanceMetrics([
          {
            label: "AI Model Accuracy",
            value: `${data.modelAccuracy?.toFixed(1) || data.matchRate || 0}%`,
            change: `${data.accuracyChange > 0 ? "+" : ""}${
              data.accuracyChange?.toFixed(1) || 0
            }%`,
            icon: Cpu,
            color: "from-green-600 to-emerald-600",
          },
          {
            label: "Total Searches",
            value: `${data.totalSearches || 0}`,
            change: `${data.searchesGrowth > 0 ? "+" : ""}${
              data.searchesGrowth?.toFixed(1) || 0
            }%`,
            icon: Database,
            color: "from-blue-600 to-cyan-600",
          },
          {
            label: "Response Time",
            value: `${data.avgResponseTime || data.avgProcessTime || 0}ms`,
            change: `${data.responseTimeChange < 0 ? "" : "+"}${
              data.responseTimeChange || 0
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

      // Check if any request failed with auth error
      const authErrors = [
        statsResponse,
        uploadsResponse,
        activitiesResponse,
        metricsResponse,
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
  }, [hasValidToken, user?.id, toast, logout]);

  // Initialize data fetch - only run once when component mounts and user is authenticated
  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated &&
      user?.id &&
      !isInitializedRef.current
    ) {
      isInitializedRef.current = true;

      // Add a small delay to ensure auth context is fully ready
      setTimeout(() => {
        fetchDashboardData();
      }, 100);
    }

    // Reset initialization flag when user changes
    if (!isAuthenticated || !user?.id) {
      isInitializedRef.current = false;
      setStats({
        totalUploads: 0,
        successfulUploads: 0,
        avgConfidence: 0,
        avgProcessTime: 0,
      });
      setRecentUploads([]);
      setRecentActivities([]);
      setError(null);
    }
  }, [isAuthenticated, user?.id, authLoading]);

  // Separate effect to trigger fetch when auth state becomes ready
  useEffect(() => {
    const shouldFetch =
      !authLoading && isAuthenticated && user?.id && tokenStorage.getToken();

    if (shouldFetch && !isInitializedRef.current) {
      isInitializedRef.current = true;

      // Ensure auth context is completely ready
      const timeoutId = setTimeout(() => {
        if (hasValidToken()) {
          fetchDashboardData();
        }
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [
    isAuthenticated,
    user?.id,
    authLoading,
    hasValidToken,
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

  const handleRefreshData = () => {
    if (!hasValidToken()) {
      toast({
        title: "Authentication Required",
        description: "Please log in to refresh data.",
        variant: "destructive",
      });
      return;
    }

    isInitializedRef.current = false; // Reset initialization flag
    fetchDashboardData();
    toast({
      title: "Data Refreshed",
      description: "Dashboard data has been updated.",
    });
  };

  // Removed periodic auto-refresh to avoid repeated background requests when stats are legitimately empty

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
            className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-black/20 backdrop-blur-xl border border-white/10 md:hidden"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
        </>
      )}

      {/* Tour welcome when triggered from dashboard */}
      {showTourNow && (
        <OnboardingGuide
          showWelcome
          force
          steps={[]}
          onStart={() => {
            try {
              localStorage.setItem("onboarding_force_start_v1", "1");
            } catch {}
            setShowTourNow(false);
            navigate("/dashboard/upload");
          }}
          onDismiss={() => setShowTourNow(false)}
        />
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
            <div className="relative bg-gradient-to-br from-slate-900/70 to-slate-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-300 dark:border-slate-700/60 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col gap-4">
                {/* Top Row - Welcome Message and Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div>
                    <motion.h1
                      className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Welcome back,{" "}
                      {user?.full_name || user?.email?.split("@")[0] || "User"}
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-400 mt-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Here's what's happening with your part identification
                      today
                    </motion.p>
                  </div>
                  <motion.div
                    className="flex flex-col sm:flex-row sm:space-x-3 space-y-2 sm:space-y-0 w-full sm:w-auto"
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
                        onClick={handleRefreshData}
                        variant="outline"
                        className="w-full sm:w-auto bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700/60 focus:ring-2 focus:ring-blue-400/30"
                      >
                        <Loader2 className="w-4 h-4 mr-2" />
                        Refresh Data
                      </Button>
                    </motion.div>

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

                {/* Bottom Row - Credits Display */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-center sm:justify-start"
                >
                  <CreditsDisplay
                    size="medium"
                    className="w-full sm:w-auto max-w-md"
                  />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {[
              {
                title: "Total Uploads",
                value: stats.totalUploads?.toString() || "0",
                change: stats.totalUploads > 0 ? "+12%" : "0%",
                icon: Upload,
                color: "from-blue-500 to-blue-600",
                bgColor: "from-slate-800/40 to-slate-700/20",
              },
              {
                title: "Successful IDs",
                value: stats.successfulUploads?.toString() || "0",
                change:
                  stats.totalUploads > 0
                    ? `${(
                        (stats.successfulUploads / stats.totalUploads) *
                        100
                      ).toFixed(1)}% success rate`
                    : "0%",
                icon: CheckCircle,
                color: "from-emerald-500 to-emerald-600",
                bgColor: "from-slate-800/40 to-slate-700/20",
              },
              {
                title: "Avg Confidence",
                value: `${Number(stats.avgConfidence || 0).toFixed(1)}%`,
                change: stats.avgConfidence > 0 ? "+2.1%" : "0%",
                icon: TrendingUp,
                color: "from-blue-500 to-blue-600",
                bgColor: "from-slate-800/40 to-slate-700/20",
              },
              {
                title: "Avg Processing",
                value: `${stats.avgProcessTime || 0}s`,
                change: stats.avgProcessTime > 0 ? "-15%" : "0%",
                icon: Clock,
                color: "from-amber-500 to-amber-600",
                bgColor: "from-slate-800/40 to-slate-700/20",
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative group"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} rounded-xl sm:rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] opacity-100`}
                />
                <Card className="relative bg-transparent backdrop-blur-xl border border-slate-300 dark:border-slate-700/60 hover:border-slate-500/70 transition-all duration-300">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs sm:text-sm font-medium">
                          {stat.title}
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-white mt-1">
                          {stat.value}
                        </p>
                        <p
                          className={`text-xs sm:text-sm mt-1 ${
                            stat.change.startsWith("+")
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {stat.change} from last month
                        </p>
                      </div>
                      <div
                        className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${stat.color} shadow-lg`}
                      >
                        <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
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
            <Card className="relative bg-gradient-to-br from-slate-900/70 to-slate-800/40 backdrop-blur-xl border border-slate-300 dark:border-slate-700/60 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span>Performance Overview</span>
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  AI model insights and system performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {performanceMetrics.map((metric, index) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="relative group"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-800/40 rounded-2xl`}
                      />
                      <div className="relative p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className={`p-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg`}
                          >
                            <metric.icon className="w-5 h-5 text-white" />
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                          >
                            {metric.change}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm">
                            {metric.label}
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {metric.value}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
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
              <Card className="bg-gradient-to-br from-slate-900/70 to-slate-800/40 backdrop-blur-xl border border-slate-300 dark:border-slate-700/60 h-full shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
                    <Activity className="w-5 h-5 text-blue-400" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm">
                    Your latest part identification results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                  {recentActivities.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-slate-400 text-sm">
                        No recent activities
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        Upload some parts to see activity here
                      </p>
                    </div>
                  ) : (
                    recentActivities.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className="flex items-start space-x-3 p-3 rounded-xl hover:bg-slate-800/40 transition-colors group"
                      >
                        <div className="p-2 bg-gradient-to-r from-slate-800/60 to-slate-700/40 rounded-lg border border-slate-700/60 group-hover:border-slate-500/60 transition-colors">
                          {activity.type === "upload" ? (
                            <Upload className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Search className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-white text-sm font-medium truncate">
                              {activity.title}
                            </p>
                            {activity.confidence !== null && (
                              <Badge
                                variant="secondary"
                                className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 text-xs"
                              >
                                {activity.confidence}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs mt-1">
                            {activity.description}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">
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
              <Card className="bg-gradient-to-br from-slate-900/70 to-slate-800/40 backdrop-blur-xl border border-slate-300 dark:border-slate-700/60 h-full shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <span>Quick Actions</span>
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm">
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
                      transition={{ delay: 1 + index * 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => navigate(action.href)}
                        className="w-full justify-start h-12 text-slate-300 hover:text-white hover:bg-slate-800/40 group"
                      >
                        <div
                          className={`p-2 rounded-lg bg-gradient-to-r ${action.color} mr-3 group-hover:scale-110 transition-transform`}
                        >
                          <action.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium">{action.label}</span>
                      </Button>
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
