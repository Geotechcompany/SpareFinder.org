import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
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
  Trash2,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { dashboardApi, tokenStorage } from "@/lib/api";
import { PartAnalysisDisplayModal } from "@/components/PartAnalysisDisplay";
import OnboardingGuide from "@/components/OnboardingGuide";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import jsPDF from "jspdf";

const History = () => {
  const { inLayout } = useDashboardLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState({
    totalUploads: 0,
    completed: 0,
    avgConfidence: "0.0",
    avgProcessingTime: "0s",
  });

  const [pastAnalysis, setpastAnalysis] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analysis modal state
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | undefined>(
    undefined
  );
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [jobImages, setJobImages] = useState<
    Record<string, string | undefined>
  >({});
  const [jobStatusMap, setJobStatusMap] = useState<Record<string, any>>({});
  const [isKeywordOpen, setIsKeywordOpen] = useState(false);
  const [selectedKeywordJob, setSelectedKeywordJob] = useState<any | null>(
    null
  );

  // Build a robust public URL for Supabase storage
  const buildSupabasePublicUrl = useCallback(
    (pathOrUrl?: string, fallbackFilename?: string): string | undefined => {
      try {
        if (!pathOrUrl && !fallbackFilename) return undefined;
        const raw = String(pathOrUrl || "").trim();
        if (raw.startsWith("http://") || raw.startsWith("https://")) {
          return raw;
        }
        const SUPABASE_URL =
          (import.meta as any).env?.VITE_SUPABASE_URL ||
          (import.meta as any).env?.SUPABASE_URL;
        if (!SUPABASE_URL) return undefined;
        const bucket =
          (import.meta as any).env?.VITE_SUPABASE_BUCKET_NAME ||
          (import.meta as any).env?.VITE_PUBLIC_BUCKET ||
          (import.meta as any).env?.VITE_SUPABASE_STORAGE_BUCKET ||
          "parts";

        // If we were given a storage path like "userId/file.jpg" or "uploads/file.jpg"
        const storagePath =
          raw ||
          (user?.id && fallbackFilename
            ? `${user.id}/${fallbackFilename}`
            : fallbackFilename || "");
        if (!storagePath) return undefined;
        return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;
      } catch {
        return undefined;
      }
    },
    [user?.id]
  );
  // Delete confirmation state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "analysis";
    job: any;
  } | null>(null);

  // Use refs to prevent multiple simultaneous requests
  const isInitializedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stable token validation function
  const hasValidToken = useCallback(() => {
    const token = tokenStorage.getToken();
    return !!token && isAuthenticated && !!user?.id;
  }, [isAuthenticated, user?.id]);

  // Single comprehensive data fetch function
  const fetchAllData = useCallback(async () => {
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
      setIsLoading(true);
      setError(null);

      console.log("🔄 Starting comprehensive data fetch for user:", user?.id);

      // Fetch stats and jobs in parallel (but controlled)
      const API_BASE =
        (import.meta as any).env?.VITE_AI_SERVICE_URL ||
        "http://localhost:8000";
      const [statsResponse, jobsPrimaryResponse, jobsSecondaryResponse] =
        await Promise.allSettled([
          dashboardApi.getStats().catch((err) => {
            if (signal.aborted) throw new Error("Request aborted");
            throw err;
          }),
          fetch(`${API_BASE}/jobs`)
            .then((r) => r.json())
            .catch((err) => {
              if (signal.aborted) throw new Error("Request aborted");
              throw err;
            }),
          // Optional: alternate SpareFinder service URL
          fetch(
            `${
              (import.meta as any).env?.VITE_SPAREFINDER_SERVICE_URL || API_BASE
            }/jobs`
          )
            .then((r) => r.json())
            .catch((err) => {
              if (signal.aborted) throw new Error("Request aborted");
              // Do not rethrow to allow fallback
              return { success: false, results: [] } as any;
            }),
        ]);

      // Handle stats response
      if (statsResponse.status === "fulfilled" && statsResponse.value.success) {
        const data = statsResponse.value.data;
        setStats({
          totalUploads: data.totalUploads || 0,
          completed: data.successfulUploads || 0,
          avgConfidence: (data.avgConfidence || 0).toFixed(1),
          avgProcessingTime: `${data.avgProcessTime || 0}s`,
        });
      } else {
        console.warn("❌ Failed to fetch dashboard stats:", statsResponse);
        setStats({
          totalUploads: 0,
          completed: 0,
          avgConfidence: "0.0",
          avgProcessingTime: "0s",
        });
      }

      // Handle jobs response (merge all available jobs from both sources)
      console.log("🔍 Jobs API responses:", {
        primary: jobsPrimaryResponse.status,
        primarySuccess:
          jobsPrimaryResponse.status === "fulfilled"
            ? jobsPrimaryResponse.value?.success
            : false,
        primaryResults:
          jobsPrimaryResponse.status === "fulfilled"
            ? jobsPrimaryResponse.value?.results?.length
            : 0,
        secondary: jobsSecondaryResponse.status,
        secondarySuccess:
          jobsSecondaryResponse.status === "fulfilled"
            ? jobsSecondaryResponse.value?.success
            : false,
        secondaryResults:
          jobsSecondaryResponse.status === "fulfilled"
            ? jobsSecondaryResponse.value?.results?.length
            : 0,
      });

      const primaryJobs =
        jobsPrimaryResponse.status === "fulfilled" &&
        jobsPrimaryResponse.value?.success
          ? Array.isArray(jobsPrimaryResponse.value.results)
            ? jobsPrimaryResponse.value.results
            : []
          : [];
      const secondaryJobs =
        jobsSecondaryResponse.status === "fulfilled" &&
        jobsSecondaryResponse.value?.success
          ? Array.isArray(jobsSecondaryResponse.value.results)
            ? jobsSecondaryResponse.value.results
            : []
          : [];

      // Merge and de-duplicate by id or filename
      const mergedJobs = (() => {
        const seen = new Set<string>();
        const all = [...secondaryJobs, ...primaryJobs];
        const unique: any[] = [];
        for (const job of all) {
          const key = String(job?.id || job?.filename || "");
          if (!key) {
            unique.push(job);
            continue;
          }
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(job);
          }
        }
        return unique;
      })();

      console.log("🔄 Final merged jobs:", mergedJobs.length, "jobs");
      console.log(
        "📊 Job details:",
        mergedJobs.map((j) => ({
          id: j.id,
          mode: j.mode,
          status: j.status,
          success: j.success,
        }))
      );
      setpastAnalysis(mergedJobs);

      // Compute accurate stats from merged jobs (image analyses only)
      try {
        const imageJobs = (mergedJobs || []).filter(
          (j: any) => j.mode !== "keywords_only"
        );
        const total = imageJobs.length;
        const completed = imageJobs.filter(
          (j: any) =>
            String(j.status).toLowerCase() === "completed" || j.success === true
        ).length;
        const normConf = (v: any) =>
          typeof v === "number" ? (v <= 1 ? v * 100 : v) : null;
        const normSec = (t: any) =>
          typeof t === "number" ? (t > 100 ? t / 1000 : t) : null;
        const confs = imageJobs
          .map((j: any) => normConf(j.confidence_score ?? j.confidence))
          .filter((n: any): n is number => typeof n === "number");
        const times = imageJobs
          .map((j: any) =>
            normSec(j.processing_time_seconds ?? j.processing_time)
          )
          .filter((n: any): n is number => typeof n === "number");
        const avgConf = confs.length
          ? confs.reduce((a: number, b: number) => a + b, 0) / confs.length
          : 0;
        const avgTime = times.length
          ? times.reduce((a: number, b: number) => a + b, 0) / times.length
          : 0;
        setStats({
          totalUploads: total,
          completed,
          avgConfidence: avgConf.toFixed(1),
          avgProcessingTime: `${Math.round(avgTime)}s`,
        });
      } catch {}

      // Hydrate missing thumbnails by querying job status
      const hydrateImages = async () => {
        try {
          const API_BASE =
            (import.meta as any).env?.VITE_AI_SERVICE_URL ||
            "http://localhost:8000";
          const toFetch = (mergedJobs || []).filter(
            (j: any) => !j.image_url && (j.filename || j.id)
          );
          if (!toFetch.length) return;
          const results = await Promise.all(
            toFetch.map(async (j: any) => {
              try {
                const res = await fetch(
                  `${API_BASE}/analyze-part/status/${encodeURIComponent(
                    j.filename || j.id
                  )}`
                );
                const data = await res.json();
                return { id: j.id, url: data?.image_url } as {
                  id: string;
                  url?: string;
                };
              } catch {
                return { id: j.id, url: undefined } as {
                  id: string;
                  url?: string;
                };
              }
            })
          );
          setJobImages((prev) => {
            const copy = { ...prev };
            results.forEach((r) => (copy[r.id] = r.url || copy[r.id]));
            return copy;
          });
        } catch {
          // ignore – non-fatal UI enhancement
        }
      };
      hydrateImages();

      // Check if any request failed with auth error
      const authErrors = [statsResponse].filter(
        (response) =>
          response.status === "rejected" &&
          response.reason?.response?.status === 401
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

      console.log("✅ Data fetch completed successfully");
    } catch (error: any) {
      if (error.message === "Request aborted") {
        console.log("🔄 Request was aborted");
        return;
      }

      console.error("❌ Error in fetchAllData:", error);

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
      setError(error.message || "Failed to load data");
      toast({
        title: "Error",
        description: error.message || "Failed to load history data",
        variant: "destructive",
      });
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [hasValidToken, user?.id, toast, logout]);

  // Lightweight polling for statuses only (no page-level loading state)
  const pollJobStatuses = useCallback(async () => {
    try {
      const API_BASE =
        (import.meta as any).env?.VITE_AI_SERVICE_URL ||
        "http://localhost:8000";
      const res = await fetch(`${API_BASE}/jobs`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.results)) {
        const nextMap: Record<string, any> = {};
        const nextImages: Record<string, string | undefined> = {};
        for (const j of data.results) {
          const id = j.id || j.filename;
          if (!id) continue;
          nextMap[id] = {
            status: j.status,
            confidence_score:
              typeof j.confidence_score !== "undefined"
                ? j.confidence_score
                : typeof j.confidence !== "undefined"
                ? j.confidence
                : undefined,
            processing_time_seconds:
              typeof j.processing_time_seconds !== "undefined"
                ? j.processing_time_seconds
                : typeof j.processing_time !== "undefined"
                ? j.processing_time
                : undefined,
            precise_part_name: j.precise_part_name || j.class_name || undefined,
          };
          if (j.image_url) nextImages[id] = j.image_url as string;
        }
        setJobStatusMap((prev) => ({ ...prev, ...nextMap }));
        if (Object.keys(nextImages).length) {
          setJobImages((prev) => ({ ...prev, ...nextImages }));
        }

        // Update stats from current jobs (image-only)
        try {
          const imageJobs = data.results.filter(
            (j: any) => j.mode !== "keywords_only"
          );
          const total = imageJobs.length;
          const completed = imageJobs.filter(
            (j: any) =>
              String(j.status).toLowerCase() === "completed" ||
              j.success === true
          ).length;
          const normConf = (v: any) =>
            typeof v === "number" ? (v <= 1 ? v * 100 : v) : null;
          const normSec = (t: any) =>
            typeof t === "number" ? (t > 100 ? t / 1000 : t) : null;
          const confs = imageJobs
            .map((j: any) => normConf(j.confidence_score ?? j.confidence))
            .filter((n: any): n is number => typeof n === "number");
          const times = imageJobs
            .map((j: any) =>
              normSec(j.processing_time_seconds ?? j.processing_time)
            )
            .filter((n: any): n is number => typeof n === "number");
          const avgConf = confs.length
            ? confs.reduce((a: number, b: number) => a + b, 0) / confs.length
            : 0;
          const avgTime = times.length
            ? times.reduce((a: number, b: number) => a + b, 0) / times.length
            : 0;
          setStats({
            totalUploads: total,
            completed,
            avgConfidence: avgConf.toFixed(1),
            avgProcessingTime: `${Math.round(avgTime)}s`,
          });
        } catch {}
      }
    } catch {
      // ignore transient polling errors
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;
    const id = setInterval(pollJobStatuses, 5000);
    return () => clearInterval(id);
  }, [authLoading, isAuthenticated, user?.id, pollJobStatuses]);

  // Export history function
  const handleExportHistory = async () => {
    try {
      if (!hasValidToken()) {
        toast({
          title: "Authentication Required",
          description: "Please log in to export history",
          variant: "destructive",
        });
        return;
      }

      const response = await dashboardApi.exportHistory("csv");
      if (response.success) {
        toast({
          title: "Export Successful",
          description: "History exported successfully",
        });
      }
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Unable to export history",
        variant: "destructive",
      });
    }
  };

  // Helper: generate a simple PDF from JSON data
  const downloadPdfFromData = (data: any, baseName: string) => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const margin = 10;
      const usableWidth = doc.internal.pageSize.getWidth() - margin * 2;
      const usableHeight = doc.internal.pageSize.getHeight() - margin * 2;
      doc.setFontSize(14);
      doc.text("Part Analysis", margin, 16);
      doc.setFontSize(8);
      const text = JSON.stringify(data, null, 2);
      const lines = doc.splitTextToSize(text, usableWidth);
      let y = 24;
      const lineHeight = 4;
      for (const line of lines) {
        if (y > usableHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line as string, margin, y);
        y += lineHeight;
      }
      doc.save(`${baseName}.pdf`);
    } catch (e) {
      console.error("PDF generation failed", e);
    }
  };

  // Helper: fetch job details then save as PDF
  const handleDownloadAnalysisPdf = async (job: any) => {
    try {
      const API_BASE =
        (import.meta as any).env?.VITE_AI_SERVICE_URL ||
        "http://localhost:8000";
      const id = encodeURIComponent(job.filename || job.id);
      const res = await fetch(`${API_BASE}/analyze-part/status/${id}`);
      const data = await res.json();
      downloadPdfFromData(
        data,
        `analysis_${job.filename || job.id || "result"}`
      );
    } catch (e) {
      console.error("Download PDF error", e);
      toast({
        title: "Download failed",
        description: "Could not generate PDF for this analysis.",
        variant: "destructive",
      });
    }
  };

  // Delete analysis (AI service cleanup)
  const handleDeleteAnalysis = async (job: any) => {
    try {
      const API_BASE =
        (import.meta as any).env?.VITE_AI_SERVICE_URL ||
        "http://localhost:8000";
      const id = encodeURIComponent(job.filename || job.id);
      const res = await fetch(`${API_BASE}/analyze-part/cleanup/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Cleanup failed");
      setpastAnalysis((prev) => prev.filter((p: any) => p.id !== job.id));
      toast({ title: "Deleted", description: "Analysis removed." });
    } catch (e: any) {
      console.error("Delete analysis error", e);
      toast({
        title: "Deletion failed",
        description: e?.message || "Unable to delete analysis",
        variant: "destructive",
      });
    }
  };

  // Open delete dialogs
  const requestDeleteAnalysis = (job: any) => {
    setDeleteTarget({ kind: "analysis", job });
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (!deleteTarget) return;
      if (deleteTarget.kind === "analysis") {
        await handleDeleteAnalysis(deleteTarget.job);
      }
    } finally {
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  // View job -> open analysis modal
  const handleViewJob = async (job: any) => {
    try {
      setIsAnalysisLoading(true);
      setSelectedAnalysis(null);
      const API_BASE =
        (import.meta as any).env?.VITE_AI_SERVICE_URL ||
        "http://localhost:8000";
      const res = await fetch(
        `${API_BASE}/analyze-part/status/${encodeURIComponent(
          job.filename || job.id
        )}`
      );
      const data = await res.json();
      setSelectedAnalysis(data);
      setSelectedImageUrl(job.image_url || data.image_url);
      setIsAnalysisOpen(true);
    } catch (e: any) {
      console.error("View job error:", e);
      toast({
        title: "Unable to load analysis",
        description: e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  // Initialize data fetch - only run once when component mounts and user is authenticated
  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated &&
      user?.id &&
      !isInitializedRef.current
    ) {
      console.log("📊 Initializing History data fetch for user:", user.id);
      isInitializedRef.current = true;
      fetchAllData();
    }

    // Reset initialization flag when user changes
    if (!isAuthenticated || !user?.id) {
      isInitializedRef.current = false;
      setStats({
        totalUploads: 0,
        completed: 0,
        avgConfidence: "0.0",
        avgProcessingTime: "0s",
      });
      setError(null);
    }
  }, [isAuthenticated, user?.id, authLoading, fetchAllData]);

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

  // Show loading state (uniform skeleton)
  if (authLoading || isLoading) {
    return <DashboardSkeleton variant="user" showSidebar={!inLayout} />;
  }

  // Show error state
  if (error && !isLoading && !inLayout) {
    return (
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <DashboardSidebar
            isCollapsed={isCollapsed}
            onToggle={handleToggleSidebar}
          />
        </div>

        {/* Mobile Sidebar */}
        <MobileSidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        <motion.div
          initial={false}
          animate={{
            marginLeft: window.innerWidth >= 768 ? (isCollapsed ? 80 : 320) : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-1 p-3 md:p-4 lg:p-8 relative z-10"
        >
          <div className="space-y-4 md:space-y-6">
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardContent className="p-4 md:p-6">
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 md:w-12 md:h-12 text-red-500 mx-auto mb-3 md:mb-4" />
                  <h3 className="text-white text-base md:text-lg font-semibold mb-2">
                    Error Loading History
                  </h3>
                  <p className="text-gray-400 text-sm md:text-base mb-3 md:mb-4">
                    {error}
                  </p>
                  <Button onClick={fetchAllData} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-20 md:-top-40 -left-20 md:-left-40 w-40 h-40 md:w-80 md:h-80 bg-purple-600/30 rounded-full blur-3xl opacity-70"
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
          className="absolute top-1/2 -right-20 md:-right-40 w-48 h-48 md:w-96 md:h-96 bg-blue-600/20 rounded-full blur-3xl opacity-60"
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

      {/* Desktop Sidebar handled by layout */}

      {/* Mobile Menu Button handled by layout */}

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={{
          marginLeft: inLayout
            ? 0
            : window.innerWidth >= 768
            ? isCollapsed
              ? 80
              : 320
            : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-3 md:p-4 lg:p-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 md:space-y-6 lg:space-y-8"
        >
          {/* History Page Tour */}
          <OnboardingGuide
            storageKey="history_tour_seen_v1"
            showWelcome={false}
            steps={[
              {
                selector: "#tour-past-jobs-table",
                title: "Track progress here",
                description:
                  "This table shows your past and active jobs. Status updates in real time as the analysis runs.",
              },
            ]}
          />
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-2xl md:rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-6 border border-white/10">
              <div className="flex flex-col gap-3 md:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <motion.h1
                      className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-2 md:mb-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Upload History
                    </motion.h1>
                    <motion.p
                      className="text-gray-400 text-sm md:text-base lg:text-lg"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Track your part identification results and performance
                    </motion.p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex-shrink-0"
                  >
                    <Button
                      onClick={handleExportHistory}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 text-sm md:text-base"
                      size="sm"
                    >
                      <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      Export History
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
            {[
              {
                title: "Total Uploads",
                value: stats.totalUploads.toString(),
                icon: FileText,
                color: "from-purple-600 to-blue-600",
                bgColor: "from-purple-600/20 to-blue-600/20",
              },
              {
                title: "Completed",
                value: stats.completed.toString(),
                icon: CheckCircle,
                color: "from-green-600 to-emerald-600",
                bgColor: "from-green-600/20 to-emerald-600/20",
              },
              {
                title: "Avg Confidence",
                value: `${stats.avgConfidence}%`,
                icon: TrendingUp,
                color: "from-blue-600 to-cyan-600",
                bgColor: "from-blue-600/20 to-cyan-600/20",
              },
              {
                title: "Avg Processing",
                value: stats.avgProcessingTime,
                icon: Clock,
                color: "from-orange-600 to-red-600",
                bgColor: "from-orange-600/20 to-red-600/20",
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
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${stat.bgColor} rounded-xl md:rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity`}
                />
                <Card className="relative bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardContent className="p-3 md:p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-400 text-xs md:text-sm font-medium truncate">
                          {stat.title}
                        </p>
                        <p className="text-lg md:text-xl lg:text-2xl font-bold text-white mt-1 truncate">
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className={`p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-r ${stat.color} shadow-lg flex-shrink-0`}
                      >
                        <stat.icon className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Past Analysis - Tabbed (Images vs Keywords) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-cyan-600/10 rounded-2xl md:rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-white flex items-center space-x-2 text-base md:text-lg">
                  <Database className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                  <span>Past Analysis</span>
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs md:text-sm">
                  Completed and queued analyses from the AI service
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {pastAnalysis.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <Clock className="w-8 h-8 md:w-12 md:h-12 text-gray-600 mx-auto mb-3 md:mb-4" />
                    <p className="text-gray-400 text-sm md:text-base">
                      No jobs found
                    </p>
                    <p className="text-gray-500 text-xs md:text-sm mt-2">
                      New jobs will appear here after you upload.
                    </p>
                  </div>
                ) : (
                  <Tabs defaultValue="images" className="w-full">
                    <TabsList className="mb-4 bg-white/5 border border-white/10">
                      <TabsTrigger value="images">Image Analyses</TabsTrigger>
                      <TabsTrigger value="keywords">
                        Keyword Searches
                      </TabsTrigger>
                    </TabsList>

                    {/* Images Tab */}
                    <TabsContent value="images">
                      <div
                        id="tour-past-jobs-table"
                        className="overflow-x-auto"
                      >
                        <table className="min-w-full text-xs md:text-sm">
                          <thead>
                            <tr className="text-left text-gray-400">
                              <th className="py-3 pr-4 font-medium">Job ID</th>
                              <th className="py-3 pr-4 font-medium">Status</th>
                              <th className="py-3 pr-4 font-medium">Part</th>
                              <th className="py-3 pr-4 font-medium">
                                Confidence
                              </th>
                              <th className="py-3 pr-4 font-medium">
                                Time (s)
                              </th>
                              <th className="py-3 pr-4 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {(() => {
                              const imageJobs = pastAnalysis.filter(
                                (j: any) => j.mode !== "keywords_only"
                              );
                              console.log(
                                "🖼️ Image jobs filtered:",
                                imageJobs.length,
                                "out of",
                                pastAnalysis.length
                              );
                              return imageJobs;
                            })().map((j: any) => (
                              <tr
                                key={j.id}
                                className="text-gray-200 hover:bg-white/5 transition-colors"
                              >
                                <td className="py-3 pr-4 font-mono truncate max-w-[200px]">
                                  {j.id}
                                </td>
                                <td className="py-3 pr-4 capitalize">
                                  <span
                                    className={`px-2 py-1 rounded text-xs ${
                                      String(
                                        jobStatusMap[j.id]?.status ||
                                          j.status ||
                                          ""
                                      ).toLowerCase() === "completed"
                                        ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                                        : String(
                                            jobStatusMap[j.id]?.status ||
                                              j.status ||
                                              ""
                                          ).toLowerCase() === "failed"
                                        ? "bg-red-600/20 text-red-300 border border-red-500/30"
                                        : "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30"
                                    }`}
                                  >
                                    {jobStatusMap[j.id]?.status || j.status}
                                  </span>
                                </td>

                                <td className="py-3 pr-4">
                                  {jobStatusMap[j.id]?.precise_part_name ||
                                    j.precise_part_name ||
                                    j.class_name ||
                                    "-"}
                                </td>
                                <td className="py-3 pr-4">
                                  {typeof jobStatusMap[j.id]
                                    ?.confidence_score !== "undefined"
                                    ? jobStatusMap[j.id]?.confidence_score
                                    : j.confidence_score ?? "-"}
                                </td>
                                <td className="py-3 pr-4">
                                  {typeof jobStatusMap[j.id]
                                    ?.processing_time_seconds !== "undefined"
                                    ? jobStatusMap[j.id]
                                        ?.processing_time_seconds
                                    : j.processing_time_seconds ?? "-"}
                                </td>
                                <td className="py-3 pr-4">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => handleViewJob(j)}
                                    >
                                      {isAnalysisLoading
                                        ? "Loading..."
                                        : "View"}
                                    </Button>
                                    {j.success && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() =>
                                          handleDownloadAnalysisPdf(j)
                                        }
                                      >
                                        Download
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs text-red-300 hover:text-red-200"
                                      onClick={() => requestDeleteAnalysis(j)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>

                    {/* Keywords Tab */}
                    <TabsContent value="keywords">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs md:text-sm">
                          <thead>
                            <tr className="text-left text-gray-400">
                              <th className="py-3 pr-4 font-medium">Job ID</th>
                              <th className="py-3 pr-4 font-medium">
                                Keywords
                              </th>
                              <th className="py-3 pr-4 font-medium">
                                Top Result
                              </th>
                              <th className="py-3 pr-4 font-medium">Results</th>
                              <th className="py-3 pr-4 font-medium">Status</th>
                              <th className="py-3 pr-4 font-medium">
                                All Results
                              </th>
                              <th className="py-3 pr-4 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {pastAnalysis
                              .filter((j: any) => j.mode === "keywords_only")
                              .map((j: any) => {
                                const list = Array.isArray(j.results)
                                  ? j.results
                                  : [];
                                const top = list[0] || {};
                                const keys = Array.isArray(j.query?.keywords)
                                  ? j.query.keywords.join(", ")
                                  : "-";
                                return (
                                  <tr
                                    key={j.id}
                                    className="text-gray-200 hover:bg-white/5 transition-colors align-top"
                                  >
                                    <td className="py-3 pr-4 font-mono truncate max-w-[200px]">
                                      {j.id}
                                    </td>
                                    <td className="py-3 pr-4">{keys}</td>
                                    <td className="py-3 pr-4">
                                      {top.name ? (
                                        <div>
                                          <div className="font-medium">
                                            {top.name}
                                          </div>
                                          <div className="text-gray-400 text-[11px]">
                                            {top.manufacturer || "Unknown"} •{" "}
                                            {top.category || "Unspecified"}
                                          </div>
                                          {typeof top.price !== "undefined" && (
                                            <div className="text-gray-400 text-[11px]">
                                              Price: {String(top.price)}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                    <td className="py-3 pr-4">{list.length}</td>
                                    <td className="py-3 pr-4 capitalize">
                                      <span
                                        className={`px-2 py-1 rounded text-xs ${
                                          String(j.status).toLowerCase() ===
                                          "completed"
                                            ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                                            : String(j.status).toLowerCase() ===
                                              "failed"
                                            ? "bg-red-600/20 text-red-300 border border-red-500/30"
                                            : "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30"
                                        }`}
                                      >
                                        {j.status}
                                      </span>
                                    </td>
                                    <td className="py-3 pr-4">
                                      {list.length ? (
                                        <div className="max-h-32 overflow-auto pr-2">
                                          <ul className="list-disc pl-5 space-y-1">
                                            {list.map((r: any, idx: number) => (
                                              <li
                                                key={idx}
                                                className="text-gray-300"
                                              >
                                                <span className="font-medium">
                                                  {r.name || "Result"}
                                                </span>
                                                {" – "}
                                                <span className="text-gray-400 text-[11px]">
                                                  {r.manufacturer || "Unknown"}{" "}
                                                  •{" "}
                                                  {r.category || "Unspecified"}
                                                  {typeof r.price !==
                                                  "undefined"
                                                    ? ` • ${String(r.price)}`
                                                    : ""}
                                                  {r.part_number
                                                    ? ` • ${r.part_number}`
                                                    : ""}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                    <td className="py-3 pr-4">
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-xs"
                                          onClick={() => {
                                            setSelectedKeywordJob(j);
                                            setIsKeywordOpen(true);
                                          }}
                                        >
                                          View
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-xs"
                                          onClick={() =>
                                            downloadPdfFromData(
                                              j,
                                              `keyword_job_${j.id}`
                                            )
                                          }
                                        >
                                          Download
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </motion.div>
          {/* Past Jobs (duplicate) removed */}
          {/* Analysis Modal */}
          <PartAnalysisDisplayModal
            open={isAnalysisOpen}
            onOpenChange={setIsAnalysisOpen}
            analysisData={
              selectedAnalysis || {
                success: false,
                status: isAnalysisLoading ? "loading" : "idle",
              }
            }
            imagePreview={selectedImageUrl}
            title={
              selectedAnalysis?.precise_part_name ||
              selectedAnalysis?.class_name
            }
          />
          {/* Keyword results modal */}
          <Dialog open={isKeywordOpen} onOpenChange={setIsKeywordOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Keyword Results</DialogTitle>
                <DialogDescription>
                  {Array.isArray((selectedKeywordJob as any)?.query?.keywords)
                    ? `Keywords: ${(
                        selectedKeywordJob as any
                      ).query.keywords.join(", ")}`
                    : "Results from keyword-only search"}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-auto space-y-3">
                {Array.isArray((selectedKeywordJob as any)?.results) &&
                  (selectedKeywordJob as any).results.map(
                    (r: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="font-medium text-white">
                          {r.name || "Result"}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {(r.manufacturer || "Unknown") +
                            " • " +
                            (r.category || "Unspecified")}
                          {typeof r.price !== "undefined"
                            ? ` • ${String(r.price)}`
                            : ""}
                          {r.part_number ? ` • ${r.part_number}` : ""}
                        </div>
                      </div>
                    )
                  )}
                {!Array.isArray((selectedKeywordJob as any)?.results) && (
                  <div className="text-gray-400">No results available.</div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete confirmation modal */}
          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Analysis</DialogTitle>
                <DialogDescription>
                  This action will permanently remove the analysis and its
                  files. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={confirmDelete}
                >
                  Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default History;
