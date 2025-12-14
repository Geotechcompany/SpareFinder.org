import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
// import { z } from 'zod';
import winston from "winston";
import { authenticateToken } from "../middleware/auth"; // Import authentication middleware
import { AuthRequest } from "../types/auth"; // Import the correct auth request type

// Enhanced logging setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
  ],
});

// Performance Metrics Result Type with Zod
// const PerformanceMetricsSchema = z.object({
//   total_searches: z.number().int().min(0),
//   avg_confidence: z.number().min(0).max(100),
//   avg_process_time: z.number().min(0),
//   match_rate: z.number().min(0).max(1)
// });

// type PerformanceMetricsResult = z.infer<typeof PerformanceMetricsSchema>;

// Environment Variable Validation
const validateEnvVars = () => {
  const requiredVars = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    const errorMsg = `Missing environment variables: ${missingVars.join(", ")}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
};

// Load and validate environment variables
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});
validateEnvVars();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const router = Router();

// Apply authentication middleware to all dashboard routes
router.use(authenticateToken);

// Middleware for input validation
const validateQueryParams = (req: Request, res: Response, next: () => void) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    if (limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        error: "Limit must be between 1 and 50",
      });
    }
    next();
    return;
  } catch (error) {
    logger.error("Query parameter validation error", { error });
    return res.status(400).json({
      success: false,
      error: "Invalid query parameters",
    });
  }
};

// Centralized error handler
const handleDashboardError = (
  res: Response,
  error: unknown,
  context: string
) => {
  logger.error(`${context} Error`, { error });

  if (error instanceof Error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  } else {
    return res.status(500).json({
      success: false,
      error: "Unexpected server error",
    });
  }
};

// Get recent uploads with enhanced validation
router.get(
  "/recent-uploads",
  validateQueryParams,
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const userId = req.user?.userId;

      console.log("📁 Recent uploads - User ID:", userId);

      if (!userId) {
        console.log("❌ Recent uploads - No user ID found");
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const { data, error } = await supabase
        .from("part_searches")
        .select(
          `
          id,
          search_term,
          part_name,
          part_number,
          manufacturer,
          confidence_score,
          image_url,
          image_name,
          created_at
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return res.json({
        success: true,
        data: {
          uploads: (data || []).map((upload) => ({
            id: upload.id,
            image_name:
              upload.image_name ||
              upload.part_name ||
              upload.search_term ||
              "Unknown",
            created_at: upload.created_at,
            confidence_score: upload.confidence_score || 0,
            part_details: {
              part_number: upload.part_number || null,
              manufacturer: upload.manufacturer || null,
            },
          })),
        },
      });
    } catch (error) {
      return handleDashboardError(res, error, "Recent Uploads");
    }
  }
);

// Get recent activities
router.get("/recent-activities", async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const userId = req.user?.userId; // Assuming middleware adds user info

    console.log("🔄 Recent activities - User ID:", userId);

    if (!userId) {
      console.log("❌ Recent activities - No user ID found");
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Fetch recent activities from part_searches
    const { data, error } = await supabase
      .from("part_searches")
      .select(
        `
        id,
        search_term,
        search_type,
        part_name,
        manufacturer,
        confidence_score,
        is_match,
        analysis_status,
        created_at
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Recent Activities Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.json({
      success: true,
      data: {
        activities: (data || []).map((activity) => ({
          id: activity.id,
          resource_type: "part_search",
          action: activity.is_match ? "Part Match Found" : "Search Performed",
          details: {
            search_term: activity.search_term || "Unknown",
            search_type: activity.search_type || "image_upload",
            part_name: activity.part_name || "Not identified",
            manufacturer: activity.manufacturer || "Unknown",
            confidence: Math.round((activity.confidence_score || 0) * 100),
            status:
              activity.analysis_status ||
              (activity.is_match ? "success" : "pending"),
            description: activity.part_name
              ? `Found ${activity.part_name}${
                  activity.manufacturer ? ` by ${activity.manufacturer}` : ""
                }`
              : `Searched for ${activity.search_term || "part"}`,
          },
          created_at: activity.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("Recent Activities Unexpected Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get performance metrics
router.get("/performance-metrics", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // Assuming middleware adds user info

    console.log("📈 Performance metrics - User ID:", userId);

    if (!userId) {
      console.log("❌ Performance metrics - No user ID found");
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Fetch all user's part searches to calculate metrics
    const { data: searches, error } = await supabase
      .from("part_searches")
      .select("confidence_score, processing_time_ms, is_match")
      .eq("user_id", userId);

    if (error) {
      console.error("Performance Metrics Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    // Calculate metrics manually
    const totalSearches = searches?.length || 0;
    let avgConfidence = 0;
    let avgProcessTime = 0;
    let matchCount = 0;

    if (searches && searches.length > 0) {
      const confidenceSum = searches.reduce(
        (sum, search) => sum + (search.confidence_score || 0),
        0
      );
      const processTimeSum = searches.reduce(
        (sum, search) => sum + (search.processing_time_ms || 0),
        0
      );
      matchCount = searches.filter((search) => search.is_match).length;

      avgConfidence = confidenceSum / searches.length;
      avgProcessTime = processTimeSum / searches.length;
    }

    const matchRate =
      totalSearches > 0 ? (matchCount / totalSearches) * 100 : 0;

    console.log("📈 Performance metrics calculated:", {
      totalSearches,
      avgConfidence,
      avgProcessTime,
      matchRate,
      rawSearches: searches?.length || 0,
    });

    return res.json({
      success: true,
      data: {
        totalSearches,
        avgConfidence: Math.round(avgConfidence * 100) || 0, // Convert to percentage and round
        avgProcessTime: Math.round(avgProcessTime) || 0, // Round to whole number
        matchRate: Math.round(matchRate) || 0, // Round to whole number
        modelAccuracy: Math.round(matchRate) || 0,
        accuracyChange: 0, // TODO: Implement historical tracking
        searchesGrowth: 0, // TODO: Implement historical tracking
        avgResponseTime: Math.round(avgProcessTime) || 0,
        responseTimeChange: 0, // TODO: Implement historical tracking
      },
    });
  } catch (error) {
    console.error("Performance Metrics Unexpected Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get dashboard stats
router.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    console.log("📊 Dashboard stats endpoint called");
    console.log("📊 Request URL:", req.url);
    console.log("📊 Request method:", req.method);
    console.log("📊 Request headers:", req.headers);
    const userId = req.user?.userId;

    if (!userId) {
      console.log("📊 Dashboard stats: No user ID");
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    console.log("📊 Dashboard stats: User ID:", userId);

    // Fetch total crew analysis jobs
    const { count: totalCrewJobs, error: crewJobsError } = await supabase
      .from("crew_analysis_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Fetch completed crew analysis jobs
    const { count: completedCrewJobs, error: completedCrewError } =
      await supabase
        .from("crew_analysis_jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed");

    // Get crew jobs processing times and progress
    const { data: crewJobsData, error: crewJobsDataError } = await supabase
      .from("crew_analysis_jobs")
      .select("id, created_at, completed_at, progress")
      .eq("user_id", userId)
      .eq("status", "completed")
      .not("completed_at", "is", null);

    if (crewJobsError || completedCrewError || crewJobsDataError) {
      console.error("Stats Fetch Errors:", {
        crewJobsError,
        completedCrewError,
        crewJobsDataError,
      });
      return res.status(500).json({
        success: false,
        error: "Failed to fetch dashboard statistics",
      });
    }

    // Calculate a more realistic average confidence
    // Fetch additional quality indicators from part_searches
    const { data: allUserSearches, error: searchesError } = await supabase
      .from("part_searches")
      .select(
        "confidence_score, ai_confidence, manufacturer, part_name, supplier_information, technical_specifications"
      )
      .eq("user_id", userId)
      .eq("analysis_status", "completed")
      .not("confidence_score", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    // If the user has no completed activity, default to 0 (don't show misleading "85%").
    let avgConfidence = 0;

    if (!searchesError && allUserSearches && allUserSearches.length > 0) {
      // Calculate quality-adjusted confidence scores
      const confidenceValues = allUserSearches
        .map((item) => {
          let baseConf = item.ai_confidence || item.confidence_score || 0;

          // Normalize to 0-100 range
          if (baseConf > 100) baseConf = baseConf / 100;
          else if (baseConf <= 1 && baseConf > 0) baseConf = baseConf * 100;

          // Adjust based on quality indicators
          let qualityScore = baseConf;

          // Penalize if missing key data
          if (
            !item.manufacturer ||
            item.manufacturer === "Unknown" ||
            item.manufacturer === "|"
          ) {
            qualityScore -= 10;
          }
          if (
            !item.part_name ||
            item.part_name === "Not identified" ||
            item.part_name.includes("**")
          ) {
            qualityScore -= 8;
          }
          if (
            !item.supplier_information ||
            item.supplier_information.length < 50
          ) {
            qualityScore -= 7;
          }
          if (
            !item.technical_specifications ||
            item.technical_specifications.length < 50
          ) {
            qualityScore -= 5;
          }

          // Keep in reasonable range
          return Math.max(60, Math.min(100, qualityScore));
        })
        .filter((conf) => conf > 0);

      if (confidenceValues.length > 0) {
        avgConfidence =
          confidenceValues.reduce((sum, val) => sum + val, 0) /
          confidenceValues.length;
      }
    }

    console.log(
      `📊 Calculated quality-adjusted confidence: ${Math.round(
        avgConfidence
      )}% from ${allUserSearches?.length || 0} searches`
    );

    // Calculate average processing time from crew jobs (in seconds)
    const avgProcessTime = crewJobsData?.length
      ? crewJobsData.reduce((sum, item) => {
          const createdAt = new Date(item.created_at).getTime();
          const completedAt = new Date(item.completed_at).getTime();
          const durationMs = completedAt - createdAt;
          return sum + durationMs;
        }, 0) / crewJobsData.length
      : 0;

    return res.json({
      success: true,
      data: {
        totalUploads: totalCrewJobs || 0,
        successfulUploads: completedCrewJobs || 0,
        avgConfidence: Math.round(avgConfidence) || 0,
        avgProcessTime: Math.round(avgProcessTime / 1000) || 0, // Convert to seconds
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error while fetching dashboard stats",
    });
  }
});

// Dashboard analytics timeseries (daily buckets)
router.get("/analytics", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const daysRaw = Number(req.query.days ?? 30);
    const days = Number.isFinite(daysRaw) ? Math.floor(daysRaw) : 30;
    const safeDays = Math.min(90, Math.max(7, days || 30));

    const now = new Date();
    // Use UTC date buckets to avoid timezone inconsistencies
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (safeDays - 1),
        0,
        0,
        0,
        0
      )
    );
    const startIso = start.toISOString();

    type Bucket = {
      date: string; // YYYY-MM-DD
      analyzedParts: number;
      completedAnalyses: number;
      // confidence in [0..100]
      confidenceSum: number;
      confidenceCount: number;
      // processing in seconds
      processingSumSec: number;
      processingCount: number;
    };

    const fmtDate = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate()
      ).padStart(2, "0")}`;

    const buckets = new Map<string, Bucket>();
    for (let i = 0; i < safeDays; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const key = fmtDate(d);
      buckets.set(key, {
        date: key,
        analyzedParts: 0,
        completedAnalyses: 0,
        confidenceSum: 0,
        confidenceCount: 0,
        processingSumSec: 0,
        processingCount: 0,
      });
    }

    // 1) Crew analysis jobs → analyzed/completed + processing seconds (from created→completed)
    const { data: crewJobs, error: crewErr } = await supabase
      .from("crew_analysis_jobs")
      .select("created_at, completed_at, status, progress")
      .eq("user_id", userId)
      .gte("created_at", startIso);

    if (crewErr) {
      return handleDashboardError(res, crewErr, "Dashboard Analytics (crew jobs)");
    }

    for (const job of crewJobs || []) {
      const created = job.created_at ? new Date(job.created_at) : null;
      if (!created) continue;
      const key = fmtDate(created);
      const bucket = buckets.get(key);
      if (!bucket) continue;

      bucket.analyzedParts += 1;
      if (job.status === "completed") {
        bucket.completedAnalyses += 1;
      }

      // progress sometimes is 0..100, treat it as a confidence proxy only if it looks like percent
      if (typeof job.progress === "number" && job.progress >= 0 && job.progress <= 100) {
        bucket.confidenceSum += job.progress;
        bucket.confidenceCount += 1;
      }

      if (job.completed_at) {
        const completed = new Date(job.completed_at);
        const durationSec = Math.max(0, Math.round((completed.getTime() - created.getTime()) / 1000));
        bucket.processingSumSec += durationSec;
        bucket.processingCount += 1;
      }
    }

    // 2) part_searches → better confidence + processing_time_ms if available
    const { data: searches, error: searchesErr } = await supabase
      .from("part_searches")
      .select("created_at, confidence_score, ai_confidence, processing_time_ms, analysis_status")
      .eq("user_id", userId)
      .gte("created_at", startIso);

    if (searchesErr) {
      return handleDashboardError(res, searchesErr, "Dashboard Analytics (part searches)");
    }

    for (const row of searches || []) {
      const created = row.created_at ? new Date(row.created_at) : null;
      if (!created) continue;
      const key = fmtDate(created);
      const bucket = buckets.get(key);
      if (!bucket) continue;

      // Only take confidence from completed searches (less noisy)
      if (row.analysis_status === "completed") {
        const raw = (row.ai_confidence ?? row.confidence_score) as unknown;
        if (typeof raw === "number" && raw > 0) {
          // normalize to 0..100
          const normalized = raw <= 1 ? raw * 100 : raw > 100 ? raw / 100 : raw;
          const bounded = Math.max(0, Math.min(100, normalized));
          bucket.confidenceSum += bounded;
          bucket.confidenceCount += 1;
        }
      }

      if (typeof row.processing_time_ms === "number" && row.processing_time_ms > 0) {
        bucket.processingSumSec += row.processing_time_ms / 1000;
        bucket.processingCount += 1;
      }
    }

    const series = Array.from(buckets.values()).map((b) => {
      const avgConfidence =
        b.confidenceCount > 0 ? Math.round((b.confidenceSum / b.confidenceCount) * 10) / 10 : 0;
      const avgProcessingSeconds =
        b.processingCount > 0 ? Math.round((b.processingSumSec / b.processingCount) * 10) / 10 : 0;
      const completionRate =
        b.analyzedParts > 0 ? Math.round((b.completedAnalyses / b.analyzedParts) * 1000) / 10 : 0;

      return {
        date: b.date,
        analyzedParts: b.analyzedParts,
        completedAnalyses: b.completedAnalyses,
        completionRate,
        avgConfidence,
        avgProcessingSeconds,
      };
    });

    return res.json({
      success: true,
      data: {
        days: safeDays,
        series,
      },
    });
  } catch (error) {
    return handleDashboardError(res, error, "Dashboard Analytics");
  }
});

// Get individual job data from database
router.get(
  "/jobs/:jobId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: "Job ID is required",
        });
      }

      // Get job data from jobs table
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError) {
        logger.error(`Failed to fetch job ${jobId}:`, jobError);
        return res.status(404).json({
          success: false,
          error: "Job not found",
        });
      }

      // Get comprehensive data from part_searches table
      const { data: partData } = await supabase
        .from("part_searches")
        .select("*")
        .eq("id", jobId)
        .single();

      // Combine job data with comprehensive analysis data
      const combinedData = {
        ...jobData,
        // Override with comprehensive data if available
        ...(partData && {
          precise_part_name: partData.part_name,
          manufacturer: partData.manufacturer,
          category: partData.category,
          confidence_score: partData.confidence_score,
          description: partData.description,
          technical_data_sheet: partData.technical_data_sheet,
          compatible_vehicles: partData.compatible_vehicles,
          engine_types: partData.engine_types,
          suppliers: partData.suppliers,
          fitment_tips: partData.fitment_tips,
          additional_instructions: partData.additional_instructions,
          full_analysis: partData.full_analysis,
          processing_time_seconds: partData.processing_time,
          model_version: partData.model_version,
          predictions: partData.predictions || [],
          metadata: partData.metadata,
        }),
      };

      logger.info(`Successfully fetched job ${jobId} from database`);

      return res.status(200).json({
        success: true,
        data: combinedData,
      });
    } catch (error) {
      logger.error("Error fetching job data:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

export default router;
