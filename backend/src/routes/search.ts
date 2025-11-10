import { Router, Response } from "express";
import multer from "multer";
import { authenticateToken } from "../middleware/auth";
import { requireSubscriptionOrTrial } from "../middleware/subscription";
import { AuthRequest } from "../types/auth";
import { supabase } from "../server";
import axios, { AxiosResponse } from "axios";
import { creditService } from "../services/credit-service";
import { emailService } from "../services/email-service";

const router = Router();

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

// Image prediction endpoint
router.post(
  "/predict",
  [authenticateToken, upload.single("image")],
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No image file provided",
        });
      }

      // For now, return a mock response
      // This would integrate with the AI service in production
      return res.json({
        success: true,
        predictions: [
          {
            part_name: "Brake Pad Set",
            confidence: 0.95,
            category: "Braking System",
            part_number: "BP-001-2024",
          },
        ],
        processing_time: 1200,
      });
    } catch (error) {
      console.error("Prediction error:", error);
      return res.status(500).json({
        error: "Prediction failed",
        message: "An error occurred during image analysis",
      });
    }
  }
);

// Get part by part number
router.get(
  "/parts/:partNumber",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { partNumber } = req.params;

      // Mock part data - would come from external APIs in production
      const mockPart = {
        part_number: partNumber,
        name: "Sample Part",
        description: "This is a sample part description",
        category: "Engine",
        manufacturer: "Sample Manufacturer",
        price: 29.99,
        availability: "In Stock",
        specifications: {
          weight: "2.5 lbs",
          dimensions: "10x5x3 inches",
          material: "Steel",
        },
      };

      return res.json({
        success: true,
        part: mockPart,
      });
    } catch (error) {
      console.error("Part fetch error:", error);
      return res.status(500).json({
        error: "Part fetch failed",
        message: "An error occurred while fetching part details",
      });
    }
  }
);

// Search parts
router.get(
  "/parts/search",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { q: query, category, manufacturer } = req.query;

      // Mock search results - would come from external APIs in production
      const mockResults = [
        {
          part_number: "BP-001-2024",
          name: "Brake Pad Set",
          category: "Braking System",
          manufacturer: "AutoParts Inc",
          price: 45.99,
          availability: "In Stock",
        },
        {
          part_number: "AF-002-2024",
          name: "Air Filter",
          category: "Engine",
          manufacturer: "FilterTech",
          price: 19.99,
          availability: "Limited Stock",
        },
      ];

      return res.json({
        success: true,
        results: mockResults,
        total: mockResults.length,
        query: {
          search: query,
          category,
          manufacturer,
        },
      });
    } catch (error) {
      console.error("Part search error:", error);
      return res.status(500).json({
        error: "Search failed",
        message: "An error occurred while searching for parts",
      });
    }
  }
);

// Keyword-only part search endpoint (proxied to AI service)
router.post(
  "/keywords",
  authenticateToken,
  requireSubscriptionOrTrial,
  async (req: AuthRequest, res: Response) => {
    try {
      const { keywords } = req.body as { keywords?: string | string[] };

      // Validate input
      const provided = Array.isArray(keywords)
        ? keywords
        : typeof keywords === "string"
        ? [keywords]
        : [];
      const normalized = provided.map((k) => String(k).trim()).filter(Boolean);
      if (normalized.length === 0) {
        return res.status(400).json({
          success: false,
          error: "invalid_request",
          message: "Please provide one or more keywords",
        });
      }

      // Credits: admins unlimited, others charge 1 credit
      const userId = req.user!.userId;
      if (req.user?.role === "admin" || req.user?.role === "super_admin") {
        // bypass credits
      } else {
        const creditResult = await creditService.processKeywordSearchCredits(
          userId
        );
        if (!creditResult.success) {
          return res.status(402).json({
            success: false,
            error: "insufficient_credits",
            message:
              "You do not have enough credits to perform this keyword search",
            current_credits: creditResult.current_credits || 0,
            required_credits: creditResult.required_credits || 1,
            upgrade_required: true,
          });
        }
      }

      const aiServiceUrl = process.env.AI_SERVICE_URL;
      const aiServiceApiKey = process.env.AI_SERVICE_API_KEY;
      if (!aiServiceUrl) {
        return res.status(500).json({
          success: false,
          error: "ai_service_not_configured",
          message: "AI service URL is not configured",
        });
      }

      // Get user email for AI service notifications
      let userEmail = null;
      console.log(`🔍 Getting user email for userId: ${userId}`);
      try {
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        console.log(`📊 User profile query result:`, {
          userProfile,
          profileError,
        });

        if (userProfile?.email) {
          userEmail = userProfile.email;
          console.log(
            "📧 User email added to keyword search request:",
            userEmail
          );

          // Send "Analysis Started" email notification for keyword search (non-blocking)
          try {
            const currentDate = new Date().toLocaleDateString();
            const currentTime = new Date().toLocaleTimeString();
            const dashboardUrl = `${
              process.env.FRONTEND_URL || "https://sparefinder.org"
            }/dashboard`;

            // Fire-and-forget: don't await, let it run in background
            emailService
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
              .then(() => {
                console.log(
                  "📧 Keyword search started email sent to:",
                  userProfile.email
                );
              })
              .catch((error) => {
                console.error(
                  "Failed to send keyword search started email:",
                  error
                );
              });

            console.log(
              "📧 Keyword search started email queued for:",
              userProfile.email
            );
          } catch (emailError) {
            console.error(
              "Error queueing keyword search started email:",
              emailError
            );
          }
        } else {
          console.warn("⚠️ No user email found for keyword search");
        }
      } catch (emailError) {
        console.warn(
          "Failed to get user email for keyword search:",
          emailError
        );
      }

      // Optional health check could be added here similar to upload route
      const start = Date.now();
      const keywordTimeoutMs = Number(
        process.env.AI_KEYWORDS_TIMEOUT_MS ||
          process.env.AI_REQUEST_TIMEOUT_MS ||
          120000
      );

      const requestData = {
        keywords: normalized, // Pass array of keywords directly
        user_email: userEmail,
      };

      console.log(
        `🚀 Calling AI service endpoint: ${aiServiceUrl}/search/keywords/schedule`
      );
      console.log(`📤 Request data:`, requestData);
      console.log(`🔑 API Key present:`, !!aiServiceApiKey);

      // Improved retry logic with exponential backoff and better rate limit handling
      const maxAttempts = 5; // Increased from 3 to 5
      const baseDelayMs = 2000; // Base delay of 2 seconds
      const maxDelayMs = 60000; // Maximum delay of 60 seconds
      let response: AxiosResponse<any> | null = null;
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          response = await axios.post(
            `${aiServiceUrl}/search/keywords/schedule`,
            requestData,
            {
              timeout: isNaN(keywordTimeoutMs) ? 120000 : keywordTimeoutMs,
              headers: {
                "Content-Type": "application/json",
                ...(aiServiceApiKey ? { "x-api-key": aiServiceApiKey } : {}),
              },
              validateStatus: (status) => status < 500,
            }
          );

          if (response) {
            console.log("🔄 AI keyword schedule response:", {
              attempt,
              status: response.status,
              data: response.data,
            });
          }

          // If successful or non-rate-limit error, break
          if (response && response.status !== 429) {
            break;
          }

          // Handle rate limiting (429)
          if (response && response.status === 429) {
            // Extract Retry-After header (case-insensitive)
            const retryAfterHeader =
              response.headers?.["retry-after"] ||
              response.headers?.["Retry-After"] ||
              response.headers?.["RETRY-AFTER"];

            let delayMs: number;

            if (retryAfterHeader) {
              // Parse Retry-After header
              const retryAfterSeconds = parseInt(retryAfterHeader, 10);
              if (!Number.isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
                // Use Retry-After value, but cap at maxDelayMs
                delayMs = Math.min(retryAfterSeconds * 1000, maxDelayMs);
                console.log(
                  `📅 Using Retry-After header: ${retryAfterSeconds}s (${delayMs}ms)`
                );
              } else {
                // Invalid Retry-After, use exponential backoff
                delayMs = Math.min(
                  baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000, // Add jitter
                  maxDelayMs
                );
                console.log(
                  `⚠️ Invalid Retry-After header, using exponential backoff: ${delayMs}ms`
                );
              }
            } else {
              // No Retry-After header, use exponential backoff with jitter
              delayMs = Math.min(
                baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000, // Add jitter (0-1000ms)
                maxDelayMs
              );
              console.log(
                `⏱️ No Retry-After header, using exponential backoff: ${Math.round(
                  delayMs
                )}ms`
              );
            }

            if (attempt < maxAttempts) {
              console.warn(
                `⚠️ AI service rate limited (attempt ${attempt}/${maxAttempts}). Retrying in ${Math.round(
                  delayMs / 1000
                )}s...`
              );
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            } else {
              // Last attempt failed with 429
              lastError = {
                status: 429,
                message:
                  "AI service is currently rate limited. Please try again later.",
                retryAfter: retryAfterHeader,
              };
            }
          }
        } catch (error: any) {
          // Network or other errors
          lastError = error;
          if (attempt < maxAttempts) {
            // Exponential backoff for network errors
            const delayMs = Math.min(
              baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000,
              maxDelayMs
            );
            console.warn(
              `⚠️ Request failed (attempt ${attempt}/${maxAttempts}): ${
                error.message
              }. Retrying in ${Math.round(delayMs / 1000)}s...`
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      // Handle final response or error
      if (!response) {
        if (lastError?.status === 429) {
          return res.status(429).json({
            success: false,
            error: "rate_limited",
            message:
              "The AI service is currently experiencing high demand. Please try again in a few moments.",
            retryAfter: lastError.retryAfter,
            suggestion:
              "Please wait a moment before submitting another keyword search.",
          });
        }
        return res.status(502).json({
          success: false,
          error: "bad_gateway",
          message: lastError?.message || "No response from AI service",
        });
      }

      const duration = Date.now() - start;

      // Handle rate limit response
      if (response.status === 429) {
        const retryAfter =
          response.headers?.["retry-after"] ||
          response.headers?.["Retry-After"] ||
          response.headers?.["RETRY-AFTER"];

        return res.status(429).json({
          success: false,
          error: "rate_limited",
          message:
            "The AI service is currently experiencing high demand. Please try again in a few moments.",
          retryAfter: retryAfter,
          suggestion:
            "Please wait a moment before submitting another keyword search.",
          elapsed_ms: duration,
        });
      }

      // Handle other non-success responses
      if (response.status !== 202 && response.status !== 200) {
        return res.status(502).json({
          success: false,
          error: "bad_gateway",
          message: `AI service returned status ${response.status}`,
          elapsed_ms: duration,
        });
      }

      // The schedule endpoint returns a job ID, we need to return that to the frontend
      // The frontend will need to poll for results using the job ID
      return res.status(202).json({
        success: true,
        ...response.data,
        elapsed_ms: duration,
        message:
          "Keyword search scheduled successfully. Use the job ID to check status.",
      });
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        return res.status(502).json({
          success: false,
          error: "ai_service_error",
          message: error.message,
          status: error.response?.status,
          code: error.code,
        });
      }
      console.error("Keyword search error:", error);
      return res.status(500).json({
        success: false,
        error: "search_failed",
        message: "An error occurred while searching by keywords",
      });
    }
  }
);

// Check keyword search status
router.get(
  "/keywords/status/:jobId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { jobId } = req.params;
      const aiServiceUrl = process.env.AI_SERVICE_URL;
      const aiServiceApiKey = process.env.AI_SERVICE_API_KEY;

      if (!aiServiceUrl) {
        return res.status(500).json({
          success: false,
          error: "ai_service_not_configured",
          message: "AI service URL is not configured",
        });
      }

      const response = await axios.get(
        `${aiServiceUrl}/search/keywords/status/${jobId}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(aiServiceApiKey ? { "x-api-key": aiServiceApiKey } : {}),
          },
          validateStatus: (status) => status < 500,
        }
      );

      if (response.status !== 200) {
        return res.status(502).json({
          success: false,
          error: "bad_gateway",
          message: `AI service returned status ${response.status}`,
        });
      }

      return res.status(200).json(response.data);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        return res.status(502).json({
          success: false,
          error: "ai_service_error",
          message: error.message,
          status: error.response?.status,
          code: error.code,
        });
      }
      console.error("Keyword search status error:", error);
      return res.status(500).json({
        success: false,
        error: "status_check_failed",
        message: "An error occurred while checking keyword search status",
      });
    }
  }
);

// Get part details with pricing
router.get(
  "/parts/:partNumber/details",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { partNumber } = req.params;

      // Mock detailed part data
      const mockDetails = {
        part_number: partNumber,
        name: "Detailed Part Information",
        description: "Comprehensive part details with specifications",
        category: "Engine",
        manufacturer: "Premium Parts Co",
        pricing: [
          {
            supplier: "Supplier A",
            price: 29.99,
            availability: "In Stock",
            shipping: "Free",
          },
          {
            supplier: "Supplier B",
            price: 32.5,
            availability: "Limited",
            shipping: "$5.99",
          },
          {
            supplier: "Supplier C",
            price: 27.99,
            availability: "In Stock",
            shipping: "Free",
          },
        ],
        specifications: {
          weight: "2.5 lbs",
          dimensions: "10x5x3 inches",
          material: "Steel",
          warranty: "2 years",
        },
        compatibility: [
          "Vehicle Model A (2020-2024)",
          "Vehicle Model B (2019-2023)",
          "Vehicle Model C (2021-2024)",
        ],
      };

      return res.json({
        success: true,
        details: mockDetails,
      });
    } catch (error) {
      console.error("Part details error:", error);
      return res.status(500).json({
        error: "Details fetch failed",
        message: "An error occurred while fetching part details",
      });
    }
  }
);

// Get search by ID
router.get(
  "/:searchId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { searchId } = req.params;
      const userId = req.user!.userId;

      const { data: search, error } = await supabase
        .from("part_searches")
        .select("*")
        .eq("id", searchId)
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Search fetch error:", error);
        return res.status(404).json({
          error: "Search not found",
          message: "The requested search could not be found",
        });
      }

      return res.json({
        success: true,
        search,
      });
    } catch (error) {
      console.error("Search fetch error:", error);
      return res.status(500).json({
        error: "Search fetch failed",
        message: "An error occurred while fetching search details",
      });
    }
  }
);

export default router;
