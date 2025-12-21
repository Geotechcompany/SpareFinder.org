export type SubscriptionTier = "free" | "pro" | "enterprise";

// Subscription limits by tier - synced with frontend configuration
// NOTE: -1 means "unlimited"
export const SUBSCRIPTION_LIMITS: Record<
  SubscriptionTier,
  { searches: number; api_calls: number; storage: number }
> = {
  // Starter/Basic (mapped to 'free' tier key)
  free: {
    // 20 image recognitions per month (enforced via credits)
    searches: 20,
    // Web portal only (no API access)
    api_calls: 0,
    // Keep modest storage available
    storage: 1 * 1024 * 1024 * 1024, // 1GB
  },
  // Professional/Business
  pro: {
    // 500 recognitions per month (enforced via credits)
    searches: 500,
    // API access enabled
    api_calls: 5000,
    // Catalogue storage
    storage: 25 * 1024 * 1024 * 1024, // 25GB
  },
  // Enterprise
  enterprise: {
    searches: -1, // unlimited
    api_calls: -1, // unlimited
    storage: -1, // unlimited
  },
};

export const isTier = (tier: unknown): tier is SubscriptionTier =>
  tier === "free" || tier === "pro" || tier === "enterprise";

