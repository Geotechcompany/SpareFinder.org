import { Router, Response } from "express";
import axios, { AxiosResponse } from "axios";
import { authenticateApiKey } from "../middleware/api-key";
import { AuthRequest } from "../types/auth";
import { creditService } from "../services/credit-service";
import { getUsageRow } from "../services/usage-tracking";

const router = Router();

// All routes here are authenticated by x-api-key (Pro/Enterprise only)
router.use(authenticateApiKey);

router.get("/v1/me", async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const tier = (res.locals as any)?.subscriptionTier ?? "unknown";
  const limits = (res.locals as any)?.subscriptionLimits ?? null;
  const usage = await getUsageRow(userId);

  return res.json({
    success: true,
    user_id: userId,
    subscription: { tier, limits },
    usage: {
      month: usage.month,
      year: usage.year,
      searches_count: usage.searches_count,
      api_calls_count: usage.api_calls_count,
      storage_used: usage.storage_used,
    },
  });
});

// Keyword-only part search (external API)
router.post("/v1/search/keywords/schedule", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const keywords = req.body?.keywords as string | string[] | undefined;
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

    // Still charge 1 credit per keyword search (matches web app behavior)
    const creditResult = await creditService.processKeywordSearchCredits(userId);
    if (!creditResult.success) {
      return res.status(402).json({
        success: false,
        error: "insufficient_credits",
        message: "You do not have enough credits to perform this keyword search",
        current_credits: creditResult.current_credits || 0,
        required_credits: creditResult.required_credits || 1,
        upgrade_required: true,
      });
    }

    const aiServiceUrl =
      process.env.AI_SERVICE_INTERNAL_URL ||
      process.env.AI_SERVICE_URL ||
      process.env.AI_CREW_URL;
    const aiServiceApiKey = process.env.AI_SERVICE_API_KEY;
    if (!aiServiceUrl) {
      return res.status(500).json({
        success: false,
        error: "ai_service_not_configured",
        message: "AI service URL is not configured",
      });
    }

    const start = Date.now();
    const keywordTimeoutMs = Number(
      process.env.AI_KEYWORDS_TIMEOUT_MS ||
        process.env.AI_REQUEST_TIMEOUT_MS ||
        120000
    );

    const requestData = { keywords: normalized, user_email: undefined };

    let response: AxiosResponse<any> | null = null;
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
    } catch (e: any) {
      return res.status(502).json({
        success: false,
        error: "ai_service_unavailable",
        message: e?.message || "Failed to call AI keyword service",
      });
    }

    const duration = Date.now() - start;
    if (!response) {
      return res.status(502).json({
        success: false,
        error: "bad_gateway",
        message: "No response from AI keyword service",
      });
    }
    if (response.status === 429) {
      return res.status(502).json({
        success: false,
        error: "ai_service_rate_limited",
        message:
          "The AI analysis service is temporarily rate limited by its provider. Please try again shortly.",
        elapsed_ms: duration,
      });
    }
    if (response.status !== 202 && response.status !== 200) {
      return res.status(502).json({
        success: false,
        error: "bad_gateway",
        message: `AI service returned status ${response.status}`,
        elapsed_ms: duration,
      });
    }

    return res.status(202).json({
      success: true,
      ...response.data,
      elapsed_ms: duration,
      message:
        "Keyword search scheduled successfully. Use the job_id to check status.",
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: "external_api_error",
      message: e?.message || "Unknown error",
    });
  }
});

router.get("/v1/search/keywords/status/:jobId", async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params;
  const aiServiceUrl =
    process.env.AI_SERVICE_INTERNAL_URL ||
    process.env.AI_SERVICE_URL ||
    process.env.AI_CREW_URL;
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
});

export default router;

