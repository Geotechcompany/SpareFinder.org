import { Router, Response } from "express";
import crypto from "crypto";
import { authenticateToken } from "../middleware/auth";
import { requireSubscriptionOrTrial } from "../middleware/subscription";
import { AuthRequest } from "../types/auth";
import { SUBSCRIPTION_LIMITS, isTier } from "../config/subscription-limits";
import { supabase } from "../server";

const router = Router();

const sha256Hex = (input: string) =>
  crypto.createHash("sha256").update(input, "utf8").digest("hex");

const makeApiKey = () => {
  // non-guessable, URL-safe
  const raw = crypto.randomBytes(32).toString("base64url");
  return `sf_${raw}`;
};

router.get("/", authenticateToken, requireSubscriptionOrTrial, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  // Gate: Pro/Enterprise only (api_calls > 0)
  const limits = (res.locals as any)?.subscriptionLimits as
    | { api_calls: number }
    | undefined;
  if ((limits?.api_calls ?? 0) === 0) {
    return res.status(403).json({
      success: false,
      error: "api_access_not_enabled",
      message: "API access is available on Pro and Enterprise plans.",
      requires_upgrade: true,
    });
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, scopes, last_used_at, expires_at, is_active, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ success: false, error: "failed_to_list_keys" });
  }

  return res.json({ success: true, keys: data || [] });
});

router.post("/", authenticateToken, requireSubscriptionOrTrial, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const name = String(req.body?.name || "API Key").trim().slice(0, 64);
  const scopes = Array.isArray(req.body?.scopes) ? req.body.scopes.map(String) : [];
  const expiresAt = req.body?.expires_at ? new Date(String(req.body.expires_at)) : null;

  const tier = (res.locals as any)?.subscriptionTier;
  const limits = isTier(tier) ? SUBSCRIPTION_LIMITS[tier] : SUBSCRIPTION_LIMITS.free;

  if (limits.api_calls === 0) {
    return res.status(403).json({
      success: false,
      error: "api_access_not_enabled",
      message: "API access is available on Pro and Enterprise plans.",
      requires_upgrade: true,
    });
  }

  const apiKey = makeApiKey();
  const keyHash = sha256Hex(apiKey);

  const { data, error } = await supabase
    .from("api_keys")
    .insert([
      {
        user_id: userId,
        key_hash: keyHash,
        name,
        scopes,
        expires_at: expiresAt && Number.isFinite(expiresAt.getTime()) ? expiresAt.toISOString() : null,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ])
    .select("id, name, scopes, expires_at, is_active, created_at")
    .single();

  if (error || !data) {
    console.error("Create api key failed:", error);
    return res.status(500).json({ success: false, error: "failed_to_create_key" });
  }

  // IMPORTANT: only return the raw key once.
  return res.json({ success: true, key: { ...data, value: apiKey } });
});

router.post("/:id/revoke", authenticateToken, requireSubscriptionOrTrial, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const id = String(req.params.id);

  const { error } = await supabase
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return res.status(500).json({ success: false, error: "failed_to_revoke_key" });
  }

  return res.json({ success: true });
});

export default router;

