import { Router, Response } from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { authenticateToken } from "../middleware/auth";
import { requireSubscriptionOrTrial } from "../middleware/subscription";
import { AuthRequest } from "../types/auth";
import { supabase } from "../server";
import {
  DatabaseLogger,
  PartSearchData,
  SearchHistoryData,
} from "../services/database-logger";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { emailService, AnalysisEmailData } from "../services/email-service";
import { creditService, CreditResult } from "../services/credit-service";
import { getUsageRow, incrementStorage, incrementUsage } from "../services/usage-tracking";

const router = Router();

const AI_ERROR_ALERT_EMAIL =
  process.env.AI_ERROR_ALERT_EMAIL || "arthurbreck417@gmail.com";

const sendAiErrorAlert = (subject: string, details: any) => {
  emailService
    .sendEmail({
      to: AI_ERROR_ALERT_EMAIL,
      subject,
      html: `<pre>${JSON.stringify(details, null, 2)}</pre>`,
    })
    .catch((err) =>
      console.error("Failed to send AI error alert email:", err)
    );
};

// Helper function to collect comprehensive error logs
const collectErrorLogs = (
  error: any,
  errorType: string,
  errorMessage: string,
  userId: string,
  originalname: string,
  size: number,
  mimetype: string,
  aiServiceUrl: string,
  req: any
): string => {
  const errorLogs: any = {
    timestamp: new Date().toISOString(),
    error_type: errorType,
    error_message: errorMessage,
    user_id: userId,
    file_info: {
      filename: originalname,
      size_bytes: size,
      mime_type: mimetype,
    },
    ai_service_url: aiServiceUrl,
    request_info: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      user_agent: req.headers["user-agent"],
      session_id: req.headers["x-session-id"],
    },
  };

  // Add error-specific details
  if (axios.isAxiosError(error)) {
    errorLogs.axios_error = {
      message: error.message,
      code: error.code,
      response: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      },
      request: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        timeout: error.config?.timeout,
      },
    };
  } else if (error instanceof Error) {
    errorLogs.error_object = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else {
    errorLogs.error_raw = String(error);
  }

  // Add full error object if available
  try {
    errorLogs.full_error = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
  } catch (e) {
    errorLogs.full_error = "Could not stringify error object";
  }

  return JSON.stringify(errorLogs, null, 2);
};

// Helper function to start SpareFinder Research (reusable for retries)
async function startCrewAnalysis(
  jobId: string,
  imageBuffer: Buffer,
  originalName: string,
  mimeType: string,
  userEmail: string,
  keywords: string
): Promise<void> {
  // Use AI_CREW_URL if set, otherwise fall back to AI_SERVICE_URL, or fail if neither is set
  const aiCrewUrl =
    process.env.AI_CREW_URL ||
    process.env.AI_SERVICE_URL ||
    (() => {
      const error = new Error(
        "AI_CREW_URL or AI_SERVICE_URL environment variable is not configured"
      );
      console.error("❌ Configuration error:", error.message);
      throw error;
    })();

  // Prevent using localhost in production (basic check)
  if (
    process.env.NODE_ENV === "production" &&
    (aiCrewUrl.includes("localhost") ||
      aiCrewUrl.includes("127.0.0.1") ||
      aiCrewUrl.includes("::1"))
  ) {
    const error = new Error(
      `Invalid AI service URL for production: ${aiCrewUrl}. Please set AI_CREW_URL or AI_SERVICE_URL to a valid production URL.`
    );
    console.error("❌ Configuration error:", error.message);
    throw error;
  }

  try {
    console.log(
      `📤 Sending analysis request to crew for job ${jobId} at ${aiCrewUrl}`
    );

    const formData = new FormData();
    formData.append("file", imageBuffer, {
      filename: originalName,
      contentType: mimeType,
    });
    formData.append("user_email", userEmail);
    formData.append("keywords", keywords);
    formData.append("analysis_id", jobId);

    await axios.post(`${aiCrewUrl}/analyze-part`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 300000, // 5 minutes timeout
    });

    console.log(`✅ SpareFinder AI Research started for job ${jobId}`);
  } catch (error) {
    console.error(
      `❌ Failed to start SpareFinder AI Research for job ${jobId}:`,
      error
    );
    throw error;
  }
}

// Comprehensive auto-retry system for all failed analyses
// Runs every 3 minutes to retry failed jobs

// Helper function to determine if an error is retryable
function isRetryableError(_errorType: string, _statusCode?: number): boolean {
  // User requirement: retry *all* failures until they eventually succeed.
  // That includes 4xx "client_error", auth errors, and file size errors, since
  // the underlying cause may be fixed later (config, service bug, etc.).
  //
  // NOTE: the actual retry cadence/backoff is still enforced elsewhere.
  return true;
}

// Auto-retry failed SpareFinder Research jobs (crew_analysis_jobs)
setInterval(async () => {
  try {
    console.log("🔄 Checking for failed SpareFinder Research jobs to retry...");

    // Get failed jobs that haven't exceeded retry limit
    // Only retry jobs that failed more than 2 minutes ago (avoid immediate retries)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: failedJobs, error } = await supabase
      .from("crew_analysis_jobs")
      .select("*")
      .eq("status", "failed")
      // No max retry cap (keeps retrying until success)
      .or("retry_count.is.null,retry_count.gte.0")
      .lt("updated_at", twoMinutesAgo) // Only retry jobs that failed at least 2 minutes ago
      .limit(10); // Process max 10 at a time

    if (error) {
      console.error("❌ Error fetching failed SpareFinder Research jobs:", error);
      return;
    }

    if (!failedJobs || failedJobs.length === 0) {
      return;
    }

    console.log(`🔄 Found ${failedJobs.length} failed SpareFinder Research jobs to retry`);

    for (const job of failedJobs) {
      try {
        const retryCount = (job.retry_count || 0) + 1;
        console.log(`🔄 Retrying SpareFinder Research job ${job.id} (attempt ${retryCount})`);

        // Calculate exponential backoff delay (2^retryCount minutes, max 30 minutes)
        const delayMinutes = Math.min(Math.pow(2, retryCount - 1), 30);
        const lastFailedAt = new Date(job.updated_at || job.created_at);
        const timeSinceFailure = Date.now() - lastFailedAt.getTime();
        const requiredDelay = delayMinutes * 60 * 1000;

        // Skip if not enough time has passed
        if (timeSinceFailure < requiredDelay) {
          console.log(
            `⏳ Skipping job ${job.id} - need to wait ${Math.round(
              (requiredDelay - timeSinceFailure) / 1000 / 60
            )} more minutes`
          );
          continue;
        }

        // Update status to pending for retry
        await supabase
          .from("crew_analysis_jobs")
          .update({
            status: "pending",
            retry_count: retryCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        // Notify user (first retry only to avoid spamming on repeated retries)
        if (retryCount === 1 && job.user_email) {
          const userEmail = String(job.user_email);
          const userName = userEmail.includes("@")
            ? userEmail.split("@")[0]
            : "there";
          setImmediate(async () => {
            try {
              await emailService.sendAnalysisRetryingEmail({
                userEmail,
                userName,
                analysisId: job.id,
                retryCount,
                kind: "research",
                keywords: job.keywords || "",
              });
            } catch {
              // ignore (retry must not fail due to email)
            }
          });
        }

        // Fetch image from storage
        const imageResponse = await axios.get(job.image_url, {
          responseType: "arraybuffer",
          timeout: 30000,
        });

        // Start analysis in background
        setImmediate(async () => {
          try {
            await startCrewAnalysis(
              job.id,
              Buffer.from(imageResponse.data),
              job.image_name,
              "image/png", // Default to PNG, could be enhanced
              job.user_email,
              job.keywords || ""
            );
          } catch (retryError) {
            console.error(`❌ Retry failed for SpareFinder Research job ${job.id}:`, retryError);

            // Update to failed again
            await supabase
              .from("crew_analysis_jobs")
              .update({
                status: "failed",
                error_message:
                  retryError instanceof Error
                    ? retryError.message
                    : "Retry failed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", job.id);
          }
        });
      } catch (retryError) {
        console.error(
          `❌ Error processing retry for SpareFinder Research job ${job.id}:`,
          retryError
        );
      }
    }
  } catch (error) {
    console.error("❌ Error in SpareFinder Research auto-retry process:", error);
  }
}, 3 * 60 * 1000); // Run every 3 minutes

// Auto-retry failed regular image analyses (part_searches)
setInterval(async () => {
  try {
    console.log("🔄 Checking for failed image analyses to retry...");

    // Get failed analyses that haven't exceeded retry limit
    // Only retry analyses that failed more than 2 minutes ago
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: failedAnalyses, error } = await supabase
      .from("part_searches")
      .select("*")
      .eq("analysis_status", "failed")
      .not("image_url", "is", null) // Must have an image URL
      // No max retry cap (keeps retrying until success)
      .or("retry_count.is.null,retry_count.gte.0")
      .lt("updated_at", twoMinutesAgo) // Only retry analyses that failed at least 2 minutes ago
      .limit(10); // Process max 10 at a time

    if (error) {
      console.error("❌ Error fetching failed image analyses:", error);
      return;
    }

    if (!failedAnalyses || failedAnalyses.length === 0) {
      return;
    }

    console.log(`🔄 Found ${failedAnalyses.length} failed image analyses to retry`);

    for (const analysis of failedAnalyses) {
      try {
        // Check if error is retryable
        const errorType = (analysis.metadata as any)?.ai_service_error || "unknown";
        const errorDetails = (analysis.metadata as any)?.error_details;
        const statusCode = errorDetails?.status;
        const statusText = errorDetails?.statusText;

        if (!isRetryableError(errorType, statusCode)) {
          const statusSuffix = statusCode ? `, status: ${statusCode}` : "";
          const statusTextSuffix = statusText ? ` ${statusText}` : "";
          console.log(
            `⏭️ Skipping non-retryable analysis ${analysis.id} (error: ${errorType}${statusSuffix}${statusTextSuffix})`
          );
          continue;
        }

        const retryCount = ((analysis.metadata as any)?.retry_count || 0) + 1;
        console.log(`🔄 Retrying image analysis ${analysis.id} (attempt ${retryCount})`);

        // Calculate exponential backoff delay
        const delayMinutes = Math.min(Math.pow(2, retryCount - 1), 30);
        const lastFailedAt = new Date(analysis.updated_at || analysis.created_at);
        const timeSinceFailure = Date.now() - lastFailedAt.getTime();
        const requiredDelay = delayMinutes * 60 * 1000;

        // Skip if not enough time has passed
        if (timeSinceFailure < requiredDelay) {
          console.log(
            `⏳ Skipping analysis ${analysis.id} - need to wait ${Math.round(
              (requiredDelay - timeSinceFailure) / 1000 / 60
            )} more minutes`
          );
          continue;
        }

        // Update status to pending for retry
        const nowIso = new Date().toISOString();
        const lastRetryEmailAt = (analysis.metadata as any)?.last_retry_email_at as
          | string
          | undefined;
        const lastRetryEmailAtMs = lastRetryEmailAt
          ? Date.parse(lastRetryEmailAt)
          : NaN;
        const retryEmailCooldownMs = 12 * 60 * 60 * 1000; // 12h cooldown
        const shouldSendRetryEmail =
          !lastRetryEmailAt ||
          !Number.isFinite(lastRetryEmailAtMs) ||
          Date.now() - lastRetryEmailAtMs > retryEmailCooldownMs;

        const updatedMetadata = {
          ...(analysis.metadata || {}),
          retry_count: retryCount,
          last_retry_at: nowIso,
          ...(shouldSendRetryEmail ? { last_retry_email_at: nowIso } : {}),
        };

        await supabase
          .from("part_searches")
          .update({
            analysis_status: "pending",
            retry_count: retryCount,
            metadata: updatedMetadata,
            updated_at: nowIso,
          })
          .eq("id", analysis.id);

        // Retry the analysis by calling the AI service
        const aiServiceUrl = process.env.AI_SERVICE_URL;
        const aiServiceApiKey = process.env.AI_SERVICE_API_KEY;

        if (!aiServiceUrl) {
          console.error("❌ AI_SERVICE_URL not configured, cannot retry");
          continue;
        }

        // Fetch image from storage
        const imageResponse = await axios.get(analysis.image_url, {
          responseType: "arraybuffer",
          timeout: 30000,
        });

        // Create form data (FormData is already imported at top)
        const formData = new FormData();
        formData.append("file", Buffer.from(imageResponse.data), {
          filename: analysis.image_name || "retry_image.jpg",
          contentType: "image/jpeg",
        });

        // AI crew requires user_email as multipart form field (422 if missing)
        let userEmail: string | undefined =
          (analysis as any)?.user_email ||
          (analysis.metadata as any)?.user_email;
        let userName: string | undefined =
          (analysis as any)?.user_name ||
          (analysis.metadata as any)?.user_name;

        if (!userEmail && (analysis as any)?.user_id) {
          try {
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", (analysis as any).user_id)
              .single();
            userEmail = userProfile?.email || undefined;
            userName =
              (userProfile as any)?.full_name ||
              (userEmail ? userEmail.split("@")[0] : "there");
          } catch (e) {
            // ignore, handled below
          }
        }

        // Send "retry started" email (throttled)
        if (shouldSendRetryEmail && userEmail) {
          const resolvedName = userName || userEmail.split("@")[0] || "there";
          setImmediate(async () => {
            try {
              await emailService.sendAnalysisRetryingEmail({
                userEmail,
                userName: resolvedName,
                analysisId: analysis.id,
                retryCount,
                kind: "image",
              });
            } catch {
              // ignore
            }
          });
        }

        if (!userEmail) {
          console.warn(
            `⚠️ Cannot retry analysis ${analysis.id} - missing user_email (will try again later)`
          );
          continue;
        }

        formData.append("user_email", userEmail);
        formData.append("analysis_id", analysis.id);

        if (analysis.search_term) {
          formData.append("keywords", analysis.search_term);
        }

        // Retry the analysis in background
        setImmediate(async () => {
          try {
            console.log(`🔄 Retrying analysis for ${analysis.id}...`);
            
            const aiResponse = await axios.post(
              `${aiServiceUrl}/analyze-part`,
              formData,
              {
                headers: {
                  ...formData.getHeaders(),
                  ...(aiServiceApiKey && {
                    Authorization: `Bearer ${aiServiceApiKey}`,
                  }),
                },
                timeout: 120000,
                validateStatus: (status) => status < 500,
              }
            );

            if (aiResponse.status >= 200 && aiResponse.status < 300) {
              // Parse successful response and update analysis
              const responseData = aiResponse.data;
              
              // Extract predictions and other data from response
              const predictions = responseData.predictions || responseData.results || [];
              const primaryPrediction = predictions[0] || {};
              
              // Prepare update data
              const updateData: any = {
                analysis_status: "completed",
                predictions: predictions,
                confidence_score: primaryPrediction.confidence || responseData.confidence || 0,
                ai_confidence: primaryPrediction.confidence || responseData.confidence || 0,
                retry_count: retryCount,
                part_name: primaryPrediction.class_name || primaryPrediction.name || analysis.part_name,
                manufacturer: primaryPrediction.manufacturer || analysis.manufacturer,
                category: primaryPrediction.category || analysis.category,
                part_number: primaryPrediction.part_number || analysis.part_number,
                processing_time: responseData.processing_time || responseData.processing_time_seconds || 0,
                processing_time_ms: (responseData.processing_time || responseData.processing_time_seconds || 0) * 1000,
                model_version: responseData.model_version || responseData.ai_model_version || "SpareFinder AI v1",
                parts_found: predictions.length,
                is_match: (primaryPrediction.confidence || responseData.confidence || 0) > 0.5,
                error_message: null, // Clear error message on success
                updated_at: new Date().toISOString(),
                metadata: {
                  ...(analysis.metadata || {}),
                  retry_count: retryCount,
                  last_retry_at: new Date().toISOString(),
                  retry_successful: true,
                  ai_service_response: responseData,
                },
              };
              
              // Add full analysis if available
              if (responseData.full_analysis || responseData.analysis) {
                updateData.full_analysis = responseData.full_analysis || responseData.analysis;
              }
              
              // Add similar images if available
              if (responseData.similar_images) {
                updateData.similar_images = responseData.similar_images;
              }
              
              // Update analysis with successful result
              const { error: updateError } = await supabase
                .from("part_searches")
                .update(updateData)
                .eq("id", analysis.id);
              
              if (updateError) {
                console.error(`❌ Failed to update analysis ${analysis.id} after retry:`, updateError);
                throw updateError;
              }

              console.log(`✅ Retry successful for analysis ${analysis.id} - updated with ${predictions.length} predictions`);
            } else {
              throw new Error(`AI service returned status ${aiResponse.status}`);
            }
          } catch (retryError: any) {
            console.error(`❌ Retry failed for analysis ${analysis.id}:`, retryError);

            // Update to failed again
            const failedMetadata = {
              ...(analysis.metadata || {}),
              retry_count: retryCount,
              last_retry_error: retryError instanceof Error ? retryError.message : "Retry failed",
            };

            await supabase
              .from("part_searches")
              .update({
                analysis_status: "failed",
                error_message:
                  retryError instanceof Error
                    ? retryError.message
                    : "Retry failed",
                retry_count: retryCount,
                metadata: failedMetadata,
                updated_at: new Date().toISOString(),
              })
              .eq("id", analysis.id);
          }
        });
      } catch (retryError) {
        console.error(
          `❌ Error processing retry for analysis ${analysis.id}:`,
          retryError
        );
      }
    }
  } catch (error) {
    console.error("❌ Error in image analysis auto-retry process:", error);
  }
}, 3 * 60 * 1000); // Run every 3 minutes

// Long-running job notifier: send "Analysis Processing" email once for jobs that are still running.
// This ensures users get an update while SpareFinder Research is ongoing.
setInterval(async () => {
  try {
    const thresholdMinutes = Math.max(
      1,
      Number(process.env.ANALYSIS_PROCESSING_EMAIL_MINUTES) || 10
    );
    const cutoffIso = new Date(
      Date.now() - thresholdMinutes * 60 * 1000
    ).toISOString();

    const { data: jobs, error } = await supabase
      .from("crew_analysis_jobs")
      .select("id, user_id, user_email, created_at, status, progress")
      .eq("status", "processing")
      .lt("created_at", cutoffIso)
      .limit(25);

    if (error) {
      console.error("❌ Error fetching long-running crew jobs:", error);
      return;
    }
    if (!jobs || jobs.length === 0) return;

    for (const job of jobs) {
      try {
        const userId = job.user_id as string | null;
        if (!userId) continue;

        // Avoid duplicates: skip if we already created an analysis_processing notification for this job
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .contains("metadata", {
            type: "analysis_processing",
            analysis_id: job.id,
          })
          .limit(1);

        if (existing && existing.length > 0) continue;

        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        const email =
          (profile?.email as string | null) ||
          (job.user_email as string | null) ||
          "";
        if (!email) continue;

        const userName =
          (profile?.full_name as string | null) ||
          (email.split("@")[0] ?? "User");

        const createdAtMs = job.created_at
          ? new Date(job.created_at as string).getTime()
          : Date.now();
        const processingTimeMinutes = Math.max(
          1,
          Math.round((Date.now() - createdAtMs) / 60000)
        );

        emailService
          .sendAnalysisProcessingEmail({
            userEmail: email,
            userName,
            analysisId: String(job.id),
            processingTimeMinutes,
          })
          .catch((e) =>
            console.error("Failed to send analysis processing email:", e)
          );
      } catch (e) {
        console.error("Error processing long-running job email:", e);
      }
    }
  } catch (e) {
    console.error("❌ Long-running job email notifier failed:", e);
  }
}, 10 * 60 * 1000); // Run every 10 minutes

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."));
    }
  },
});

// Multer error handler
const handleMulterError = (err: any, _req: any, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large",
        message: "File size must be less than 10MB",
      });
    }
    return res.status(400).json({
      error: "Upload error",
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      error: "Upload error",
      message: err.message,
    });
  }

  return next();
};

// File upload status endpoint
router.get(
  "/status",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL;
      let aiServiceStatus = "not_configured";
      let aiServiceDetails = null;

      // Check AI service health if configured
      if (aiServiceUrl) {
        try {
          const aiServiceHealth = await axios.get(`${aiServiceUrl}/health`, {
            timeout: 5000,
            validateStatus: (status) => status < 500,
          });

          aiServiceStatus = "healthy";
          aiServiceDetails = {
            url: aiServiceUrl,
            status: aiServiceHealth.status,
            response_time:
              aiServiceHealth.headers["x-response-time"] || "unknown",
          };
        } catch (error) {
          aiServiceStatus = "unavailable";
          aiServiceDetails = {
            url: aiServiceUrl,
            error: axios.isAxiosError(error)
              ? {
                  code: error.code,
                  status: error.response?.status,
                  message: error.message,
                }
              : "Unknown error",
          };
        }
      }

      return res.json({
        message: "Upload service is running",
        max_file_size: "10MB",
        supported_formats: ["jpg", "jpeg", "png", "webp"],
        user_id: req.user!.userId,
        ai_service_status: aiServiceStatus,
        ai_service_details: aiServiceDetails,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Upload status error:", error);
      return res.status(500).json({
        error: "Failed to check service status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Image upload and analysis endpoint
router.post(
  "/image",
  authenticateToken,
  requireSubscriptionOrTrial,
  upload.single("image"),
  handleMulterError,
  async (req: AuthRequest, res: Response) => {
    try {
      console.log("Upload request received:", {
        hasFile: !!req.file,
        contentType: req.headers["content-type"],
        body: req.body,
        user: req.user?.userId,
      });

      if (!req.file) {
        console.log("No file in request");
        return res.status(400).json({
          error: "No image file provided",
        });
      }

      const { buffer, originalname, mimetype, size } = req.file;
      const userId = req.user!.userId;

      console.log("File details:", {
        originalname,
        mimetype,
        size,
        userId,
      });

      // Step 1: Credits (admins have unlimited access)
      if (req.user?.role === "admin" || req.user?.role === "super_admin") {
        console.log(
          "Admin upload detected - bypassing credits for user:",
          userId
        );
      } else {
        console.log("Checking user credits for analysis...");
        const creditResult: CreditResult =
          await creditService.processAnalysisCredits(userId);

        if (!creditResult.success) {
          console.log("Insufficient credits for user:", userId, creditResult);
          return res.status(402).json({
            success: false,
            error: "insufficient_credits",
            message: "You do not have enough credits to perform this analysis",
            current_credits: creditResult.current_credits || 0,
            required_credits: creditResult.required_credits || 1,
            upgrade_required: true,
          });
        }

        console.log("Credits deducted successfully:", {
          userId,
          credits_before: creditResult.credits_before,
          credits_after: creditResult.credits_after,
        });
      }

      // Step 1.5: Enforce storage quota per subscription tier
      // (search limits are enforced via credits; storage is enforced here)
      try {
        const limits = (res.locals as any)?.subscriptionLimits as
          | { storage: number }
          | undefined;
        const storageLimit = limits?.storage ?? -1;
        if (storageLimit !== -1) {
          const usage = await getUsageRow(userId);
          const nextStorage = usage.storage_used + size;
          if (nextStorage > storageLimit) {
            return res.status(413).json({
              success: false,
              error: "storage_limit_exceeded",
              message:
                "Storage limit reached for your current plan. Please upgrade to upload more files.",
              storage_used: usage.storage_used,
              storage_limit: storageLimit,
              bytes_attempted: size,
              upgrade_required: true,
            });
          }
        }
      } catch (e) {
        console.warn("⚠️ Storage quota check failed (allowing upload):", e);
      }

      // Step 2: Upload image to Supabase Storage for persistence
      const bucketName = process.env.SUPABASE_BUCKET_NAME || "sparefinder";
      const fileName = `${userId}/${Date.now()}-${originalname}`;
      const { data: _storageData, error: storageError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, buffer, {
          contentType: mimetype,
          cacheControl: "3600",
        });

      if (storageError) {
        console.error("Storage upload error:", storageError);
        return res.status(500).json({
          error: "Failed to store image",
          details: storageError,
        });
      }

      // Get public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log("📦 Uploaded to Supabase Storage:", {
        fileName,
        publicUrl: urlData.publicUrl,
        bucketName,
      });

      // Track usage for billing dashboard
      // - 1 search per analysis request
      // - storage usage accumulates uploaded bytes
      // Best-effort (don't fail upload if tracking fails)
      setImmediate(async () => {
        try {
          await incrementUsage({ userId, searches: 1 });
          await incrementStorage({ userId, bytes: size });
        } catch (e) {
          console.warn("⚠️ Failed to update usage_tracking for upload:", e);
        }
      });

      // Step 3: Check AI service availability and send image for analysis
      const aiServiceUrl = process.env.AI_SERVICE_URL;
      const aiServiceApiKey = process.env.AI_SERVICE_API_KEY;

      console.log("Preparing AI service request:", {
        aiServiceUrl,
        hasApiKey: !!aiServiceApiKey,
        fileSize: buffer.length,
      });

      // Check if AI service is configured
      if (!aiServiceUrl) {
        console.error("AI_SERVICE_URL not configured");
        return res.status(500).json({
          success: false,
          error: "AI service not configured",
          message:
            "The AI analysis service is not properly configured. Please contact support.",
          id: uuidv4(),
          image_url: urlData.publicUrl,
        });
      }

      const formData = new FormData();
      formData.append("file", buffer, {
        filename: originalname,
        contentType: mimetype,
      });

      // Add Supabase Storage URL so AI service can store it
      console.log("🔗 Adding image_url to FormData:", urlData.publicUrl);
      formData.append("image_url", urlData.publicUrl);

      // Add metadata if provided
      if (req.body.metadata) {
        try {
          const metadata =
            typeof req.body.metadata === "string"
              ? JSON.parse(req.body.metadata)
              : req.body.metadata;

          formData.append(
            "confidence_threshold",
            metadata.confidenceThreshold || "0.5"
          );
          formData.append("include_external_search", "true");
        } catch (metadataError) {
          console.warn("Invalid metadata format:", metadataError);
        }
      }

      // Add user email for AI service notifications
      try {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .single();

        if (userProfile?.email) {
          formData.append("user_email", userProfile.email);
          console.log(
            "📧 User email added to AI service request:",
            userProfile.email
          );
        }
      } catch (emailError) {
        console.warn("Failed to get user email for AI service:", emailError);
      }

      console.log("Sending request to AI service...");

      // Send "Analysis Started" email notification
      try {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (userProfile?.email) {
          const currentDate = new Date().toLocaleDateString();
          const currentTime = new Date().toLocaleTimeString();
          const dashboardUrl = `${
            process.env.FRONTEND_URL || "https://app.sparefinder.org"
          }/dashboard`;

          // Send analysis started email using template
          await emailService
            .sendTemplateEmail({
              templateName: "Analysis Started",
              userEmail: userProfile.email,
              variables: {
                userName: userProfile.full_name || "User",
                dashboardUrl: dashboardUrl,
                currentDate: currentDate,
                currentTime: currentTime,
              },
            })
            .catch((error) => {
              console.error("Failed to send analysis started email:", error);
            });

          console.log("📧 Analysis started email sent to:", userProfile.email);
        }
      } catch (emailError) {
        console.error("Error sending analysis started email:", emailError);
        // Don't fail the request if email fails
      }

      let aiResponse;
      const start = Date.now();
      
      try {
        // First check if AI service is healthy
        const healthCheck = await axios
          .get(`${aiServiceUrl}/health`, {
            timeout: 5000,
            validateStatus: (status) => status < 500, // Accept 4xx as valid response
          })
          .catch(() => null);

        if (!healthCheck) {
          throw new Error("AI service health check failed");
        }

        // Single-call logic for AI analysis (no client-side retry loop)
        console.log(
          `🚀 Calling AI analyze-part endpoint: ${aiServiceUrl}/analyze-part`
        );

        aiResponse = await axios.post(
          `${aiServiceUrl}/analyze-part`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              ...(aiServiceApiKey && {
                Authorization: `Bearer ${aiServiceApiKey}`,
              }),
            },
            timeout: 120000, // 120 second timeout to accommodate longer AI analysis
            // Let us see 4xx responses (including 429) without throwing
            validateStatus: (status) => status < 500,
          }
        );

        console.log("🔄 AI analyze-part response:", {
          status: aiResponse.status,
          data: aiResponse.data,
        });

        const duration = Date.now() - start;

        // Handle rate limit response in a single, non-retrying pass
        if (aiResponse.status === 429) {
          sendAiErrorAlert("AI image analysis rate limited", {
            status: aiResponse.status,
            data: aiResponse.data,
          });

          return res.status(502).json({
            success: false,
            error: "ai_service_rate_limited",
            message:
              "The AI analysis service is temporarily rate limited by its provider. Please try again shortly.",
            elapsed_ms: duration,
          });
        }

        // Handle other non-success responses
        if (aiResponse.status < 200 || aiResponse.status >= 300) {
          sendAiErrorAlert("AI image analysis error response", {
            status: aiResponse.status,
            data: aiResponse.data,
          });

          return res.status(502).json({
            success: false,
            error: "ai_service_error",
            message: `AI service returned status ${aiResponse.status}`,
            data: aiResponse.data,
            elapsed_ms: duration,
          });
        }

      } catch (aiError: any) {
        console.error("AI service error:", aiError);

        // Check if this is a 429 rate limit error - set to pending instead of failed
        if (axios.isAxiosError(aiError) && aiError.response?.status === 429) {
          const duration = Date.now() - start;

          sendAiErrorAlert("AI image analysis rate limited (axios error)", {
            message: aiError.message,
            status: aiError.response.status,
            data: aiError.response.data,
          });

          // Determine if error is retryable (429 is always retryable)
          const isRetryable = true;
          const analysisStatus = isRetryable ? "pending" : "failed";
          
          // Save as pending for retry
          const pendingData: PartSearchData = {
            id: uuidv4(),
            user_id: userId,
            image_url: urlData.publicUrl,
            image_name: originalname,
            predictions: [],
            confidence_score: 0,
            processing_time: 0,
            ai_model_version: "pending",
            analysis_status: analysisStatus,
            error_message: undefined, // Don't store error message for pending
            image_size_bytes: size,
            image_format: mimetype,
            upload_source: "web",
            web_scraping_used: false,
            sites_searched: 0,
            parts_found: 0,
            metadata: {
              ai_service_error: "ai_service_rate_limited",
              ai_service_url: aiServiceUrl,
              retry_count: 0,
              error_details: {
                code: aiError.code,
                status: aiError.response?.status,
                statusText: aiError.response?.statusText,
              },
            },
          };

          // Save pending analysis to database
          const logResult429 = await DatabaseLogger.logPartSearch(pendingData);
          if (!logResult429.success) {
            console.error("Database logging error for pending upload:", logResult429.error);
          }

          // Also log search history
          const searchHistoryData429: SearchHistoryData = {
            user_id: userId,
            part_search_id: pendingData.id,
            search_type: "image_upload",
            search_query: originalname,
            results_count: 0,
            session_id: req.headers["x-session-id"] as string,
            ip_address: req.ip,
            user_agent: req.headers["user-agent"],
          };
          await DatabaseLogger.logSearchHistory(searchHistoryData429);

          // Send email notification to user
          try {
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", userId)
              .single();

            if (userProfile?.email) {
              const currentDate = new Date().toLocaleDateString();
              const currentTime = new Date().toLocaleTimeString();
              const dashboardUrl = `${
                process.env.FRONTEND_URL || "https://sparefinder.org"
              }/dashboard`;

              // Collect detailed error logs
              const errorLogs = collectErrorLogs(
                aiError,
                "ai_service_rate_limited",
                aiError.message || "Rate limit error",
                userId,
                originalname,
                size,
                mimetype,
                aiServiceUrl,
                req
              );

              // Send user-friendly email
              await emailService
                .sendTemplateEmail({
                  templateName: "Analysis Failed",
                  userEmail: userProfile.email,
                  variables: {
                    userName: userProfile.full_name || "User",
                    errorMessage: "AI service is temporarily rate limited. Your analysis is queued and will be processed automatically when the service is available.",
                    dashboardUrl: dashboardUrl,
                    currentDate: currentDate,
                    currentTime: currentTime,
                  },
                })
                .catch((error) => {
                  console.error("Failed to send pending analysis email:", error);
                });

              // Send detailed error logs email
              await emailService
                .sendEmail({
                  to: userProfile.email,
                  subject: `[SpareFinder] Detailed Error Logs - Analysis ID: ${pendingData.id}`,
                  html: `
                    <h2>Detailed Error Logs</h2>
                    <p>Your analysis encountered an error. Below are the detailed logs for troubleshooting:</p>
                    <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: monospace; font-size: 12px;">${errorLogs}</pre>
                    <p><strong>Analysis ID:</strong> ${pendingData.id}</p>
                    <p><strong>Status:</strong> Pending (will be retried automatically)</p>
                    <p><a href="${dashboardUrl}">View Dashboard</a></p>
                  `,
                })
                .catch((error) => {
                  console.error("Failed to send error logs email:", error);
                });

              console.log("📧 Pending analysis email and error logs sent to:", userProfile.email);
            }
          } catch (emailError) {
            console.error("Error sending pending analysis email:", emailError);
          }

          // Return success with pending status - don't show error to user
          return res.status(200).json({
            success: true,
            status: "pending",
            message: "Your analysis is being processed. You'll receive an email when it's complete.",
            id: pendingData.id,
            image_url: urlData.publicUrl,
            elapsed_ms: duration,
          });
        }

        // Determine error type and if it's retryable
        let errorType = "unknown";
        let errorMessage = "AI service unavailable";
        let isRetryable = false;

        if (axios.isAxiosError(aiError)) {
          if (aiError.code === "ECONNREFUSED" || aiError.code === "ENOTFOUND") {
            errorType = "connection_refused";
            errorMessage = "Cannot connect to AI service";
            isRetryable = true;
          } else if (aiError.code === "ECONNABORTED") {
            errorType = "timeout";
            errorMessage = "AI service request timed out";
            isRetryable = true;
          } else if (aiError.response?.status === 401) {
            errorType = "unauthorized";
            errorMessage = "AI service authentication failed";
            isRetryable = false; // Auth errors are not retryable
          } else if (aiError.response?.status === 413) {
            errorType = "file_too_large";
            errorMessage = "Image file is too large for AI service";
            isRetryable = false; // File size errors are not retryable
          } else if (
            aiError.response?.status &&
            aiError.response.status >= 400 &&
            aiError.response.status < 500 &&
            aiError.response.status !== 429 // Already handled above
          ) {
            errorType = "client_error";
            errorMessage = `AI service error: ${
              aiError.response.data?.message || aiError.response.statusText
            }`;
            isRetryable = false; // Client errors are usually not retryable
          } else {
            errorType = "server_error";
            errorMessage = "AI service is experiencing issues";
            isRetryable = true; // Server errors are retryable
          }

          // Send a compact error alert email for non-429 Axios errors
          sendAiErrorAlert("AI image analysis Axios error", {
            message: aiError.message,
            code: aiError.code,
            status: aiError.response?.status,
            data: aiError.response?.data,
          });
        } else {
          // Non-Axios error - treat as retryable
          errorType = "unknown";
          errorMessage = "AI service unavailable";
          isRetryable = true;
          sendAiErrorAlert("AI image analysis unexpected error", {
            message: String(aiError),
          });
        }

        // Always set to pending for auto-retry (except truly non-retryable errors)
        // This ensures failed analyses don't show in UI
        const shouldAutoRetry = isRetryable || errorType === "server_error" || errorType === "connection_refused" || errorType === "timeout";
        const analysisStatus = shouldAutoRetry ? "pending" : "failed";
        
        // If AI service is down, save the upload with pending/failed status
        const fallbackData: PartSearchData = {
          id: uuidv4(),
          user_id: userId,
          image_url: urlData.publicUrl,
          image_name: originalname,
          predictions: [],
          confidence_score: 0,
          processing_time: 0,
          ai_model_version: shouldAutoRetry ? "pending" : "offline",
          analysis_status: analysisStatus,
          error_message: shouldAutoRetry ? undefined : errorMessage, // Don't store error for pending
          image_size_bytes: size,
          image_format: mimetype,
          upload_source: "web",
          web_scraping_used: false,
          sites_searched: 0,
          parts_found: 0,
          metadata: {
            ai_service_error: errorType,
            ai_service_url: aiServiceUrl,
            retry_count: 0, // Initialize retry count for auto-retry system
            error_details: axios.isAxiosError(aiError)
              ? {
                  code: aiError.code,
                  status: aiError.response?.status,
                  statusText: aiError.response?.statusText,
                }
              : undefined,
          },
        };

        // Save the failed/pending attempt to database using enhanced logger
        const logResultError = await DatabaseLogger.logPartSearch(fallbackData);
        if (!logResultError.success) {
          console.error(
            "Database logging error for upload:",
            logResultError.error
          );
        }

        // Also log search history
        const searchHistoryDataError: SearchHistoryData = {
          user_id: userId,
          part_search_id: fallbackData.id,
          search_type: "image_upload",
          search_query: originalname,
          results_count: 0,
          session_id: req.headers["x-session-id"] as string,
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
        };
        await DatabaseLogger.logSearchHistory(searchHistoryDataError);

        // Auto-retry failed analyses via crew endpoint
        // This ensures failed analyses don't show in UI and get processed automatically
        if (shouldAutoRetry) {
          console.log("🔄 Auto-retrying failed analysis via crew endpoint:", fallbackData.id);

          // Retry via crew endpoint in background
          setImmediate(async () => {
            try {
              // Download image from storage
              const imagePath = urlData.publicUrl.replace(/^.*\/sparefinder\//, "");
              const { data: imageData, error: downloadError } = await supabase.storage
                .from("sparefinder")
                .download(imagePath);

              if (downloadError || !imageData) {
                console.error("❌ Failed to download image for retry:", downloadError);
                return;
              }

              // Convert blob to buffer
              const arrayBuffer = await imageData.arrayBuffer();
              const imageBuffer = Buffer.from(arrayBuffer);

              // Get user email for crew analysis
              const { data: userProfile } = await supabase
                .from("profiles")
                .select("email")
                .eq("id", userId)
                .single();

              // Start crew analysis
              await startCrewAnalysis(
                fallbackData.id,
                imageBuffer,
                originalname,
                mimetype,
                userProfile?.email || "",
                "" // No keywords for initial retry
              );

              console.log("✅ Auto-retry initiated for analysis:", fallbackData.id);
            } catch (retryError) {
              console.error("❌ Auto-retry failed for analysis:", fallbackData.id, retryError);
              // Keep as pending - will be retried by the interval-based retry system
            }
          });

          console.log("Analysis set to pending (auto-retry initiated), credits will be refunded if retry fails");
        } else {
          // Only refund credits for truly non-retryable errors (file too large, auth errors)
          console.log("Analysis failed (non-retryable), refunding credits to user:", userId);
          try {
            const refundResult = await creditService.refundAnalysisCredits(
              userId,
              `Analysis failed: ${errorMessage}`
            );
            if (refundResult.success) {
              console.log("Credits refunded successfully:", refundResult);
            } else {
              console.error("Failed to refund credits:", refundResult.error);
            }
          } catch (refundError) {
            console.error("Error during credit refund:", refundError);
          }
        }

        // Send email notification to user (for both pending and failed)
        try {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", userId)
            .single();

          if (userProfile?.email) {
            const currentDate = new Date().toLocaleDateString();
            const currentTime = new Date().toLocaleTimeString();
            const dashboardUrl = `${
              process.env.FRONTEND_URL || "https://app.sparefinder.org"
            }/dashboard`;

            // Collect detailed error logs
            const errorLogs = collectErrorLogs(
              aiError,
              errorType,
              errorMessage,
              userId,
              originalname,
              size,
              mimetype,
              aiServiceUrl,
              req
            );

            // Send user-friendly email notification
            await emailService
              .sendTemplateEmail({
                templateName: "Analysis Failed",
                userEmail: userProfile.email,
                variables: {
                  userName: userProfile.full_name || "User",
                  errorMessage: isRetryable 
                    ? "AI service is temporarily unavailable. Your analysis is queued and will be processed automatically when the service is available. You'll receive an email when it's complete."
                    : errorMessage,
                  dashboardUrl: dashboardUrl,
                  currentDate: currentDate,
                  currentTime: currentTime,
                },
              })
              .catch((error) => {
                console.error("Failed to send analysis notification email:", error);
              });

            // Send detailed error logs email
            await emailService
              .sendEmail({
                to: userProfile.email,
                subject: `[SpareFinder] Detailed Error Logs - Analysis ID: ${fallbackData.id}`,
                html: `
                  <h2>Detailed Error Logs</h2>
                  <p>Your analysis encountered an error. Below are the detailed logs for troubleshooting:</p>
                  <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: monospace; font-size: 12px;">${errorLogs}</pre>
                  <p><strong>Analysis ID:</strong> ${fallbackData.id}</p>
                  <p><strong>Status:</strong> ${analysisStatus}</p>
                  <p><strong>Error Type:</strong> ${errorType}</p>
                  <p><a href="${dashboardUrl}">View Dashboard</a></p>
                `,
              })
              .catch((error) => {
                console.error("Failed to send error logs email:", error);
              });

            console.log(`📧 Analysis ${analysisStatus} email and error logs sent to:`, userProfile.email);
          }
        } catch (emailError) {
          console.error("Error sending analysis notification email:", emailError);
          // Don't fail the request if email fails
        }

        // Always return success with pending status for auto-retry
        // This ensures failed analyses don't show in UI and get processed automatically
        return res.status(200).json({
          success: true,
          status: "pending",
          message: "Your analysis is being processed. You'll receive an email when it's complete.",
          id: fallbackData.id,
          image_url: urlData.publicUrl,
        });
      }

      console.log("AI service response received:", {
        status: aiResponse.status,
        hasData: !!aiResponse.data,
        filename: aiResponse.data?.filename,
        predictionsCount: aiResponse.data?.predictions?.length || 0,
        aiServiceStatus: aiResponse.data?.status,
        success: aiResponse.data?.success,
      });

      // Check if analysis is taking longer than expected (for future enhancement)
      // This could be used to send "Analysis Processing" emails for long-running jobs
      const initialProcessingTime =
        aiResponse.data?.processing_time_seconds || 0;
      if (initialProcessingTime > 60) {
        // If analysis took more than 1 minute
        console.log(
          `Analysis took ${initialProcessingTime} seconds - considered long-running`
        );
        // Could send "Analysis Processing" email here if needed
      }

      // Debug: Log the full AI response
      console.log(
        "Full AI service response:",
        JSON.stringify(aiResponse.data, null, 2)
      );

      // Step 4: Save analysis result to database using enhanced logger
      // Handle both flat format (new) and predictions array (legacy)
      const isFlat =
        aiResponse.data.class_name || aiResponse.data.precise_part_name;
      const partName = isFlat
        ? aiResponse.data.precise_part_name || aiResponse.data.class_name
        : aiResponse.data.predictions?.[0]?.class_name;
      const confidence = isFlat
        ? (aiResponse.data.confidence_score || 0) / 100 // Convert percentage to decimal
        : aiResponse.data.predictions?.[0]?.confidence || 0;
      const processingTime = isFlat
        ? aiResponse.data.processing_time_seconds || 0
        : aiResponse.data.processing_time || 0;

      const analysisData: PartSearchData = {
        id:
          aiResponse.data.filename &&
          aiResponse.data.filename.match(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          )
            ? aiResponse.data.filename
            : uuidv4(),
        user_id: userId,
        image_url: urlData.publicUrl,
        image_name: originalname,
        predictions: isFlat
          ? [
              {
                class_name: partName,
                confidence: confidence,
                description:
                  aiResponse.data.description ||
                  aiResponse.data.full_analysis ||
                  "",
                category: aiResponse.data.category || "Unknown",
                manufacturer: aiResponse.data.manufacturer || "Unknown",
              },
            ]
          : aiResponse.data.predictions || [],
        confidence_score: confidence,
        processing_time: processingTime,
        ai_model_version: aiResponse.data.model_version || "SpareFinderAI v1.0",
        analysis_status: aiResponse.data.success ? "completed" : "failed",
        image_size_bytes: size,
        image_format: mimetype,
        upload_source: "web",
        web_scraping_used: false,
        sites_searched: 0,
        parts_found: isFlat
          ? partName
            ? 1
            : 0
          : aiResponse.data.predictions?.length || 0,
        similar_images: [],
        search_query: partName,
        metadata: {
          filename: aiResponse.data.filename,
          analysis:
            aiResponse.data.full_analysis ||
            aiResponse.data.description ||
            aiResponse.data.analysis,
          flat_data: isFlat ? aiResponse.data : undefined, // Store full flat response
          ...(req.body.metadata && JSON.parse(req.body.metadata)),
        },
      };

      const logResult = await DatabaseLogger.logPartSearch(analysisData);
      if (!logResult.success) {
        console.error("Database logging error:", logResult.error);
        // Continue anyway - the AI analysis was successful
      }

      // Also log search history for successful uploads
      const searchHistoryData: SearchHistoryData = {
        user_id: userId,
        part_search_id: analysisData.id,
        search_type: "image_upload",
        search_query: originalname,
        results_count: isFlat
          ? partName
            ? 1
            : 0
          : (aiResponse.data.predictions?.length || 0) +
            (aiResponse.data.similar_images?.length || 0),
        session_id: req.headers["x-session-id"] as string,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      };
      await DatabaseLogger.logSearchHistory(searchHistoryData);

      // Step 5: Send email notifications based on analysis status
      try {
        // Get user details for email
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (userProfile?.email) {
          const currentDate = new Date().toLocaleDateString();
          const currentTime = new Date().toLocaleTimeString();
          const dashboardUrl = `${
            process.env.FRONTEND_URL || "https://app.sparefinder.org"
          }/dashboard`;

          if (aiResponse.data.success && partName) {
            // Analysis completed successfully
            const emailData: AnalysisEmailData = {
              userEmail: userProfile.email,
              userName: userProfile.full_name || "User",
              partName: partName,
              confidence: confidence,
              description:
                aiResponse.data.description ||
                aiResponse.data.full_analysis ||
                "Part analysis completed successfully",
              imageUrl: urlData.publicUrl,
              analysisId: analysisData.id,
              processingTime: processingTime,
            };

            // Send analysis complete email (non-blocking)
            emailService.sendAnalysisCompleteEmail(emailData).catch((error) => {
              console.error("Failed to send analysis complete email:", error);
            });

            console.log(
              "✅ Email notification triggered for successful analysis:",
              partName
            );
          } else {
            // Analysis failed
            const errorMessage =
              aiResponse.data.error || "Analysis failed due to unknown reasons";

            // Collect error logs from AI response
            const errorLogs = JSON.stringify({
              timestamp: new Date().toISOString(),
              error_type: "analysis_failed",
              error_message: errorMessage,
              user_id: userId,
              file_info: {
                filename: originalname,
                size_bytes: size,
                mime_type: mimetype,
              },
              ai_service_response: aiResponse.data,
              request_info: {
                method: req.method,
                url: req.url,
                ip: req.ip,
                user_agent: req.headers["user-agent"],
                session_id: req.headers["x-session-id"],
              },
            }, null, 2);

            // Send user-friendly analysis failed email
            await emailService
              .sendTemplateEmail({
                templateName: "Analysis Failed",
                userEmail: userProfile.email,
                variables: {
                  userName: userProfile.full_name || "User",
                  errorMessage: errorMessage,
                  dashboardUrl: dashboardUrl,
                  currentDate: currentDate,
                  currentTime: currentTime,
                },
              })
              .catch((error) => {
                console.error("Failed to send analysis failed email:", error);
              });

            // Send detailed error logs email
            await emailService
              .sendEmail({
                to: userProfile.email,
                subject: `[SpareFinder] Detailed Error Logs - Analysis Failed`,
                html: `
                  <h2>Detailed Error Logs</h2>
                  <p>Your analysis failed. Below are the detailed logs for troubleshooting:</p>
                  <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: monospace; font-size: 12px;">${errorLogs}</pre>
                  <p><strong>Error Message:</strong> ${errorMessage}</p>
                  <p><a href="${dashboardUrl}">View Dashboard</a></p>
                `,
              })
              .catch((error) => {
                console.error("Failed to send error logs email:", error);
              });

            console.log("⚠️ Email notification and error logs sent for failed analysis");
          }
        }
      } catch (emailError) {
        console.error("Error preparing email notification:", emailError);
        // Don't fail the request if email fails
      }

      // Step 6: Return results to frontend
      // Return flat format directly if available, otherwise legacy format
      if (isFlat) {
        return res.json({
          success: aiResponse.data.success || true,
          data: aiResponse.data, // Return the flat data structure
          id: aiResponse.data.filename,
          image_url: urlData.publicUrl,
          predictions: analysisData.predictions, // Backward compatibility
          processing_time: processingTime,
          model_version: aiResponse.data.model_version,
          confidence: aiResponse.data.confidence_score || 0,
          analysis:
            aiResponse.data.full_analysis || aiResponse.data.description,
          metadata: {
            file_size: size,
            file_type: mimetype,
            upload_timestamp: new Date().toISOString(),
            filename: aiResponse.data.filename,
          },
        });
      } else {
        // Legacy format response
        return res.json({
          success: aiResponse.data.success || true,
          data: aiResponse.data.predictions || [],
          id: aiResponse.data.filename,
          image_url: urlData.publicUrl,
          predictions: aiResponse.data.predictions || [],
          processing_time: aiResponse.data.processing_time || 0,
          model_version: aiResponse.data.model_version,
          confidence: aiResponse.data.predictions?.[0]?.confidence || 0,
          analysis: aiResponse.data.analysis,
          metadata: {
            file_size: size,
            file_type: mimetype,
            upload_timestamp: new Date().toISOString(),
            filename: aiResponse.data.filename,
          },
        });
      }
    } catch (error) {
      console.error("Image upload/analysis error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        isAxiosError: axios.isAxiosError(error),
      });

      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || "AI service error";

        console.error("Axios error details:", {
          status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
          },
        });

        return res.status(status).json({
          error: "AI analysis failed",
          message,
          details: error.response?.data,
        });
      }

      // Refund credits and send email notification
      try {
        const userId = req.user?.userId;
        if (userId) {
          console.log(
            "General error occurred, refunding credits to user:",
            userId
          );
          const refundResult = await creditService.refundAnalysisCredits(
            userId,
            `Upload failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          if (refundResult.success) {
            console.log(
              "Credits refunded successfully after general error:",
              refundResult
            );
          }

          // Send email notification with detailed error logs
          try {
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", userId)
              .single();

            if (userProfile?.email) {
              const currentDate = new Date().toLocaleDateString();
              const currentTime = new Date().toLocaleTimeString();
              const dashboardUrl = `${
                process.env.FRONTEND_URL || "https://app.sparefinder.org"
              }/dashboard`;

              // Collect comprehensive error logs
              const errorLogs = collectErrorLogs(
                error,
                "general_upload_error",
                error instanceof Error ? error.message : "Unknown error",
                userId,
                req.file?.originalname || "unknown",
                req.file?.size || 0,
                req.file?.mimetype || "unknown",
                process.env.AI_SERVICE_URL || "unknown",
                req
              );

              // Send user-friendly error email
              await emailService
                .sendTemplateEmail({
                  templateName: "Analysis Failed",
                  userEmail: userProfile.email,
                  variables: {
                    userName: userProfile.full_name || "User",
                    errorMessage: error instanceof Error ? error.message : "Unknown error occurred during upload",
                    dashboardUrl: dashboardUrl,
                    currentDate: currentDate,
                    currentTime: currentTime,
                  },
                })
                .catch((emailErr) => {
                  console.error("Failed to send error notification email:", emailErr);
                });

              // Send detailed error logs email
              await emailService
                .sendEmail({
                  to: userProfile.email,
                  subject: `[SpareFinder] Detailed Error Logs - Upload Failed`,
                  html: `
                    <h2>Detailed Error Logs</h2>
                    <p>Your upload encountered an error. Below are the detailed logs for troubleshooting:</p>
                    <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: monospace; font-size: 12px;">${errorLogs}</pre>
                    <p><strong>Error Message:</strong> ${error instanceof Error ? error.message : "Unknown error"}</p>
                    <p><a href="${dashboardUrl}">View Dashboard</a></p>
                  `,
                })
                .catch((emailErr) => {
                  console.error("Failed to send error logs email:", emailErr);
                });

              console.log("📧 Error notification email and error logs sent to:", userProfile.email);
            }
          } catch (emailError) {
            console.error("Error sending error notification email:", emailError);
          }
        }
      } catch (refundError) {
        console.error(
          "Error during credit refund in catch block:",
          refundError
        );
      }

      return res.status(500).json({
        error: "Upload and analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
        credits_refunded: true,
      });
    }
  }
);

// Get upload history for user
router.get(
  "/history",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Extract filters from query parameters
      const filters = {
        analysis_status: req.query.status as string,
        web_scraping_used:
          req.query.web_scraping === "true"
            ? true
            : req.query.web_scraping === "false"
            ? false
            : undefined,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string,
      };

      // Remove undefined filters
      Object.keys(filters).forEach((key) => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const historyResult = await DatabaseLogger.getUserHistory(
        req.user!.userId,
        page,
        limit,
        filters
      );

      return res.json({
        success: true,
        searches: historyResult.data,
        page: historyResult.page,
        limit: historyResult.limit,
        total: historyResult.total,
        filters: filters,
      });
    } catch (error) {
      console.error("Upload history error:", error);
      return res.status(500).json({
        error: "Failed to fetch upload history",
      });
    }
  }
);

// Get user statistics
router.get(
  "/statistics",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const statistics = await DatabaseLogger.getUserStatistics(
        req.user!.userId
      );

      return res.json({
        success: true,
        statistics: statistics || {
          total_uploads: 0,
          total_successful_identifications: 0,
          total_failed_identifications: 0,
          total_web_scraping_searches: 0,
          total_similar_parts_found: 0,
          average_confidence_score: 0,
          average_processing_time: 0,
          last_upload_at: null,
        },
      });
    } catch (error) {
      console.error("User statistics error:", error);
      return res.status(500).json({
        error: "Failed to fetch user statistics",
      });
    }
  }
);

// Validation Schema for Analysis Results from Frontend - Enhanced for comprehensive data
const AnalysisResultsSchema = z.object({
  success: z.boolean(),
  predictions: z.array(
    z.object({
      class_name: z.string(),
      confidence: z.number().min(0).max(1),
      description: z.union([z.string(), z.null()]).optional(),
      category: z.union([z.string(), z.null()]).optional(),
      manufacturer: z.union([z.string(), z.null()]).optional(),
      estimated_price: z
        .union([
          z.string(),
          z.object({
            new: z.string().optional(),
            used: z.string().optional(),
            refurbished: z.string().optional(),
          }),
          z.null(),
        ])
        .optional(),
      part_number: z.union([z.string(), z.null()]).optional(),
      compatibility: z.union([z.array(z.string()), z.null()]).optional(),
    })
  ),
  similar_images: z.union([z.array(z.any()), z.null()]).optional(),
  model_version: z.string(),
  processing_time: z.number(),
  image_metadata: z.object({
    content_type: z.string(),
    size_bytes: z.number(),
    base64_image: z.union([z.string(), z.null()]).optional(),
  }),
  additional_details: z
    .object({
      full_analysis: z.union([z.string(), z.null()]).optional(),
      technical_specifications: z.union([z.string(), z.null()]).optional(),
      market_information: z.union([z.string(), z.null()]).optional(),
      confidence_reasoning: z.union([z.string(), z.null()]).optional(),
    })
    .optional(),
  image_url: z.union([z.string(), z.null()]).optional(),
  image_name: z.union([z.string(), z.null()]).optional(),
  // Additional fields from AI service response
  analysis: z.union([z.string(), z.null()]).optional(),
  confidence: z.union([z.number(), z.null()]).optional(),
  metadata: z
    .object({
      ai_service_id: z.union([z.string(), z.null()]).optional(),
      upload_timestamp: z.string().optional(),
      frontend_version: z.string().optional(),
      model_version: z.string().optional(),
      processing_time: z.number().optional(),
      // Enhanced flat data structure
      flat_data: z
        .object({
          class_name: z.union([z.string(), z.null()]).optional(),
          category: z.union([z.string(), z.null()]).optional(),
          precise_part_name: z.union([z.string(), z.null()]).optional(),
          material_composition: z.union([z.string(), z.null()]).optional(),
          manufacturer: z.union([z.string(), z.null()]).optional(),
          confidence_score: z.union([z.number(), z.null()]).optional(),
          estimated_price: z
            .union([
              z.string(),
              z.object({
                new: z.string().optional(),
                used: z.string().optional(),
                refurbished: z.string().optional(),
              }),
              z.null(),
            ])
            .optional(),
          technical_data_sheet: z.union([z.any(), z.null()]).optional(),
          compatible_vehicles: z
            .union([z.array(z.string()), z.null()])
            .optional(),
          engine_types: z.union([z.array(z.string()), z.null()]).optional(),
          suppliers: z.union([z.array(z.any()), z.null()]).optional(),
          buy_links: z.union([z.any(), z.null()]).optional(),
          fitment_tips: z.union([z.string(), z.null()]).optional(),
          additional_instructions: z.union([z.string(), z.null()]).optional(),
        })
        .optional(),
      // Enhanced analysis sections
      enhanced_sections: z
        .object({
          part_identification: z
            .object({
              name: z.union([z.string(), z.null()]).optional(),
              category: z.union([z.string(), z.null()]).optional(),
              manufacturer: z.union([z.string(), z.null()]).optional(),
              part_number: z.union([z.string(), z.null()]).optional(),
            })
            .optional(),
          technical_analysis: z
            .object({
              material: z.union([z.string(), z.null()]).optional(),
              specifications: z.union([z.any(), z.null()]).optional(),
              compatibility: z
                .union([z.array(z.string()), z.null()])
                .optional(),
            })
            .optional(),
          market_analysis: z
            .object({
              price_estimate: z
                .union([
                  z.string(),
                  z.object({
                    new: z.string().optional(),
                    used: z.string().optional(),
                    refurbished: z.string().optional(),
                  }),
                  z.null(),
                ])
                .optional(),
              suppliers: z.union([z.array(z.any()), z.null()]).optional(),
              purchase_links: z.union([z.any(), z.null()]).optional(),
            })
            .optional(),
          ai_insights: z
            .object({
              confidence_score: z.union([z.number(), z.null()]).optional(),
              confidence_explanation: z
                .union([z.string(), z.null()])
                .optional(),
              full_analysis: z.union([z.string(), z.null()]).optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

// Save Analysis Results Endpoint
router.post(
  "/save-results",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      console.log("📊 Save results request received:", {
        user: req.user?.userId,
        hasData: !!req.body,
        dataKeys: Object.keys(req.body || {}),
      });

      // Validate request body
      const validatedData = AnalysisResultsSchema.parse(req.body);
      const userId = req.user!.userId;

      // Extract primary prediction data
      const primaryPrediction = validatedData.predictions[0];

      if (!primaryPrediction) {
        return res.status(400).json({
          success: false,
          error: "No predictions provided",
          message: "At least one prediction is required to save results",
        });
      }

      // Generate unique ID for this analysis
      const analysisId = uuidv4();

      // Extract the full analysis from multiple sources - prioritize the most comprehensive
      const fullAnalysis =
        validatedData.metadata?.enhanced_sections?.ai_insights?.full_analysis ||
        (req.body as any).analysis ||
        validatedData.additional_details?.full_analysis ||
        primaryPrediction.description ||
        "";

      // Extract enhanced part information
      const partInfo = {
        name:
          validatedData.metadata?.enhanced_sections?.part_identification
            ?.name ||
          validatedData.metadata?.flat_data?.precise_part_name ||
          primaryPrediction.class_name,
        category:
          validatedData.metadata?.enhanced_sections?.part_identification
            ?.category ||
          validatedData.metadata?.flat_data?.category ||
          primaryPrediction.category,
        manufacturer:
          validatedData.metadata?.enhanced_sections?.part_identification
            ?.manufacturer ||
          validatedData.metadata?.flat_data?.manufacturer ||
          primaryPrediction.manufacturer,
        part_number:
          validatedData.metadata?.enhanced_sections?.part_identification
            ?.part_number || primaryPrediction.part_number,
      };

      // Prepare comprehensive analysis data for database
      const analysisData: PartSearchData = {
        id: analysisId,
        user_id: userId,
        image_url: validatedData.image_url || "",
        image_name: validatedData.image_name || "manual_save.jpg",
        predictions: validatedData.predictions,
        confidence_score: primaryPrediction.confidence,
        processing_time: validatedData.processing_time,
        ai_model_version: validatedData.model_version,
        analysis_status: "completed",
        image_size_bytes: validatedData.image_metadata.size_bytes,
        image_format: validatedData.image_metadata.content_type,
        upload_source: "manual_save",
        web_scraping_used: false,
        sites_searched: 0,
        parts_found: validatedData.predictions.length,
        search_query: partInfo.name,
        description: fullAnalysis,
        similar_images: validatedData.similar_images || [],
        metadata: {
          saved_manually: true,
          save_timestamp: new Date().toISOString(),
          user_agent: req.headers["user-agent"],

          // Store comprehensive analysis details
          additional_details: validatedData.additional_details,
          full_analysis_data: validatedData,
          full_analysis: fullAnalysis,

          // Enhanced part information
          enhanced_part_info: partInfo,

          // Technical specifications
          technical_data_sheet:
            validatedData.metadata?.flat_data?.technical_data_sheet,
          material_composition:
            validatedData.metadata?.flat_data?.material_composition,
          compatible_vehicles:
            validatedData.metadata?.flat_data?.compatible_vehicles,
          engine_types: validatedData.metadata?.flat_data?.engine_types,

          // Market information
          estimated_price:
            validatedData.metadata?.flat_data?.estimated_price ||
            validatedData.metadata?.enhanced_sections?.market_analysis
              ?.price_estimate,
          suppliers:
            validatedData.metadata?.flat_data?.suppliers ||
            validatedData.metadata?.enhanced_sections?.market_analysis
              ?.suppliers,
          buy_links:
            validatedData.metadata?.flat_data?.buy_links ||
            validatedData.metadata?.enhanced_sections?.market_analysis
              ?.purchase_links,

          // Installation and usage information
          fitment_tips: validatedData.metadata?.flat_data?.fitment_tips,
          additional_instructions:
            validatedData.metadata?.flat_data?.additional_instructions,

          // AI analysis insights
          confidence_score:
            validatedData.metadata?.flat_data?.confidence_score ||
            validatedData.metadata?.enhanced_sections?.ai_insights
              ?.confidence_score,
          confidence_explanation:
            validatedData.metadata?.enhanced_sections?.ai_insights
              ?.confidence_explanation,

          // Legacy compatibility
          analysis: fullAnalysis,
          confidence:
            (req.body as any).confidence || primaryPrediction.confidence,
          ai_metadata: validatedData.metadata || {},
          supabase_image_url: validatedData.image_url,

          // Complete flat data structure for future reference
          complete_flat_data: validatedData.metadata?.flat_data,
          complete_enhanced_sections: validatedData.metadata?.enhanced_sections,
        },
      };

      console.log("💾 Storing analysis data:", {
        id: analysisData.id,
        partName: primaryPrediction.class_name,
        confidence: primaryPrediction.confidence,
        predictionsCount: validatedData.predictions.length,
      });

      // Save to database using DatabaseLogger
      const logResult = await DatabaseLogger.logPartSearch(analysisData);

      if (!logResult.success) {
        console.error("❌ Database save error:", logResult.error);
        return res.status(500).json({
          success: false,
          error: "Database save failed",
          message: "Failed to save analysis results to database",
          details: logResult.error,
        });
      }

      // Also log this as a search history entry
      const searchType: SearchHistoryData["search_type"] =
        validatedData.image_metadata?.content_type === "text/keywords"
          ? "text_search"
          : "image_upload";
      const searchHistoryData: SearchHistoryData = {
        user_id: userId,
        part_search_id: analysisId,
        search_type: searchType,
        search_query: `Manual save: ${primaryPrediction.class_name}`,
        results_count: validatedData.predictions.length,
        session_id: req.headers["x-session-id"] as string,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      };

      await DatabaseLogger.logSearchHistory(searchHistoryData);

      // Send email notification for manually saved analysis results
      try {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (userProfile?.email) {
          const emailData: AnalysisEmailData = {
            userEmail: userProfile.email,
            userName: userProfile.full_name || "User",
            partName: primaryPrediction.class_name,
            confidence: primaryPrediction.confidence,
            description:
              fullAnalysis ||
              primaryPrediction.description ||
              "Part analysis saved to your history",
            imageUrl: validatedData.image_url || undefined,
            analysisId: analysisId,
            processingTime: validatedData.processing_time,
          };

          // Send email notification (non-blocking)
          emailService.sendAnalysisCompleteEmail(emailData).catch((error) => {
            console.error("Failed to send save results email:", error);
          });

          console.log(
            "✅ Email notification triggered for saved analysis:",
            primaryPrediction.class_name
          );
        }
      } catch (emailError) {
        console.error(
          "Error preparing save results email notification:",
          emailError
        );
        // Don't fail the request if email fails
      }

      console.log("✅ Analysis results saved successfully:", analysisId);

      // Create in-app notification for manual save
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Analysis Saved",
          message: `${primaryPrediction.class_name} saved to your history`,
          type: "success",
          action_url: `${
            process.env.FRONTEND_URL || "https://app.sparefinder.org"
          }/dashboard/history`,
          metadata: {
            analysis_id: analysisId,
            image_url: validatedData.image_url,
            predictions_count: validatedData.predictions?.length || 0,
          },
        });
      } catch (notifErr) {
        console.error("Failed to create save-results notification:", notifErr);
      }

      return res.status(201).json({
        success: true,
        message: "Analysis results saved successfully",
        data: {
          analysis_id: analysisId,
          part_name: primaryPrediction.class_name,
          confidence: primaryPrediction.confidence,
          predictions_count: validatedData.predictions.length,
          saved_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("💥 Save results error:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid data format",
          message: "The provided analysis data is not in the correct format",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      return res.status(500).json({
        success: false,
        error: "Save failed",
        message: "An unexpected error occurred while saving analysis results",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Legacy endpoint for backward compatibility
router.post(
  "/store-analysis",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        part_name,
        part_number,
        manufacturer,
        category,
        confidence_score,
        image_url,
        description,
      } = req.body;

      if (
        !part_name ||
        !manufacturer ||
        !category ||
        confidence_score === undefined
      ) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
          message:
            "part_name, manufacturer, category, and confidence_score are required",
        });
      }

      const userId = req.user!.userId;
      const analysisId = uuidv4();

      // Convert to new format
      const analysisData: PartSearchData = {
        id: analysisId,
        user_id: userId,
        image_url: image_url || "",
        image_name: "legacy_analysis.jpg",
        predictions: [
          {
            class_name: part_name,
            confidence: confidence_score / 100, // Convert percentage to decimal
            description: description || "",
            category: category,
            manufacturer: manufacturer,
            estimated_price: "Price not available",
            part_number: part_number,
            compatibility: [],
          },
        ],
        confidence_score: confidence_score / 100,
        processing_time: 0,
        ai_model_version: "Legacy Input",
        analysis_status: "completed",
        upload_source: "legacy_api",
        web_scraping_used: false,
        sites_searched: 0,
        parts_found: 1,
        search_query: part_name,
        metadata: {
          legacy_format: true,
          original_data: req.body,
        },
      };

      const logResult = await DatabaseLogger.logPartSearch(analysisData);

      if (!logResult.success) {
        return res.status(500).json({
          success: false,
          error: "Database save failed",
          message: "Failed to store analysis data",
        });
      }

      return res.status(201).json({
        success: true,
        message: "Part analysis stored successfully",
        analysisId: analysisId,
      });
    } catch (error) {
      console.error("Legacy store analysis error:", error);
      return res.status(500).json({
        success: false,
        error: "Store failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Delete SpareFinder Research Job
 * Deletes a specific SpareFinder Research job
 */
router.delete(
  "/crew-analysis/:jobId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { jobId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User ID not found",
        });
      }

      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: "Job ID required",
          message: "Job ID parameter is missing",
        });
      }

      console.log(
        `🗑️ Deleting SpareFinder Research job: ${jobId} for user: ${userId}`
      );

      // Delete the job (RLS will ensure user can only delete their own jobs)
      const { error: deleteError } = await supabase
        .from("crew_analysis_jobs")
        .delete()
        .eq("id", jobId)
        .eq("user_id", userId);

      if (deleteError) {
        console.error("❌ Failed to delete SpareFinder Research job:", deleteError);
        return res.status(500).json({
          success: false,
          error: "Failed to delete job",
          message: deleteError.message,
        });
      }

      console.log("✅ SpareFinder Research job deleted successfully");

      return res.status(200).json({
        success: true,
        message: "SpareFinder Research job deleted successfully",
      });
    } catch (error) {
      console.error("❌ Delete SpareFinder Research job error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Get SpareFinder Research Jobs
 * Returns all SpareFinder Research jobs for the current user
 */
router.get(
  "/crew-analysis-jobs",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User ID not found",
        });
      }

      // Fetch SpareFinder Research jobs for this user
      const { data: jobs, error: jobsError } = await supabase
        .from("crew_analysis_jobs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (jobsError) {
        console.error("❌ Failed to fetch SpareFinder Research jobs:", jobsError);

        // Return empty array if table doesn't exist yet
        if (jobsError.code === "42P01") {
          return res.status(200).json({
            success: true,
            data: [],
            message: "No SpareFinder Research jobs found",
          });
        }

        return res.status(500).json({
          success: false,
          error: "Failed to fetch jobs",
          message: jobsError.message,
        });
      }

      return res.status(200).json({
        success: true,
        data: jobs || [],
      });
    } catch (error) {
      console.error("❌ Get SpareFinder Research jobs error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Create SpareFinder Research Job
 * Creates a new SpareFinder Research job in the database and returns the job ID
 * User will be redirected to history page to watch progress
 */
router.post(
  "/crew-analysis",
  authenticateToken,
  upload.single("image"),
  handleMulterError,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User ID not found",
        });
      }

      const file = req.file;
      const keywords = req.body.keywords || "";

      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No file provided",
          message: "Image file is required for SpareFinder Research",
        });
      }

      console.log("🤖 Creating SpareFinder Research job for user:", userId);

      // Credits: admins have unlimited access, others must have at least 1 credit
      if (req.user?.role === "admin" || req.user?.role === "super_admin") {
        console.log(
          "Admin SpareFinder Research detected - bypassing credits for user:",
          userId
        );
      } else {
        console.log("Checking user credits for SpareFinder Research analysis...");
        const creditResult: CreditResult =
          await creditService.processAnalysisCredits(userId);

        if (!creditResult.success) {
          console.log(
            "Insufficient credits for SpareFinder Research user:",
            userId,
            creditResult
          );
          return res.status(402).json({
            success: false,
            error: "insufficient_credits",
            message:
              "You do not have enough credits to start a Sparefinder Research analysis",
            current_credits: creditResult.current_credits || 0,
            required_credits: creditResult.required_credits || 1,
            upgrade_required: true,
          });
        }

        console.log("SpareFinder Research credits deducted successfully:", {
          userId,
          credits_before: creditResult.credits_before,
          credits_after: creditResult.credits_after,
        });
      }

      // Upload image to Supabase Storage
      const fileExt = file.originalname.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `crew-analysis/${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("sparefinder")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Storage upload error:", uploadError);
        return res.status(500).json({
          success: false,
          error: "Upload failed",
          message: uploadError.message,
        });
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("sparefinder").getPublicUrl(filePath);

      console.log("✅ Image uploaded to:", publicUrl);

      // Get user email + name (for notifications)
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .single();

      const userEmail = userProfile?.email || "";
      const userName =
        (userProfile?.full_name as string | null) ||
        (userEmail.split("@")[0] ?? "User");

      // Create SpareFinder Research job in database
      const jobId = uuidv4();
      const { error: jobError } = await supabase
        .from("crew_analysis_jobs")
        .insert({
          id: jobId,
          user_id: userId,
          user_email: userEmail,
          image_url: publicUrl,
          image_name: file.originalname,
          keywords: keywords,
          status: "pending",
          current_stage: "initialization",
          progress: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jobError) {
        console.error("❌ Failed to create SpareFinder Research job:", jobError);

        // Try to create table if it doesn't exist
        if (jobError.code === "42P01") {
          console.log(
            "📝 crew_analysis_jobs table doesn't exist, creating it..."
          );

          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS crew_analysis_jobs (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
              user_email TEXT,
              image_url TEXT,
              image_name TEXT,
              keywords TEXT,
              status TEXT DEFAULT 'pending',
              current_stage TEXT,
              progress INTEGER DEFAULT 0,
              error_message TEXT,
              result_data JSONB,
              pdf_url TEXT,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW(),
              completed_at TIMESTAMPTZ
            );
            
            CREATE INDEX IF NOT EXISTS idx_crew_jobs_user_id ON crew_analysis_jobs(user_id);
            CREATE INDEX IF NOT EXISTS idx_crew_jobs_status ON crew_analysis_jobs(status);
            
            ALTER TABLE crew_analysis_jobs ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY IF NOT EXISTS "Users can insert their own crew jobs"
            ON crew_analysis_jobs FOR INSERT
            WITH CHECK (auth.uid() = user_id);
            
            CREATE POLICY IF NOT EXISTS "Users can view their own crew jobs"
            ON crew_analysis_jobs FOR SELECT
            USING (auth.uid() = user_id);
            
            CREATE POLICY IF NOT EXISTS "Users can update their own crew jobs"
            ON crew_analysis_jobs FOR UPDATE
            USING (auth.uid() = user_id);
          `;

          const { error: createError } = await supabase.rpc("exec_sql", {
            sql: createTableQuery,
          });

          if (!createError) {
            // Retry insertion
            const { error: retryError } = await supabase
              .from("crew_analysis_jobs")
              .insert({
                id: jobId,
                user_id: userId,
                user_email: userEmail,
                image_url: publicUrl,
                image_name: file.originalname,
                keywords: keywords,
                status: "pending",
                current_stage: "initialization",
                progress: 0,
                created_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (retryError) {
              throw retryError;
            }

            console.log("✅ SpareFinder Research job created:", jobId);

            // Fire-and-forget: send "Analysis Started" email for SpareFinder Research
            try {
              const currentDate = new Date().toLocaleDateString();
              const currentTime = new Date().toLocaleTimeString();
              const dashboardUrl = `${
                process.env.FRONTEND_URL || "https://sparefinder.org"
              }/dashboard`;

              if (userEmail) {
                emailService
                  .sendTemplateEmail({
                    templateName: "Analysis Started",
                    userEmail,
                    variables: {
                      userName,
                      dashboardUrl,
                      currentDate,
                      currentTime,
                    },
                  })
                  .catch(() => {});
              }
            } catch {}

            // Trigger the SpareFinder AI Research in the background
            console.log("🚀 Triggering SpareFinder AI Research");

            setImmediate(async () => {
              try {
                await startCrewAnalysis(
                  jobId,
                  file.buffer,
                  file.originalname,
                  file.mimetype,
                  userEmail,
                  keywords
                );
              } catch (crewError) {
                console.error(
                  `❌ Failed to start SpareFinder AI Research for job ${jobId}:`,
                  crewError
                );

                await supabase
                  .from("crew_analysis_jobs")
                  .update({
                    status: "failed",
                    error_message:
                      crewError instanceof Error
                        ? crewError.message
                        : "Failed to start analysis",
                    retry_count: 0,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", jobId);
              }
            });

            return res.status(201).json({
              success: true,
              message: "SpareFinder Research job created successfully",
              jobId: jobId,
              imageUrl: publicUrl,
            });
          }
        }

        return res.status(500).json({
          success: false,
          error: "Failed to create job",
          message: jobError.message,
        });
      }

      console.log("✅ SpareFinder Research job created:", jobId);

      // Fire-and-forget: send "Analysis Started" email for SpareFinder Research
      try {
        const currentDate = new Date().toLocaleDateString();
        const currentTime = new Date().toLocaleTimeString();
        const dashboardUrl = `${
          process.env.FRONTEND_URL || "https://sparefinder.org"
        }/dashboard`;

        if (userEmail) {
          emailService
            .sendTemplateEmail({
              templateName: "Analysis Started",
              userEmail,
              variables: {
                userName,
                dashboardUrl,
                currentDate,
                currentTime,
              },
            })
            .catch(() => {});
        }
      } catch {}

      // Trigger the SpareFinder AI Research in the background
      // Don't await this - let it run asynchronously
      // URL configuration is handled inside startCrewAnalysis function

      // Start analysis in background - don't wait for completion
      setImmediate(async () => {
        try {
          await startCrewAnalysis(
            jobId,
            file.buffer,
            file.originalname,
            file.mimetype,
            userEmail,
            keywords
          );
        } catch (crewError) {
          console.error(
            `❌ Failed to start SpareFinder AI Research for job ${jobId}:`,
            crewError
          );

          // Update job status to failed
          await supabase
            .from("crew_analysis_jobs")
            .update({
              status: "failed",
              error_message:
                crewError instanceof Error
                  ? crewError.message
                  : "Failed to start analysis",
              retry_count: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", jobId);
        }
      });

      return res.status(201).json({
        success: true,
        message: "SpareFinder Research job created successfully",
        jobId: jobId,
        imageUrl: publicUrl,
      });
    } catch (error) {
      console.error("❌ SpareFinder Research job creation error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
