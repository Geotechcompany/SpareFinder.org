import { NextFunction, Response } from "express";
import crypto from "crypto";
import { supabase } from "../server";
import { AuthRequest } from "../types/auth";
import { SUBSCRIPTION_LIMITS, isTier } from "../config/subscription-limits";
import { getUsageRow, incrementUsage } from "../services/usage-tracking";

const sha256Hex = (input: string) =>
  crypto.createHash("sha256").update(input, "utf8").digest("hex");

/**
 * Authenticate external requests using an API key (x-api-key).
 *
 * - Validates API key hash against `api_keys.key_hash`
 * - Ensures user subscription is active/trialing and not expired
 * - Enforces api_calls limit for Pro, unlimited for Enterprise
 * - Increments `usage_tracking.api_calls_count` (best-effort)
 */
export const authenticateApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = String(req.headers["x-api-key"] || "").trim();
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: "api_key_required",
        message: "Missing x-api-key header",
      });
    }

    const keyHash = sha256Hex(apiKey);
    const { data: keyRow, error: keyErr } = await supabase
      .from("api_keys")
      .select("user_id, is_active, expires_at")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (keyErr) {
      console.error("API key lookup failed:", keyErr);
      return res.status(500).json({
        success: false,
        error: "api_key_lookup_failed",
        message: "Failed to verify API key",
      });
    }

    if (!keyRow || keyRow.is_active === false) {
      return res.status(401).json({
        success: false,
        error: "api_key_invalid",
        message: "Invalid API key",
      });
    }

    if (keyRow.expires_at) {
      const exp = new Date(String(keyRow.expires_at));
      if (Number.isFinite(exp.getTime()) && exp.getTime() <= Date.now()) {
        return res.status(401).json({
          success: false,
          error: "api_key_expired",
          message: "API key expired",
        });
      }
    }

    const userId = String(keyRow.user_id);

    // Load subscription (must be active/trialing)
    const { data: subscription, error: subErr } = await supabase
      .from("subscriptions")
      .select("tier, status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();

    if (subErr) {
      console.error("Subscription lookup failed:", subErr);
      return res.status(500).json({
        success: false,
        error: "subscription_lookup_failed",
        message: "Failed to verify subscription",
      });
    }

    const isActive =
      subscription?.status === "active" || subscription?.status === "trialing";
    const isNotExpired =
      subscription?.current_period_end &&
      new Date(String(subscription.current_period_end)) > new Date();

    if (!subscription || !isActive || !isNotExpired) {
      return res.status(403).json({
        success: false,
        error: "subscription_required",
        message:
          "An active subscription (Pro or Enterprise) is required for API access.",
        requires_upgrade: true,
      });
    }

    const tier = isTier(subscription.tier) ? subscription.tier : "free";
    const limits = SUBSCRIPTION_LIMITS[tier];

    // Pro/Enterprise only
    if (limits.api_calls === 0) {
      return res.status(403).json({
        success: false,
        error: "api_access_not_enabled",
        message: "API access is not enabled for your plan. Upgrade to Pro or Enterprise.",
        requires_upgrade: true,
      });
    }

    // Enforce monthly API calls (Pro capped, Enterprise unlimited)
    if (limits.api_calls !== -1) {
      const usage = await getUsageRow(userId);
      if ((usage.api_calls_count ?? 0) + 1 > limits.api_calls) {
        return res.status(429).json({
          success: false,
          error: "api_limit_exceeded",
          message:
            "Monthly API call limit reached for your current plan. Upgrade to Enterprise for unlimited API access.",
          api_calls_used: usage.api_calls_count ?? 0,
          api_calls_limit: limits.api_calls,
          upgrade_required: true,
        });
      }
    }

    // Attach a minimal user identity
    req.user = { userId, email: "", role: "user" };
    (res.locals as any).subscriptionTier = tier;
    (res.locals as any).subscriptionLimits = limits;

    // Best-effort tracking
    setImmediate(async () => {
      try {
        await incrementUsage({ userId, apiCalls: 1 });
        await supabase
          .from("api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("key_hash", keyHash);
      } catch (e) {
        console.warn("Failed to track api call usage:", e);
      }
    });

    return next();
  } catch (e) {
    console.error("API key auth error:", e);
    return res.status(500).json({
      success: false,
      error: "api_key_auth_failed",
      message: "Failed to authenticate API key",
    });
  }
};

