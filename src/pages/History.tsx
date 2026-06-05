import React, {
  useState,
  useEffect,
  useLayoutEffect,
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
import { API_BASE_URL } from "@/lib/config";
import { PartAnalysisDisplayModal } from "@/components/PartAnalysisDisplay";
import { ReviewModal } from "@/components/ReviewModal";
import OnboardingGuide from "@/components/OnboardingGuide";
import { CrewAnalysisProgress } from "@/components/CrewAnalysisProgress";
import { getCrewJobDisplayName, getStageDisplayName } from "@/services/aiAnalysisCrew";
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
import { useLocation } from "react-router-dom";

import {
  readCrewJobsCache,
  writeCrewJobsCache,
} from "@/lib/crew-jobs-cache";

const HISTORY_PATH = "/dashboard/history";

const OPTIMISTIC_JOB_GRACE_MS = 3 * 60 * 1000;

function prependCrewJob(jobs: any[], job: any): any[] {
  if (!job?.id) return jobs;
  const row = { ...job, _uniqueCardKey: job.id };
  return [row, ...jobs.filter((j) => j.id !== job.id)];
}

/** API list is source of truth; keep short-lived optimistic rows not yet in the API. */
function mergeCrewJobsFromApi(prev: any[], fromApi: any[]): any[] {
  const fromApiMapped = (fromApi || []).map((j) => ({
    ...j,
    _uniqueCardKey: j.id,
  }));
  if (fromApiMapped.length === 0) return prev;

  const apiById = new Map(fromApiMapped.map((j) => [j.id, j]));
  const now = Date.now();
  const keepOptimistic = prev.filter((j) => {
    const isOptimistic =
      j._optimistic || String(j.id || "").startsWith("pending-");
    if (!isOptimistic || apiById.has(j.id)) return false;
    const created = j.created_at ? new Date(j.created_at).getTime() : now;
    return now - created < OPTIMISTIC_JOB_GRACE_MS;
  });

  return [...fromApiMapped, ...keepOptimistic].sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
  );
}

function crewJobsHaveActive(jobs: any[]): boolean {
  return jobs.some(
    (j) => j.status === "processing" || j.status === "pending"
  );
}

function parseCrewJobsFromResponse(resp: unknown): any[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (typeof resp !== "object") return [];
  const payload = resp as Record<string, unknown>;
  if (Array.isArray(payload.data)) return payload.data as any[];
  if (Array.isArray(payload.jobs)) return payload.jobs as any[];
  return [];
}

const History = () => {
  const location = useLocation();
  const { inLayout } = useDashboardLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();

  const [pastAnalysis, setpastAnalysis] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9, // 3 rows × 3 columns = 9 items per page
    total: 0,
    hasMore: false,
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

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

  // SpareFinder Research Jobs state
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

  // Filter jobs based on search query
  const filteredCrewJobs = useMemo(() => {
    if (!searchQuery.trim()) {
      return uniqueCrewJobs;
    }

    const query = searchQuery.toLowerCase();
    return uniqueCrewJobs.filter((job: any) => {
      const keywords = (job.keywords || "").toLowerCase();
      const imageName = (job.image_name || "").toLowerCase();
      const status = (job.status || "").toLowerCase();
      const id = (job.id || "").toLowerCase();
      
      return (
        keywords.includes(query) ||
        imageName.includes(query) ||
        status.includes(query) ||
        id.includes(query)
      );
    });
  }, [uniqueCrewJobs, searchQuery]);

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
  // When options.background is true (e.g. after redirect with new job), don't show full-page loading so the page doesn't freeze
  const FETCH_TIMEOUT_MS = 12000;
  const fetchAllData = useCallback(async (options?: { background?: boolean }) => {
    const background = options?.background === true;

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

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      isFetchingRef.current = true;
      if (!background) {
        setIsLoading(true);
      }
      setError(null);

      // Prevent indefinite freeze: stop loading after timeout (backend may be busy with analysis)
      if (!background) {
        timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort();
          setIsLoading(false);
        }, FETCH_TIMEOUT_MS);
      } else {
        // Background fetch: still abort after 20s so we don't hang; stats/history will retry via delayed full fetch
        timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 20000);
      }
      // Fetch stats and user's history in parallel (but controlled)
      const BACKEND_BASE = API_BASE_URL;
      const [historyResponse, crewJobsResponse] =
        await Promise.allSettled([
          // Fetch history using the updated API wrapper (aligned with backend routes)
          (async () => {
            try {
              const resp = await uploadApi.getHistory({ 
                page: pagination.page,
                limit: pagination.limit 
              });
              return resp;
            } catch (e) {
              throw e;
            }
          })(),
          // Fetch SpareFinder Research jobs
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

      // Handle history response
      if (historyResponse.status === "fulfilled" && historyResponse.value) {
        // History response is expected to contain an `uploads` array from backend
        const historyData = historyResponse.value as any;
        // Access data from the response (API wraps in { success: true, data: {...} })
        const responseData = historyData.data || historyData;
        const userJobs: any[] = Array.isArray(responseData.uploads)
          ? responseData.uploads
          : [];

        // Update pagination info from response
        if (responseData.pagination) {
          setPagination(prev => ({
            ...prev,
            total: responseData.pagination.total || 0,
            hasMore: responseData.pagination.hasMore || false,
          }));
        }
        setpastAnalysis(userJobs);
      } else {
        setpastAnalysis([]);
      }

      // Handle crew jobs response: merge with current state when in background so we don't wipe optimistic job
      if (crewJobsResponse.status === "fulfilled" && crewJobsResponse.value) {
        const crewAnalysisJobs = parseCrewJobsFromResponse(crewJobsResponse.value);
        // Check for duplicate IDs (dedupe handled by mergeCrewJobsFromApi)
        setCrewJobs((prev) => mergeCrewJobsFromApi(prev, crewAnalysisJobs));

        setPagination(prev => ({
          ...prev,
          total: Math.max(crewAnalysisJobs.length, prev.total ?? 0),
        }));

      } else {
        if (!background) {
          setCrewJobs([]);
          setPagination(prev => ({ ...prev, total: 0 }));
        }
      }

      // Hydrate missing thumbnails by querying job status
      const hydrateImages = async () => {
        try {
          const API_BASE = API_BASE_URL;
          // Only fetch from AI service if image_url is missing
          // Images are already stored in Supabase Storage
          // Filter out crew jobs - they use Supabase real-time updates, not /analyze-part/status/
          const toFetch = (pastAnalysis || []).filter(
            (j: any) => {
              const id = j.id || "";
              const imageName = j.image_name || "";
              // Skip crew jobs (they have IDs like "crew_analysis_xxx" or image_name like "crew_analysis_xxx.jpg")
              const isCrewJob = id.startsWith("crew_analysis_") || 
                                imageName.startsWith("crew_analysis_") ||
                                id.includes("crew_analysis") ||
                                imageName.includes("crew_analysis");
              return !j.image_url && (imageName || id) && !isCrewJob;
            }
          );

          if (!toFetch.length) {
            return;
          }

          // First check if AI service is available
          try {
            const healthRes = await fetch(`${API_BASE}/health`, {
              method: "GET",
              signal: AbortSignal.timeout(3000),
            });
            if (!healthRes.ok) {
              return; // Skip image fetching if service is down
            }
          } catch (healthError) {
            return; // Skip image fetching if service is unreachable
          }
          // Batch fetch images to avoid overwhelming the server
          const BATCH_SIZE = 10;
          const BATCH_DELAY = 500; // ms between batches
          const results: Array<{ id: string; url?: string; error?: string }> =
            [];

          for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
            const batch = toFetch.slice(i, i + BATCH_SIZE);
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

            // Delay between batches (except for the last one)
            if (i + BATCH_SIZE < toFetch.length) {
              await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
            }
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

      const rejected = [historyResponse, crewJobsResponse].filter(
        (r) => r.status === "rejected"
      );
      const transientRejected = rejected.filter((r) => {
        const status = (r as { reason?: { response?: { status?: number } } })
          .reason?.response?.status;
        return !status || status === 502 || status === 503 || status === 504;
      });
      if (transientRejected.length > 0) {
        setError("Connection is slow. History will refresh automatically.");
        return;
      }
    } catch (error: any) {
      if (error.message === "Request aborted") {
        return;
      }

      console.error("❌ Error in fetchAllData:", error);

      if (
        !error.response ||
        error.response?.status === 502 ||
        error.response?.status === 503 ||
        error.response?.status === 504
      ) {
        setError("Connection is slow. Retrying in the background…");
        return;
      }

      if (error.response?.status === 401) {
        setError("Could not verify your session. Try refreshing the page.");
        return;
      }

      setError(error.message || "Failed to load data");
      toast({
        title: "Error",
        description: error.message || "Failed to load history data",
        variant: "destructive",
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      isFetchingRef.current = false;
      if (!background) setIsLoading(false);
    }
  }, [hasValidToken, user?.id, toast, logout, pagination.page, pagination.limit]);

  const fetchAllDataRef = useRef(fetchAllData);
  fetchAllDataRef.current = fetchAllData;

  const crewJobsFetchInFlightRef = useRef<Promise<boolean> | null>(null);

  const refreshCrewJobsFromApi = useCallback(async () => {
    if (crewJobsFetchInFlightRef.current) {
      return crewJobsFetchInFlightRef.current;
    }

    const run = (async () => {
      try {
        const resp = await api.upload.getCrewAnalysisJobs();
        const fromApi = parseCrewJobsFromResponse(resp);
        let shouldRefreshAll = false;
        setCrewJobs((prev) => {
          if (!fromApi.length) return prev;
          const hadActive = crewJobsHaveActive(prev);
          const merged = mergeCrewJobsFromApi(prev, fromApi);
          const nowComplete = merged.some((j) => j.status === "completed");
          if (hadActive && nowComplete) shouldRefreshAll = true;
          return merged;
        });

        if (shouldRefreshAll) {
          void fetchAllDataRef.current?.({ background: true });
        }
        return true;
      } catch (error) {
        console.error("Failed to refresh crew jobs:", error);
        return false;
      } finally {
        crewJobsFetchInFlightRef.current = null;
      }
    })();

    crewJobsFetchInFlightRef.current = run;
    return run;
  }, []);

  const crewJobsRef = useRef(crewJobs);
  crewJobsRef.current = crewJobs;

  // Persist crew jobs so Upload → History redirect shows prior analyses immediately
  useEffect(() => {
    if (!user?.id || crewJobs.length === 0) return;
    writeCrewJobsCache(user.id, crewJobs);
  }, [crewJobs, user?.id]);

  // Hydrate from session cache before paint (avoids empty list until slow API returns)
  useLayoutEffect(() => {
    if (!user?.id || location.pathname !== HISTORY_PATH) return;

    const state = location.state as { newCrewJob?: any } | null | undefined;
    const newCrewJob = state?.newCrewJob;
    const cached = readCrewJobsCache(user.id);
    const seeded = newCrewJob?.id
      ? prependCrewJob(cached, newCrewJob)
      : cached;

    if (seeded.length > 0) {
      setCrewJobs((prev) => {
        if (prev.length === 0) return seeded;
        const byId = new Map<string, any>();
        for (const j of [...seeded, ...prev]) {
          if (j?.id) byId.set(j.id, j);
        }
        return Array.from(byId.values()).sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );
      });
      setIsLoading(false);
    }
  }, [user?.id, location.pathname, location.state]);

  // Real-time polling for job statuses and data updates
  const pollJobStatuses = useCallback(async () => {
    try {
      // Prevent duplicate requests within 1 second
      const now = Date.now();
      if (now - lastPollTime < 1000) {
        return;
      }
      setLastPollTime(now);

      setIsPolling(true);
      // Use backend endpoint instead of AI service to ensure user filtering
      // Respect current pagination settings
      const historyData = await uploadApi.getHistory({ 
        page: pagination.page,
        limit: pagination.limit 
      });
      // Normalize response shape for robust polling
      if (historyData?.success) {
        // Support both possible shapes from backend: { searches: [...] } and { uploads: [...] }
        // Access data from the response (API wraps in { success: true, data: {...} })
        const responseData = (historyData as any).data || historyData;
        const potentialSearches =
          responseData.searches ?? responseData.uploads ?? [];
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
      // ignore transient polling errors
    } finally {
      setIsPolling(false);
    }
  }, [lastPollTime]);

  // When a SpareFinder Research analysis is running, stop polling history/uploads to avoid API spam.
  // Crew jobs are polled separately every 1.5s; resume history polling when no crew jobs are active.
  const hasActiveCrewJobs = crewJobs.some(
    (job: any) => job.status === "processing" || job.status === "pending"
  );
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;
    if (hasActiveCrewJobs) return; // Don't poll history while analysis is running
    const id = setInterval(pollJobStatuses, 5000); // Poll every 5 seconds for real-time updates
    return () => clearInterval(id);
  }, [authLoading, isAuthenticated, user?.id, pollJobStatuses, hasActiveCrewJobs]);

  // Intelligent polling with exponential backoff for processing jobs (image history only)
  // Skip when SpareFinder Research is running to avoid extra history API calls
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;
    if (hasActiveCrewJobs) return;

    const hasProcessingJobs = pastAnalysis.some(
      (job: any) => job.status === "processing" || job.status === "pending"
    );

    if (hasProcessingJobs) {
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
  }, [authLoading, isAuthenticated, user?.id, pollJobStatuses, pastAnalysis, hasActiveCrewJobs]);

  // Auto-refresh stats (and history) in background so numbers stay up to date
  const STATS_REFRESH_INTERVAL_MS = 30000; // 30 seconds
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;

    const refreshStats = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      fetchAllData({ background: true });
    };

    // First refresh sooner so stats don't stay at 0
    const firstId = setTimeout(refreshStats, 5000);
    const id = setInterval(refreshStats, STATS_REFRESH_INTERVAL_MS);
    return () => {
      clearTimeout(firstId);
      clearInterval(id);
    };
  }, [authLoading, isAuthenticated, user?.id, fetchAllData]);

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
    const jobId = job.id || "";
    const imageName = job.image_name || job.filename || "";
    
    // Skip crew jobs - they use different handlers
    const isCrewJob = jobId.startsWith("crew_analysis_") || 
                      imageName.startsWith("crew_analysis_") ||
                      jobId.includes("crew_analysis") ||
                      imageName.includes("crew_analysis");
    
    if (isCrewJob) {
      toast({
        title: "Download not available",
        description: "PDF download for crew analysis jobs is handled separately.",
        variant: "default",
      });
      return;
    }
    
    try {
      const id = encodeURIComponent(job.filename || job.id);
      const res = await fetch(`${API_BASE_URL}/analyze-part/status/${id}`);
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
    const id = jobId || "";
    const imageName = job.image_name || job.filename || "";
    
    // Skip crew jobs - they use different handlers (handleViewCrewAnalysis)
    const isCrewJob = id.startsWith("crew_analysis_") || 
                      imageName.startsWith("crew_analysis_") ||
                      id.includes("crew_analysis") ||
                      imageName.includes("crew_analysis");
    
    if (isCrewJob) {
      return;
    }
    
    try {
      setCurrentViewedJob(job); // Store the current job being viewed

      // Check if we already have the full analysis data
      const existingData = jobStatusMap[jobId] || job;
      const status = String(existingData?.status || "").toLowerCase();

      // If job is completed and we have the data, show it immediately
      if (status === "completed" && existingData) {
        setSelectedImageJob(existingData);
        setIsImageOpen(true);
        return;
      }

      // Otherwise, fetch from AI service
      setLoadingJobIds((prev) => new Set(prev).add(jobId));
      setIsAnalysisLoading(true);
      setSelectedAnalysis(null);

      const res = await fetch(
        `${API_BASE_URL}/analyze-part/status/${encodeURIComponent(
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

  // Auto-start pending jobs when detected
  useEffect(() => {
    if (!isAuthenticated || !user?.id || authLoading) return;

    const pendingJobs = pastAnalysis.filter(
      (job: any) => job.status === "pending" && job.id
    );

    if (pendingJobs.length > 0) {
      // Backend auto-start service handles this, but we log for visibility
      // Frontend can also trigger start if needed as fallback
    }
  }, [pastAnalysis, isAuthenticated, user?.id, authLoading]);

  // Refetch whenever user lands on History (including after redirect from Upload)
  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated &&
      user?.id &&
      location.pathname === HISTORY_PATH
    ) {
      // Optimistic: show new crew job immediately if we were redirected from Upload with state
      const state = location.state as { newCrewJob?: any } | null | undefined;
      const newCrewJob = state?.newCrewJob;
      const isAfterRedirectWithJob = !!newCrewJob?.id;
      if (newCrewJob?.id) {
        setCrewJobs((prev) => prependCrewJob(prev, newCrewJob));
        writeCrewJobsCache(
          user.id,
          prependCrewJob(readCrewJobsCache(user.id), newCrewJob)
        );
        window.history.replaceState(null, "", location.pathname);
        setIsLoading(false);
      }
      isInitializedRef.current = true;

      // One crew refresh + one full fetch (fetchAllData also loads crew jobs — deduped via in-flight ref)
      void refreshCrewJobsFromApi();
      fetchAllData(isAfterRedirectWithJob ? { background: true } : undefined);

      const tRetry = isAfterRedirectWithJob
        ? setTimeout(() => {
            void refreshCrewJobsFromApi();
            void fetchAllData({ background: true });
          }, 2000)
        : undefined;
      return () => {
        if (tRetry) clearTimeout(tRetry);
      };
    }

    // Reset when user logs out
    if (!isAuthenticated || !user?.id) {
      isInitializedRef.current = false;
      setError(null);
      setIsLoading(false);
    }
  }, [
    location.pathname,
    location.state,
    isAuthenticated,
    user?.id,
    authLoading,
    fetchAllData,
    refreshCrewJobsFromApi,
  ]);

  // Refetch data when pagination changes (but only after initial load)
  useEffect(() => {
    if (isInitializedRef.current && isAuthenticated && user?.id) {
      fetchAllData();
    }
  }, [pagination.page, pagination.limit]);

  // Real-time Supabase subscription for SpareFinder Research jobs
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
          if (payload.eventType === "INSERT") {
            setCrewJobs((prev) => {
              // Prevent duplicate insertions
              const existingJob = prev.find((job) => job.id === payload.new.id);
              if (existingJob) {
                return prev;
              }
              return [payload.new as any, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as any;
            setCrewJobs((prev) =>
              prev.map((job) =>
                job.id === updated.id
                  ? { ...updated, _uniqueCardKey: updated.id }
                  : job
              )
            );
            if (updated.status === "completed" || updated.status === "failed") {
              void fetchAllDataRef.current?.({ background: true });
            }
          } else if (payload.eventType === "DELETE") {
            setCrewJobs((prev) =>
              prev.filter((job) => job.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsPolling(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsPolling(false);
    };
  }, [user?.id]);

  // Poll crew jobs while any are active (stable interval — not reset on every state update)
  useEffect(() => {
    if (!user?.id || location.pathname !== HISTORY_PATH) return;

    const pollInterval = setInterval(() => {
      const jobs = crewJobsRef.current;
      if (!crewJobsHaveActive(jobs)) return;
      void refreshCrewJobsFromApi();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [user?.id, location.pathname, refreshCrewJobsFromApi]);

  // After jobs finish, poll a few more times so we pick up "completed" + result_data
  useEffect(() => {
    if (!user?.id) return;

    let followUpCount = 0;
    const followUpInterval = setInterval(() => {
      const jobs = crewJobsRef.current;
      if (crewJobsHaveActive(jobs)) {
        followUpCount = 0;
        return;
      }
      if (jobs.length === 0) return;

      followUpCount += 1;
      void refreshCrewJobsFromApi();
      if (followUpCount >= 6) clearInterval(followUpInterval);
    }, 3000);

    return () => clearInterval(followUpInterval);
  }, [user?.id, refreshCrewJobsFromApi]);

  // Refetch when tab becomes visible (e.g. user read completion email in another tab)
  useEffect(() => {
    if (!user?.id) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshCrewJobsFromApi();
        void fetchAllDataRef.current?.({ background: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [user?.id, refreshCrewJobsFromApi]);

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
            ...(await getAuthHeaders()),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create shareable link");
      }

      const payload = await response.json();
      const shareUrl =
        payload?.data?.shareUrl ?? payload?.shareUrl ?? payload?.data?.url;
      if (!shareUrl || typeof shareUrl !== "string") {
        throw new Error("Share URL was not returned by the server");
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);

      // Open in new tab
      window.open(shareUrl, "_blank", "noopener,noreferrer");

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

  // Retry same search without region (global) when no suppliers were found in user region
  const handleRetryGlobal = async (analysis: { id: string; keywords?: string }) => {
    const keywords = analysis.keywords ?? "";
    if (!keywords) {
      toast({
        title: "Cannot retry",
        description: "This job has no keywords to retry.",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await dashboardApi.scheduleKeywordSearch(
        keywords,
        undefined,
        undefined
      );
      const jobId =
        (response as any)?.jobId ??
        (response as any)?.data?.job_id ??
        (response as any)?.filename;
      if (jobId) {
        const keywordsStr = typeof keywords === "string" ? keywords : (Array.isArray(keywords) ? (keywords as string[]).join(" ") : String(keywords));
        setCrewJobs((prev) => {
          if (prev.some((j) => j.id === jobId)) return prev;
          return [
            {
              id: jobId,
              keywords: keywordsStr,
              status: "pending",
              progress: 0,
              created_at: new Date().toISOString(),
              _uniqueCardKey: jobId,
            },
            ...prev,
          ];
        });
        setIsAnalysisResultOpen(false);
        setSelectedAnalysisResult(null);
        toast({
          title: "Retry scheduled",
          description: "Searching globally (region preference off). New job added to History.",
        });
      } else {
        throw new Error("No job ID returned");
      }
    } catch (err) {
      console.error("Retry global error:", err);
      toast({
        title: "Retry failed",
        description: "Could not start global search. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Toggle expanded state for a specific card using unique card identifier
  const toggleJobExpanded = (cardKey: string) => {
    if (!cardKey) {
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
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-gray-900 dark:via-brand-dark/20 dark:to-blue-900/20 relative overflow-hidden">
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
                  <Button onClick={() => fetchAllData()} variant="outline" size="sm">
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
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-gray-900 dark:via-brand-dark/20 dark:to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements (dark mode only to avoid blue tint in light theme) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden dark:block">
        <motion.div
          className="absolute -top-20 md:-top-40 -left-20 md:-left-40 w-40 h-40 md:w-80 md:h-80 bg-brand/30 rounded-full blur-3xl opacity-70"
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
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-r from-[#3A5AFE0A] via-[#8F39BB0A] to-transparent blur-xl opacity-80 dark:from-brand/10 dark:to-blue-600/10" />
            <div className="relative rounded-2xl md:rounded-3xl border border-border bg-card shadow-soft-elevated backdrop-blur-xl dark:bg-black/30 dark:border-white/10">
              <div className="flex flex-col gap-3 md:gap-4 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <motion.h1
                      className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground dark:bg-gradient-to-r dark:from-white dark:via-brand-light dark:to-blue-200 dark:bg-clip-text dark:text-transparent mb-2 md:mb-3"
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
                      className="bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark shadow-lg shadow-brand/25 text-sm md:text-base"
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
                <div className="flex items-center justify-between mb-4">
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
                      // Refetch all data including crew jobs so in-progress analysis shows up
                      fetchAllData();
                      pollJobStatuses();
                    }}
                    className="text-xs border-border bg-transparent text-muted-foreground hover:bg-muted dark:border-white/20 dark:text-gray-200 dark:hover:bg-white/10"
                  >
                    <Activity className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>
                
                {/* Modern Search Bar */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by keywords, filename, status, or ID..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="w-full pl-10 pr-10 py-2 text-sm bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-muted-foreground dark:bg-black/30 dark:border-white/10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <CardDescription className="text-xs text-muted-foreground md:text-sm dark:text-gray-400">
                  {searchQuery ? (
                    <span>
                      Found {filteredCrewJobs.length} result{filteredCrewJobs.length !== 1 ? 's' : ''} for "{searchQuery}"
                    </span>
                  ) : (
                    <span>Completed and queued analyses from the AI service</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {filteredCrewJobs.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <Sparkles className="mx-auto mb-3 h-8 w-8 text-brand-light/70 md:mb-4 md:h-12 md:w-12" />
                    <p className="text-sm text-muted-foreground md:text-base dark:text-gray-400">
                      No SpareFinder Research jobs yet
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground/80 md:text-sm dark:text-gray-500">
                      Start a comprehensive SpareFinder AI Research from the
                      upload page
                    </p>
                  </div>
                ) : (
                  <div className="w-full">
                    {/* SpareFinder Research Jobs Grid */}
                    <div
                      id="tour-past-jobs-table"
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                      {filteredCrewJobs
                        .sort(
                          (a: any, b: any) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                        )
                        .slice((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit)
                        .map((job: any) => {
                          // Use the stable unique key pre-assigned in useMemo
                          const cardUniqueKey = job._uniqueCardKey;
                          const displayName =
                            getCrewJobDisplayName(job) || "Part analysis";

                          return (
                            <motion.div
                              key={cardUniqueKey}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="group"
                            >
                              <Card className="bg-gradient-to-br from-brand/10 to-blue-600/10 backdrop-blur-xl border-brand/20 hover:border-brand/40 transition-all duration-300 overflow-hidden h-full">
                                <CardContent className="p-0">
                                  {/* Image/Icon Header */}
                                  <div className="relative h-32 bg-gradient-to-br from-brand/30 to-blue-600/30 flex items-center justify-center overflow-hidden">
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
                                      <Sparkles className="w-16 h-16 text-brand-light/50" />
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
                                          ? `✅ ${displayName}`
                                          : job.status === "failed"
                                          ? `❌ ${displayName}`
                                          : job.status === "pending"
                                          ? `⏳ ${displayName}`
                                          : `🤖 ${displayName}`}
                                      </h3>
                                      {/* Live stage line: updates in real time as backend progresses */}
                                      {job.status !== "completed" &&
                                        job.status !== "failed" && (
                                          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground dark:text-gray-400">
                                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                                            {job.status === "pending"
                                              ? "Processing.."
                                              : `${getStageDisplayName(job.current_stage || "initialization")} • ${job.progress ?? 0}%`}
                                          </p>
                                        )}
                                      <p className="mt-1 text-xs font-mono text-muted-foreground truncate dark:text-gray-400">
                                        ID: {job.id?.slice(0, 8)}...
                                      </p>
                                    </div>

                                    {/* Progress Display: show for both pending and processing so stages update in real time */}
                                    {job.status !== "completed" &&
                                      job.status !== "failed" &&
                                      job.id && (
                                        <CrewAnalysisProgress
                                          key={`progress-${cardUniqueKey}`}
                                          status={job.status}
                                          currentStage={job.current_stage}
                                          progress={job.progress ?? 0}
                                          errorMessage={job.error_message}
                                          title={displayName}
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
                                            className="flex-1 bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark"
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
                                              className="border-brand/50 hover:bg-brand/20"
                                            >
                                              <Download className="w-3 h-3" />
                                            </Button>
                                          )}
                                        </>
                                      )}
                                      {job.status === "pending" && (
                                        <div className="flex-1 text-xs text-yellow-900 dark:text-yellow-300 font-medium p-2 bg-yellow-400/80 dark:bg-yellow-900/20 rounded">
                                          Analysis is queued and will be processed automatically. You'll receive an email when complete.
                                        </div>
                                      )}
                                      {job.status === "failed" && (
                                        <div className="flex-1 text-xs text-red-400 p-2 bg-red-900/20 rounded">
                                          Analysis could not be completed. Please try uploading again.
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

                    {/* Pagination */}
                    {filteredCrewJobs.length > pagination.limit && (
                      <div className="mt-8 flex justify-center">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => {
                                  if (pagination.page > 1) {
                                    setPagination(prev => ({ ...prev, page: prev.page - 1 }));
                                  }
                                }}
                                className={pagination.page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>

                            {[...Array(Math.ceil(filteredCrewJobs.length / pagination.limit))].map((_, idx) => {
                              const pageNum = idx + 1;
                              const totalPages = Math.ceil(filteredCrewJobs.length / pagination.limit);
                              
                              // Show first page, last page, current page, and pages around current
                              const showPage = 
                                pageNum === 1 || 
                                pageNum === totalPages || 
                                (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1);

                              if (!showPage) {
                                // Show ellipsis
                                if (pageNum === pagination.page - 2 || pageNum === pagination.page + 2) {
                                  return (
                                    <PaginationItem key={pageNum}>
                                      <span className="px-4 py-2">...</span>
                                    </PaginationItem>
                                  );
                                }
                                return null;
                              }

                              return (
                                <PaginationItem key={pageNum}>
                                  <PaginationLink
                                    onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                                    isActive={pagination.page === pageNum}
                                    className="cursor-pointer"
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            })}

                            <PaginationItem>
                              <PaginationNext
                                onClick={() => {
                                  const totalPages = Math.ceil(filteredCrewJobs.length / pagination.limit);
                                  if (pagination.page < totalPages) {
                                    setPagination(prev => ({ ...prev, page: prev.page + 1 }));
                                  }
                                }}
                                className={pagination.page >= Math.ceil(filteredCrewJobs.length / pagination.limit) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
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
            onRetryGlobal={handleRetryGlobal}
          />

          {/* Delete Crew Job Confirmation Dialog */}
          <Dialog
            open={deleteCrewJobDialogOpen}
            onOpenChange={setDeleteCrewJobDialogOpen}
          >
            <DialogContent className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Delete SpareFinder Research
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to delete this SpareFinder Research? This
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
