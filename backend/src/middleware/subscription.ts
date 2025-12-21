import { Response, NextFunction } from "express";
import { supabase } from "../server";
import { AuthRequest } from "../types/auth";
import { SUBSCRIPTION_LIMITS, isTier } from "../config/subscription-limits";

/**
 * Middleware to verify user has an active subscription or trial
 * Prevents access to premium features until user activates trial or subscribes
 */
export const requireSubscriptionOrTrial = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;

    // Admins bypass subscription checks
    if (req.user?.role === "admin" || req.user?.role === "super_admin") {
      // also expose tier/limits for downstream handlers
      (res.locals as any).subscriptionTier = "enterprise";
      (res.locals as any).subscriptionLimits = SUBSCRIPTION_LIMITS.enterprise;
      return next();
    }

    // Check user's subscription status
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("tier, status, current_period_end, current_period_start")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching subscription:", error);
      return res.status(500).json({
        success: false,
        error: "Unable to verify subscription status",
        message: "Failed to check subscription status. Please try again later.",
      });
    }

    // If no subscription exists, deny access
    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: "subscription_required",
        message:
          "You need an active subscription or trial to use this feature. Please start your free trial or upgrade your plan.",
        requires_upgrade: true,
      });
    }

    // Check if subscription is active or in trial
    const isActive =
      subscription.status === "active" || subscription.status === "trialing";
    const isNotExpired = new Date(subscription.current_period_end) > new Date();

    if (!isActive || !isNotExpired) {
      return res.status(403).json({
        success: false,
        error: "subscription_expired",
        message:
          "Your subscription or trial has expired. Please renew your subscription to continue using this feature.",
        requires_upgrade: true,
        expired_at: subscription.current_period_end,
      });
    }

    const tier = isTier(subscription.tier) ? subscription.tier : "free";
    (res.locals as any).subscriptionTier = tier;
    (res.locals as any).subscriptionLimits = SUBSCRIPTION_LIMITS[tier];

    // User has valid subscription/trial, continue
    return next();
  } catch (error) {
    console.error("Subscription check error:", error);
    return res.status(500).json({
      success: false,
      error: "Unable to verify subscription status",
      message: "Failed to check subscription status. Please try again later.",
    });
  }
};

/**
 * Middleware to check if Stripe is configured and in production mode
 * Warns if test keys are detected in production
 */
export const validateStripeConfig = async (
  _req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    // Check for Stripe secret key
    const envSecret =
      process.env.STRIPE_SECRET_KEY ||
      process.env.STRIPE_API_KEY ||
      process.env.STRIPE_SECRET ||
      process.env.STRIPE_PRIVATE_KEY;

    if (envSecret) {
      // Check if it's a test key in production
      if (isProduction && envSecret.startsWith("sk_test_")) {
        console.error(
          "⚠️ PRODUCTION WARNING: Test Stripe key detected in production environment!"
        );
        // Still allow but log warning
      }
      // Check if it's a production key
      if (envSecret.startsWith("sk_live_")) {
        console.log("✅ Production Stripe key detected");
      }
    } else {
      // Try to get from database
      const { data: stripeMethod } = await supabase
        .from("payment_methods")
        .select("secret_key, api_key, status")
        .eq("provider", "stripe")
        .eq("status", "active")
        .single();

      if (stripeMethod) {
        const dbSecret = stripeMethod.secret_key || stripeMethod.api_key;
        if (dbSecret) {
          if (isProduction && dbSecret.startsWith("sk_test_")) {
            console.error(
              "⚠️ PRODUCTION WARNING: Test Stripe key in database detected in production!"
            );
          }
          if (dbSecret.startsWith("sk_live_")) {
            console.log("✅ Production Stripe key from database detected");
          }
        }
      }
    }

    return next();
  } catch (error) {
    console.error("Stripe config validation error:", error);
    // Don't block the request, just log the error
    return next();
  }
};




