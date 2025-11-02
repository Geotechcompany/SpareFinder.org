import { Router, Response } from "express";
import multer from "multer";
import { authenticateToken } from "../middleware/auth";
import { requireSubscriptionOrTrial } from "../middleware/subscription";
import { AuthRequest } from "../types/auth";
import { supabase } from "../server";
import axios from "axios";
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
        keywords: normalized.join(" "), // Join array into a single string
        user_email: userEmail,
      };

      console.log(
        `🚀 Calling AI service endpoint: ${aiServiceUrl}/search/keywords/schedule`
      );
      console.log(`📤 Request data:`, requestData);
      console.log(`🔑 API Key present:`, !!aiServiceApiKey);

      const response = await axios.post(
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

      const duration = Date.now() - start;
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
