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
  Star,
  Image as ImageIcon,
  Calendar,
  Sparkles,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { dashboardApi, getAuthHeaders, uploadApi, api } from "@/lib/api";
import { PartAnalysisDisplayModal } from "@/components/PartAnalysisDisplay";
import { ReviewModal } from "@/components/ReviewModal";
import OnboardingGuide from "@/components/OnboardingGuide";
import { CrewAnalysisProgress } from "@/components/CrewAnalysisProgress";
import { AnalysisResultModal } from "@/components/AnalysisResultModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/client";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import { PageSkeleton } from "@/components/skeletons";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import jsPDF from "jspdf";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from "@/components/ui/pagination";

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
  const [loadingJobIds, setLoadingJobIds] = useState<Set<string>>(new Set());
  const [jobImages, setJobImages] = useState<
    Record<string, string | undefined>
  >({});
  const [jobStatusMap, setJobStatusMap] = useState<Record<string, any>>({});
  const [isKeywordOpen, setIsKeywordOpen] = useState(false);
  const [selectedKeywordJob, setSelectedKeywordJob] = useState<any | null>(
    null
  );
  const [isPolling, setIsPolling] = useState(false);
  const [loadingKeywordJobs, setLoadingKeywordJobs] = useState<Set<string>>(
    new Set()
  );
  const [lastPollTime, setLastPollTime] = useState(0);

  // Review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewJobId, setReviewJobId] = useState<string>("");
  const [reviewJobType, setReviewJobType] = useState<
    "image" | "keyword" | "both"
  >("image");
  const [reviewPartSearchId, setReviewPartSearchId] = useState<
    string | undefined
  >(undefined);
  const [currentViewedJob, setCurrentViewedJob] = useState<any>(null);

  // Image and Delete Dialog state
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [selectedImageJob, setSelectedImageJob] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<any | null>(null);

  // Deep Research Jobs state
  const [crewJobs, setCrewJobs] = useState<any[]>([]);
  const [isCrewJobOpen, setIsCrewJobOpen] = useState(false);
  const [selectedCrewJob, setSelectedCrewJob] = useState<any | null>(null);
  const [isAnalysisResultOpen, setIsAnalysisResultOpen] = useState(false);
  const [selectedAnalysisResult, setSelectedAnalysisResult] = useState<
    any | null
  >(null);
  const [crewJobToDelete, setCrewJobToDelete] = useState<any | null>(null);
  const [deleteCrewJobDialogOpen, setDeleteCrewJobDialogOpen] = useState(false);
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());

  // Create stable unique IDs for each crew job card, removing duplicates
  const uniqueCrewJobs = useMemo(() => {
    // First, deduplicate jobs by ID (keep first occurrence only)
    const uniqueJobsMap = new Map<string, any>();
    crewJobs.forEach((job) => {
      if (!uniqueJobsMap.has(job.id)) {
        uniqueJobsMap.set(job.id, job);
      }
    });

    // Convert back to array with unique keys
    return Array.from(uniqueJobsMap.values()).map((job) => ({
      ...job,
      _uniqueCardKey: job.id, // Use job ID directly since they're now unique
    }));
  }, [crewJobs]);

  // Pagination state
  const [imagePage, setImagePage] = useState(1);
  const [keywordPage, setKeywordPage] = useState(1);
  const pageSize = 10;

  // Row helpers
  const getConfidence = useCallback(
    (job: any): string | number => {
      const raw =
        jobStatusMap[job.id]?.confidence_score ??
        job?.confidence_score ??
        job?.confidence ??
        (Array.isArray(job?.predictions)
          ? job.predictions[0]?.confidence
          : undefined);
      if (typeof raw !== "number") return "-";
      const pct = raw <= 1 ? raw * 100 : raw;
      const rounded = Math.round(pct * 10) / 10;
      return Number.isFinite(rounded) ? rounded : "-";
    },
    [jobStatusMap]
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
    return isAuthenticated && !!user?.id;
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

      // Fetch stats and user's history in parallel (but controlled)
      const BACKEND_BASE =
        import.meta.env.VITE_API_URL || "http://localhost:4000";
      const [statsResponse, historyResponse, crewJobsResponse] =
        await Promise.allSettled([
          dashboardApi.getStats().catch((err) => {
            if (signal.aborted) throw new Error("Request aborted");
            throw err;
          }),
          // Fetch history using the updated API wrapper (aligned with backend routes)
          (async () => {
            try {
              const resp = await uploadApi.getHistory({ limit: 100 as any });
              return resp;
            } catch (e) {
              throw e;
            }
          })(),
          // Fetch Deep Research jobs
          (async () => {
            try {
              const resp = await api.upload.getCrewAnalysisJobs();
              return resp;
            } catch (e) {
              console.error("Failed to fetch crew jobs:", e);
              return { success: false, jobs: [] };
            }
          })(),
        ]);

      // Handle stats response
      if (statsResponse.status === "fulfilled" && statsResponse.value.success) {
        const data = statsResponse.value.data as any;
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

      // Handle history response
      console.log("🔍 History API response:", {
        status: historyResponse.status,
        success:
          historyResponse.status === "fulfilled" && historyResponse.value
            ? (historyResponse.value as any).success
            : false,
        results:
          historyResponse.status === "fulfilled" && historyResponse.value
            ? (historyResponse.value as any).uploads?.length ?? 0
            : 0,
      });

      if (historyResponse.status === "fulfilled" && historyResponse.value) {
        // History response is expected to contain an `uploads` array from backend
        const historyData = historyResponse.value as any;
        const userJobs: any[] = Array.isArray(historyData.uploads)
          ? historyData.uploads
          : [];

        console.log("🔄 User's history jobs:", userJobs.length, "jobs");
        console.log(
          "📊 Job details:",
          userJobs.map((j: any) => ({
            id: j.id,
            filename: j.image_name,
            status: j.analysis_status,
            success: j.is_match,
          }))
        );
        setpastAnalysis(userJobs);
      } else {
        console.warn("❌ Failed to fetch user history:", historyResponse);
        setpastAnalysis([]);
      }

      // Handle crew jobs response
      if (crewJobsResponse.status === "fulfilled" && crewJobsResponse.value) {
        const crewData = crewJobsResponse.value as any;
        const crewAnalysisJobs: any[] = Array.isArray(crewData.data)
          ? crewData.data
          : [];
        console.log("🤖 Deep Research jobs:", crewAnalysisJobs.length, "jobs");

        // Check for duplicate IDs
        const uniqueIds = new Set(crewAnalysisJobs.map((j: any) => j.id));
        if (uniqueIds.size !== crewAnalysisJobs.length) {
          console.warn(
            `⚠️ Found ${
              crewAnalysisJobs.length - uniqueIds.size
            } duplicate job(s) in crew jobs data`
          );
          console.log(
            "Duplicate IDs:",
            crewAnalysisJobs.map((j: any) => j.id)
          );
        }

        setCrewJobs(crewAnalysisJobs);
      } else {
        console.warn("❌ Failed to fetch crew jobs:", crewJobsResponse);
        setCrewJobs([]);
      }

      // Compute accurate stats from user's jobs (image analyses only)
      // Stats are now fetched from the backend API above (includes crew jobs)
      // No longer recalculating locally from pastAnalysis
      console.log("📊 Using stats from API");

      // Hydrate missing thumbnails by querying job status
      const hydrateImages = async () => {
        try {
          const API_BASE =
            (import.meta as any).env?.VITE_AI_SERVICE_URL ||
            "https://aiagent-sparefinder-org.onrender.com";
          // Only fetch from AI service if image_url is missing
          // Images are already stored in Supabase Storage
          const toFetch = (pastAnalysis || []).filter(
            (j: any) => !j.image_url && (j.image_name || j.id)
          );

          const alreadyHaveImages = (pastAnalysis || []).filter(
            (j: any) => j.image_url
          ).length;
          if (alreadyHaveImages > 0) {
            console.log(
              `✅ ${alreadyHaveImages} jobs already have images from Supabase Storage`
            );
          }

          if (!toFetch.length) {
            if (alreadyHaveImages > 0) {
              console.log(
                `🎉 All ${
                  pastAnalysis?.length || 0
                } job images are ready for display`
              );
            }
            return;
          }

          // First check if AI service is available
          try {
            const healthRes = await fetch(`${API_BASE}/health`, {
              method: "GET",
              signal: AbortSignal.timeout(3000),
            });
            if (!healthRes.ok) {
              console.log(
                `❌ AI service health check failed: ${healthRes.status}`
              );
              return; // Skip image fetching if service is down
            }
            console.log(`✅ AI service is healthy`);
          } catch (healthError) {
            console.log(`❌ AI service health check failed:`, healthError);
            return; // Skip image fetching if service is unreachable
          }

          console.log(
            `🖼️ Attempting to fetch images for ${toFetch.length} jobs`
          );

          // Batch fetch images to avoid overwhelming the server
          const BATCH_SIZE = 10;
          const BATCH_DELAY = 500; // ms between batches
          const results: Array<{ id: string; url?: string; error?: string }> =
            [];

          for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
            const batch = toFetch.slice(i, i + BATCH_SIZE);
            console.log(
              `📦 Processing batch ${
                Math.floor(i / BATCH_SIZE) + 1
              }/${Math.ceil(toFetch.length / BATCH_SIZE)} (${
                batch.length
              } jobs)`
            );

            const batchResults = await Promise.all(
              batch.map(async (j: any) => {
                try {
                  const filename = j.image_name || j.id;

                  const res = await fetch(
                    `${API_BASE}/analyze-part/status/${encodeURIComponent(
                      filename
                    )}`,
                    {
                      method: "GET",
                      headers: {
                        Accept: "application/json",
                      },
                      // Increase timeout to 30 seconds for slow AI service
                      signal: AbortSignal.timeout(30000),
                    }
                  );

                  if (!res.ok) {
                    return {
                      id: j.id,
                      url: undefined,
                      error:
                        res.status === 404
                          ? "not_found"
                          : `${res.status} ${res.statusText}`,
                    };
                  }

                  const data = await res.json();

                  return {
                    id: j.id,
                    url: data?.image_url,
                    error: undefined,
                  } as {
                    id: string;
                    url?: string;
                    error?: string;
                  };
                } catch (error: any) {
                  return {
                    id: j.id,
                    url: undefined,
                    error: error.message,
                  } as {
                    id: string;
                    url?: string;
                    error?: string;
                  };
                }
              })
            );

            results.push(...batchResults);

            // Log batch results
            const batchSuccess = batchResults.filter((r) => r.url).length;
            const batch404 = batchResults.filter(
              (r) => r.error === "not_found"
            ).length;

            if (batchSuccess > 0) {
              console.log(
                `✅ Batch complete: ${batchSuccess}/${batch.length} images loaded`
              );
            } else if (batch404 === batch.length) {
              console.log(
                `ℹ️ Batch ${Math.floor(i / BATCH_SIZE) + 1}: All ${
                  batch.length
                } images not found in storage`
              );
            }

            // Delay between batches (except for the last one)
            if (i + BATCH_SIZE < toFetch.length) {
              await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
            }
          }

          // Log final results summary
          const successful = results.filter((r) => r.url).length;
          const notFound = results.filter(
            (r) => r.error === "not_found"
          ).length;
          const otherErrors = results.filter(
            (r) => r.error && r.error !== "not_found"
          ).length;

          if (successful > 0) {
            console.log(`✅ ${successful} images loaded successfully`);
          }
          if (notFound > 0) {
            console.log(
              `ℹ️ ${notFound} images not found (original uploads may be missing from AI service)`
            );
          }
          if (otherErrors > 0) {
            console.log(`❌ ${otherErrors} images failed with errors`);
          }

          setJobImages((prev) => {
            const copy = { ...prev };
            results.forEach((r) => {
              if (r.url) {
                copy[r.id] = r.url;
              }
            });
            return copy;
          });
        } catch (error) {
          console.error("Failed to hydrate images:", error);
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

  // Real-time polling for job statuses and data updates
  const pollJobStatuses = useCallback(async () => {
    try {
      // Prevent duplicate requests within 1 second
      const now = Date.now();
      if (now - lastPollTime < 1000) {
        console.log("🔄 Skipping duplicate poll request");
        return;
      }
      setLastPollTime(now);

      setIsPolling(true);
      // Use backend endpoint instead of AI service to ensure user filtering
      const historyData = await uploadApi.getHistory({ limit: 100 });
      // Normalize response shape for robust polling
      if (historyData?.success) {
        // Support both possible shapes from backend: { searches: [...] } and { uploads: [...] }
        const potentialSearches =
          (historyData as any).searches ?? (historyData as any).uploads ?? [];
        let searches: any[] = [];
        if (Array.isArray(potentialSearches)) {
          searches = potentialSearches;
        }
        // Polling: Updating jobs data (logging disabled to reduce console clutter)

        // Helper to determine if a job is still processing
        const isJobInProgress = (item: any) => {
          const st = String(
            item?.analysis_status ?? item?.status ?? ""
          ).toLowerCase();
          return st === "processing" || st === "pending";
        };

        // Check for stuck jobs (processing for more than 5 minutes)
        const now = Date.now();
        const stuckJobs = searches.filter((job: any) => {
          if (!isJobInProgress(job)) return false;
          const createdAt = new Date(
            job.created_at || job.updated_at
          ).getTime();
          const ageMinutes = (now - createdAt) / (1000 * 60);
          return ageMinutes > 5; // More than 5 minutes old
        });

        if (stuckJobs.length > 0) {
          console.warn(
            `Found ${stuckJobs.length} stuck job(s) - automatically marking as failed`
          );
          // Mark stuck jobs as failed
          const updatedJobs = searches.map((job: any) => {
            if (stuckJobs.some((stuck: any) => stuck.id === job.id)) {
              return {
                ...job,
                analysis_status: "failed",
                success: false,
                error: "Job timed out - processing took too long",
              };
            }
            return job;
          });
          setpastAnalysis(updatedJobs);
        } else {
          // Update the main jobs data for real-time display
          setpastAnalysis(searches);
        }

        const nextMap: Record<string, any> = {};
        const nextImages: Record<string, string | undefined> = {};
        for (const j of searches) {
          const id = j.id || j.image_name;
          if (!id) continue;
          // Normalize status from either field
          const statusFromDb = String(
            j?.analysis_status ?? j?.status ?? ""
          ).toLowerCase();
          nextMap[id] = {
            status: statusFromDb,
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
            precise_part_name:
              j.precise_part_name || j.part_name || j.class_name || undefined,
          };
          if (j.image_url) nextImages[id] = j.image_url as string;
        }
        setJobStatusMap((prev) => ({ ...prev, ...nextMap }));
        if (Object.keys(nextImages).length) {
          setJobImages((prev) => ({ ...prev, ...nextImages }));
        }

        // Update stats from current jobs (image-only)
        try {
          const imageJobs = searches.filter(
            (j: any) => j.mode !== "keywords_only" && j.image_name
          );
          const total = imageJobs.length;
          const completed = imageJobs.filter(
            (j: any) =>
              String(j.analysis_status || j.status).toLowerCase() ===
                "completed" || j.success === true
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
          // Stats are now from API, not recalculated locally
          // setStats({
          //   totalUploads: total,
          //   completed,
          //   avgConfidence: avgConf.toFixed(1),
          //   avgProcessingTime: `${Math.round(avgTime)}s`,
          // });
        } catch {}
      }
    } catch (error) {
      console.log("❌ Polling error:", error);
      // ignore transient polling errors
    } finally {
      setIsPolling(false);
    }
  }, [lastPollTime]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;
    const id = setInterval(pollJobStatuses, 5000); // Poll every 5 seconds for real-time updates
    return () => clearInterval(id);
  }, [authLoading, isAuthenticated, user?.id, pollJobStatuses]);

  // Intelligent polling with exponential backoff for processing jobs
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;

    const hasProcessingJobs = pastAnalysis.some(
      (job: any) => job.status === "processing" || job.status === "pending"
    );

    if (hasProcessingJobs) {
      console.log("🔄 Processing jobs detected, starting intelligent polling");

      let pollCount = 0;
      const maxPolls = 20; // Maximum 20 polls before giving up

      const intelligentPoll = () => {
        pollCount++;

        // Exponential backoff: 2s, 4s, 8s, 16s, then 30s intervals
        let nextInterval = 2000;
        if (pollCount > 1)
          nextInterval = Math.min(2000 * Math.pow(2, pollCount - 1), 30000);

        // Polling attempt logged (disabled to reduce console clutter)

        pollJobStatuses()
          .then(() => {
            // Check if still have processing jobs after this poll
            const stillProcessing = pastAnalysis.some(
              (job: any) =>
                job.status === "processing" || job.status === "pending"
            );

            if (stillProcessing && pollCount < maxPolls) {
              setTimeout(intelligentPoll, nextInterval);
            } else if (pollCount >= maxPolls) {
              console.log(
                "⏰ Max polling attempts reached, switching to standard polling"
              );
            }
          })
          .catch((error) => {
            console.error("❌ Polling error:", error);
            // On error, wait longer before retrying
            if (pollCount < maxPolls) {
              setTimeout(intelligentPoll, Math.min(nextInterval * 2, 60000));
            }
          });
      };

      // Start intelligent polling
      intelligentPoll();
    }
  }, [authLoading, isAuthenticated, user?.id, pollJobStatuses, pastAnalysis]);

  // Export history function (downloads CSV file)
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

      const apiBaseUrl =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        "http://localhost:4000";

      const response = await fetch(
        `${apiBaseUrl}/api/history/export?format=csv`,
        {
          method: "GET",
          headers: await getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to export history: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "upload_history.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

        toast({
          title: "Export Successful",
        description: "Your history CSV is being downloaded.",
        });
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
        "https://aiagent-sparefinder-org.onrender.com";
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

  // Delete analysis (backend API)
  const handleDeleteAnalysis = async (job: any) => {
    try {
      const uploadId = job.id;
      if (!uploadId) {
        throw new Error("Invalid job ID");
      }

      await uploadApi.deleteUpload(uploadId);
      setpastAnalysis((prev) => prev.filter((p: any) => p.id !== uploadId));
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
    const jobId = job.id;
    try {
      setCurrentViewedJob(job); // Store the current job being viewed

      // Check if we already have the full analysis data
      const existingData = jobStatusMap[jobId] || job;
      const status = String(existingData?.status || "").toLowerCase();

      // If job is completed and we have the data, show it immediately
      if (status === "completed" && existingData) {
        console.log("✅ Using cached analysis data for", jobId);
        setSelectedImageJob(existingData);
        setIsImageOpen(true);
        return;
      }

      // Otherwise, fetch from AI service
      setLoadingJobIds((prev) => new Set(prev).add(jobId));
      setIsAnalysisLoading(true);
      setSelectedAnalysis(null);

      const API_BASE =
        (import.meta as any).env?.VITE_AI_SERVICE_URL ||
        "https://aiagent-sparefinder-org.onrender.com";
      const res = await fetch(
        `${API_BASE}/analyze-part/status/${encodeURIComponent(
          job.filename || job.id
        )}`,
        {
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch analysis: ${res.status}`);
      }

      const data = await res.json();
      setSelectedImageJob(data);
      setIsImageOpen(true);
    } catch (e: any) {
      console.error("View job error:", e);
      toast({
        title: "Unable to load analysis",
        description: e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      // Remove this job ID from loading set
      setLoadingJobIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
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
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, authLoading, fetchAllData]);

  // Real-time Supabase subscription for Deep Research jobs
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("crew_jobs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crew_analysis_jobs",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("📡 Crew job update received:", payload);

          if (payload.eventType === "INSERT") {
            setCrewJobs((prev) => {
              // Prevent duplicate insertions
              const existingJob = prev.find((job) => job.id === payload.new.id);
              if (existingJob) {
                console.log(
                  "⚠️ Job already exists, skipping INSERT:",
                  payload.new.id
                );
                return prev;
              }
              return [payload.new as any, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setCrewJobs((prev) =>
              prev.map((job) =>
                job.id === payload.new.id ? (payload.new as any) : job
              )
            );
          } else if (payload.eventType === "DELETE") {
            setCrewJobs((prev) =>
              prev.filter((job) => job.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Real-time subscription active");
          setIsPolling(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsPolling(false);
    };
  }, [user?.id]);

  // Poll for crew job updates when there are active jobs
  useEffect(() => {
    if (!user?.id || crewJobs.length === 0) return;

    // Check if there are any jobs that aren't completed
    const hasActiveJobs = crewJobs.some(
      (job) => job.status === "processing" || job.status === "pending"
    );

    if (!hasActiveJobs) return;

    // Poll every 3 seconds for active jobs
    const pollInterval = setInterval(async () => {
      try {
        const resp = await api.upload.getCrewAnalysisJobs();
        if (resp && (resp as any).data) {
          setCrewJobs((resp as any).data);
        }
      } catch (error) {
        console.error("Failed to poll crew jobs:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [user?.id, crewJobs]);

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

  // Handle view crew job analysis
  const handleViewCrewAnalysis = (job: any) => {
    setSelectedAnalysisResult(job);
    setIsAnalysisResultOpen(true);
  };

  // Handle delete crew job
  const handleDeleteCrewJob = (job: any) => {
    setCrewJobToDelete(job);
    setDeleteCrewJobDialogOpen(true);
  };

  // Confirm delete crew job
  const confirmDeleteCrewJob = async () => {
    if (!crewJobToDelete) return;

    try {
      const response = await api.upload.deleteCrewAnalysisJob(
        crewJobToDelete.id
      );

      if (response.success) {
        toast({
          title: "Success",
          description: "Analysis deleted successfully",
        });

        // Remove from local state (real-time will also update)
        setCrewJobs((prev) =>
          prev.filter((job) => job.id !== crewJobToDelete.id)
        );
      } else {
        throw new Error(response.message || "Failed to delete");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete analysis",
        variant: "destructive",
      });
    } finally {
      setDeleteCrewJobDialogOpen(false);
      setCrewJobToDelete(null);
    }
  };

  // Handle download PDF
  const handleDownloadPDF = async (pdfUrl: string) => {
    try {
      // Extract filename from URL
      const filename = pdfUrl.split("/").pop() || "report.pdf";

      // Get API base URL
      const apiBaseUrl =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        "http://localhost:4000";

      // Fetch PDF as blob to avoid browser security warnings
      const response = await fetch(`${apiBaseUrl}/api/reports/pdf/${filename}`, {
        method: "GET",
        headers: await getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

      toast({
        title: "Download Started",
        description: "Your PDF report is being downloaded.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle create shareable link
  const handleCreateShareLink = async (jobId: string) => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:4000"
        }/api/reports/share/${jobId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user?.id || "",
          },
          body: JSON.stringify({ userId: user?.id }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create shareable link");
      }

      const data = await response.json();

      // Copy to clipboard
      await navigator.clipboard.writeText(data.shareUrl);

      // Open in new tab
      window.open(data.shareUrl, "_blank");

      toast({
        title: "Shareable Link Created!",
        description: "Link copied to clipboard and opened in new tab.",
      });
    } catch (error) {
      console.error("Share error:", error);
      toast({
        title: "Failed to Create Link",
        description: "Could not create shareable link. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Toggle expanded state for a specific card using unique card identifier
  const toggleJobExpanded = (cardKey: string) => {
    if (!cardKey) {
      console.warn("Cannot toggle expansion for card with undefined key");
      return;
    }

    setExpandedJobIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardKey)) {
        newSet.delete(cardKey);
      } else {
        newSet.add(cardKey);
      }
      return newSet;
    });
  };

  // Show loading state (page-structured skeleton)
  if (authLoading || isLoading) {
    return (
      <PageSkeleton
        variant="history"
        showSidebar={!inLayout}
        showHeader={false}
      />
    );
  }

  // Show error state
  if (error && !isLoading && !inLayout) {
    return (
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 relative overflow-hidden">
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
          className="relative z-10 flex-1 p-3 md:p-4 lg:p-8"
        >
          <div className="space-y-4 md:space-y-6">
            <Card className="border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
              <CardContent className="p-4 md:p-6">
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 md:w-12 md:h-12 text-red-500 mx-auto mb-3 md:mb-4" />
                  <h3 className="mb-2 text-base font-semibold text-foreground md:text-lg dark:text-white">
                    Error Loading History
                  </h3>
                  <p className="mb-3 text-sm text-muted-foreground md:text-base md:mb-4 dark:text-gray-400">
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
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements (dark mode only to avoid blue tint in light theme) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden dark:block">
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
            <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-r from-[#3A5AFE0A] via-[#8B5CF60A] to-transparent blur-xl opacity-80 dark:from-purple-600/10 dark:to-blue-600/10" />
            <div className="relative rounded-2xl md:rounded-3xl border border-border bg-card shadow-soft-elevated backdrop-blur-xl dark:bg-black/30 dark:border-white/10">
              <div className="flex flex-col gap-3 md:gap-4 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <motion.h1
                      className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground dark:bg-gradient-to-r dark:from-white dark:via-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent mb-2 md:mb-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Upload History
                    </motion.h1>
                    <motion.p
                      className="text-sm md:text-base lg:text-lg text-muted-foreground"
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
                <Card className="relative border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl transition-all duration-300 hover:border-[#C7D2FE] dark:bg-black/40 dark:border-white/10 dark:hover:border-white/20">
                  <CardContent className="p-3 md:p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground md:text-sm truncate dark:text-gray-400">
                          {stat.title}
                        </p>
                        <p className="mt-1 text-lg font-bold text-foreground md:text-xl lg:text-2xl truncate dark:text-white">
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

          {/* History - Tabbed (Images vs Keywords) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-cyan-600/10 rounded-2xl md:rounded-3xl blur-xl opacity-60" />
            <Card className="relative border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
              <CardHeader className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-base md:text-lg text-foreground dark:text-white">
                    <Database className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                    <span>History</span>
                    {isPolling && (
                      <div className="flex items-center space-x-1 text-xs text-emerald-500">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                        <span>Live</span>
                      </div>
                    )}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Force refresh jobs data
                      pollJobStatuses();
                    }}
                    className="text-xs border-border bg-transparent text-muted-foreground hover:bg-muted dark:border-white/20 dark:text-gray-200 dark:hover:bg-white/10"
                  >
                    <Activity className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>
                <CardDescription className="text-xs text-muted-foreground md:text-sm dark:text-gray-400">
                  Completed and queued analyses from the AI service
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {uniqueCrewJobs.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <Sparkles className="mx-auto mb-3 h-8 w-8 text-purple-400/70 md:mb-4 md:h-12 md:w-12" />
                    <p className="text-sm text-muted-foreground md:text-base dark:text-gray-400">
                      No Deep Research jobs yet
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground/80 md:text-sm dark:text-gray-500">
                      Start a comprehensive SpareFinder AI Research from the
                      upload page
                    </p>
                  </div>
                ) : (
                  <div className="w-full">
                    {/* Deep Research Jobs Grid */}
                    <div
                      id="tour-past-jobs-table"
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                      {uniqueCrewJobs
                        .sort(
                          (a: any, b: any) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                        )
                        .map((job: any) => {
                          // Use the stable unique key pre-assigned in useMemo
                          const cardUniqueKey = job._uniqueCardKey;

                          return (
                            <motion.div
                              key={cardUniqueKey}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="group"
                            >
                              <Card className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 backdrop-blur-xl border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 overflow-hidden h-full">
                                <CardContent className="p-0">
                                  {/* Image/Icon Header */}
                                  <div className="relative h-32 bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center overflow-hidden">
                                    {job.image_url ? (
                                      <img
                                        src={job.image_url}
                                        alt="Part"
                                        className={`w-full h-full object-cover ${
                                          job.status !== "completed"
                                            ? "opacity-50 blur-sm"
                                            : ""
                                        }`}
                                      />
                                    ) : (
                                      <Sparkles className="w-16 h-16 text-purple-400/50" />
                                    )}

                                    {/* Status Badge */}
                                    <div className="absolute top-2 right-2">
                                      <Badge
                                        className={`${
                                          job.status === "completed"
                                            ? "bg-emerald-600/90 text-white border-emerald-500/50"
                                            : job.status === "failed"
                                            ? "bg-red-600/90 text-white border-red-500/50"
                                            : "bg-yellow-600/90 text-white border-yellow-500/50 animate-pulse"
                                        } backdrop-blur-sm`}
                                      >
                                        {job.status === "completed" && (
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                        )}
                                        {job.status === "failed" && (
                                          <AlertTriangle className="w-3 h-3 mr-1" />
                                        )}
                                        {job.status !== "completed" &&
                                          job.status !== "failed" && (
                                            <Activity className="w-3 h-3 mr-1 animate-spin" />
                                          )}
                                        {job.status}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Content */}
                                  <div className="p-4 space-y-3">
                                    {/* Job Info */}
                                    <div>
                                      <h3 className="font-semibold text-foreground line-clamp-1 transition-colors group-hover:text-[#7C3AED] dark:text-white">
                                        {job.status === "completed"
                                          ? "✅ SpareFinder AI Research"
                                          : job.status === "failed"
                                          ? "❌ Analysis Failed"
                                          : "🤖SpareFinder research Ongoing..."}
                                      </h3>
                                      <p className="mt-1 text-xs font-mono text-muted-foreground truncate dark:text-gray-400">
                                        ID: {job.id?.slice(0, 8)}...
                                      </p>
                                    </div>

                                    {/* Progress Display */}
                                    {job.status !== "completed" &&
                                      job.status !== "failed" &&
                                      job.id && (
                                        <CrewAnalysisProgress
                                          key={`progress-${cardUniqueKey}`}
                                          status={job.status}
                                          currentStage={job.current_stage}
                                          progress={job.progress || 0}
                                          errorMessage={job.error_message}
                                          compact={true}
                                          isExpanded={expandedJobIds.has(
                                            cardUniqueKey
                                          )}
                                          onToggleExpanded={() =>
                                            toggleJobExpanded(cardUniqueKey)
                                          }
                                        />
                                      )}

                                    {/* Timestamp */}
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <Clock className="h-4 w-4 text-[#3B82F6]" />
                                      <span className="text-muted-foreground dark:text-gray-300">
                                        {new Date(
                                          job.created_at
                                        ).toLocaleString()}
                                      </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-2">
                                      {job.status === "completed" && (
                                        <>
                                          <Button
                                            size="sm"
                                            onClick={() =>
                                              handleViewCrewAnalysis(job)
                                            }
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                          >
                                            <Eye className="w-3 h-3 mr-1" />
                                            View
                                          </Button>
                                          {job.pdf_url && (
                                            <Button
                                              size="sm"
                                              onClick={() =>
                                                handleDownloadPDF(job.pdf_url)
                                              }
                                              variant="outline"
                                              className="border-purple-500/50 hover:bg-purple-500/20"
                                            >
                                              <Download className="w-3 h-3" />
                                            </Button>
                                          )}
                                        </>
                                      )}
                                      {job.status === "failed" && (
                                        <div className="flex-1 text-xs text-red-400 p-2 bg-red-900/20 rounded">
                                          {job.error_message ||
                                            "Analysis failed"}
                                        </div>
                                      )}
                                      <Button
                                        size="sm"
                                        onClick={() => handleDeleteCrewJob(job)}
                                        variant="outline"
                                        className="border-red-500/50 hover:bg-red-500/20 px-2"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Delete Analysis
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to delete this analysis? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  className="border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Display Modals */}
          <PartAnalysisDisplayModal
            open={isImageOpen}
            onOpenChange={(open) => {
              setIsImageOpen(open);
              if (!open && currentViewedJob) {
                const jobId = currentViewedJob.id;
                if (jobId) {
                  setReviewJobId(jobId);
                  setReviewJobType(currentViewedJob.mode || "image");
                  setReviewPartSearchId(currentViewedJob.part_search_id);
                  setIsReviewModalOpen(true);
                }
                setCurrentViewedJob(null);
              }
            }}
            analysisData={selectedImageJob}
          />

          <PartAnalysisDisplayModal
            open={isKeywordOpen}
            onOpenChange={setIsKeywordOpen}
            analysisData={selectedKeywordJob}
          />

          <ReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            jobId={reviewJobId}
            jobType={reviewJobType}
            partSearchId={reviewPartSearchId}
          />

          {/* Analysis Result Modal */}
          <AnalysisResultModal
            isOpen={isAnalysisResultOpen}
            onClose={() => {
              setIsAnalysisResultOpen(false);

              // Open review modal after closing analysis modal
              if (selectedAnalysisResult) {
                setReviewJobId(selectedAnalysisResult.id);

                // Determine job type based on keywords and image
                if (
                  selectedAnalysisResult.keywords &&
                  selectedAnalysisResult.image_url
                ) {
                  setReviewJobType("both");
                } else if (selectedAnalysisResult.keywords) {
                  setReviewJobType("keyword");
                } else {
                  setReviewJobType("image");
                }

                // Set part search ID if available (for legacy compatibility)
                setReviewPartSearchId(selectedAnalysisResult.part_search_id);

                // Open review modal
                setIsReviewModalOpen(true);
              }

              setSelectedAnalysisResult(null);
            }}
            analysis={selectedAnalysisResult}
            onDownloadPDF={() => {
              if (selectedAnalysisResult?.pdf_url) {
                handleDownloadPDF(selectedAnalysisResult.pdf_url);
              }
            }}
            onShare={() => {
              if (selectedAnalysisResult?.id) {
                handleCreateShareLink(selectedAnalysisResult.id);
              }
            }}
          />

          {/* Delete Crew Job Confirmation Dialog */}
          <Dialog
            open={deleteCrewJobDialogOpen}
            onOpenChange={setDeleteCrewJobDialogOpen}
          >
            <DialogContent className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Delete Deep Research
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to delete this Deep Research? This
                  action cannot be undone and will permanently delete the
                  analysis results.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteCrewJobDialogOpen(false)}
                  className="border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteCrewJob}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default History;
