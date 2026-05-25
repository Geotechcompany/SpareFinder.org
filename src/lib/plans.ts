import { Shield, Zap, Crown, LucideIcon } from "lucide-react";
import { api } from "@/lib/api";

// Centralized plan configuration to ensure consistency across the entire app
export type PlanTier = "free" | "pro" | "enterprise";

// Annual billing discount (derived from current monthly prices)
export const ANNUAL_DISCOUNT_PERCENT = 20;
export const ANNUAL_DISCOUNT_FACTOR = 1 - ANNUAL_DISCOUNT_PERCENT / 100;

export const roundMoney = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/** Format amounts in GBP (app default currency). */
export const formatGBP = (
  amount: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(amount);
};

export const calculateAnnualPrice = (monthlyPrice: number): number => {
  return roundMoney(monthlyPrice * 12 * ANNUAL_DISCOUNT_FACTOR);
};

export interface PlanFeature {
  id: string;
  name: string;
  price: number;
  currency: "GBP";
  period: "month";
  description: string;
  features: string[];
  popular?: boolean;
  color: string;
  icon: LucideIcon;
  limits: {
    searches: number | -1; // -1 means unlimited
    api_calls: number | -1;
    storage: number | -1; // in bytes, -1 means unlimited
  };
  trial?: {
    days: number;
    trialPrice?: number; // Different price during trial
  };
}

/**
 * Tier features are intentionally **not cumulative**.
 *
 * Cumulative feature lists caused misleading/duplicated UI like:
 * - "20 analyses per month" + "500 analyses per month" on Pro
 * - "Web portal only" showing up on tiers that include API access
 */
const TIER_FEATURES: Record<PlanTier, string[]> = {
  free: [
    "20 analyses per month (shared across workspaces)",
    "Up to 3 workspaces",
    "Up to 3 team members per workspace",
    "Regional supplier prioritisation",
    "Basic search & match results",
    "Web portal access",
  ],
  pro: [
    "500 analyses per month (shared across workspaces)",
    "Up to 5 workspaces",
    "Up to 15 team members per workspace",
    "Multi-region supplier prioritisation",
    "Team invites, roles & workspace switching",
    "Catalogue storage (part lists, drawings)",
    "API access for ERP/CMMS",
    "Analytics dashboard",
    "Web portal access",
  ],
  enterprise: [
    "Unlimited analyses (shared across workspaces)",
    "Unlimited workspaces",
    "Unlimited team members",
    "Global regional supplier intelligence",
    "Advanced team permissions & workspace governance",
    "Advanced AI customisation (train on your data)",
    "ERP/CMMS full integration",
    "Predictive demand analytics",
    "Dedicated support & SLA",
    "Web portal access",
  ],
};

/** Map API tier strings to internal PlanTier keys. */
export function normalizeApiTier(tier: string | null | undefined): PlanTier {
  const t = (tier || "free").toLowerCase().trim();
  if (t === "pro" || t === "professional" || t === "business") return "pro";
  if (t === "enterprise") return "enterprise";
  return "free";
}

// Master plan configuration - UPDATE THIS TO CHANGE PLANS ACROSS THE ENTIRE APP
export const PLAN_CONFIG: Record<PlanTier, PlanFeature> = {
  free: {
    id: "starter",
    name: "Starter / Basic",
    price: 12.99,
    currency: "GBP",
    period: "month",
    description: "For small users testing the service",
    features: TIER_FEATURES.free,
    popular: false,
    color: "from-gray-600 to-gray-700",
    icon: Shield,
    limits: {
      searches: 20,
      api_calls: 0,
      storage: 1 * 1024 * 1024 * 1024, // 1GB
    },
    trial: {
      days: 7,
      trialPrice: 15, // Special trial pricing
    },
  },
  pro: {
    id: "professional",
    name: "Professional / Business",
    price: 69.99,
    currency: "GBP",
    period: "month",
    description: "For SMEs managing spare parts more actively",
    features: TIER_FEATURES.pro,
    popular: true,
    color: "from-brand to-brand-dark",
    icon: Zap,
    limits: {
      searches: 500,
      api_calls: 5000,
      storage: 25 * 1024 * 1024 * 1024, // 25GB
    },
    trial: {
      days: 3,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 460,
    currency: "GBP",
    period: "month",
    description: "For OEMs, large factories, distributors",
    features: TIER_FEATURES.enterprise,
    popular: false,
    color: "from-emerald-600 to-green-600",
    icon: Crown,
    limits: {
      searches: -1, // unlimited
      api_calls: -1, // unlimited
      storage: -1, // unlimited
    },
  },
};

// Helper functions for easy access
export const getPlan = (tier: PlanTier): PlanFeature => {
  return PLAN_CONFIG[tier];
};

export const getAllPlans = (): PlanFeature[] => {
  return Object.values(PLAN_CONFIG);
};

/** API plan shape from backend GET /api/plans */
export interface ApiPlan {
  id?: string;
  tier: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  color?: string;
  limits: { searches: number; api_calls: number; storage: number };
  trial?: { days: number; trialPrice?: number } | null;
}

const TIER_ICON: Record<string, LucideIcon> = {
  free: Shield,
  starter: Shield,
  pro: Zap,
  professional: Zap,
  enterprise: Crown,
};

/** Fetch plans from DB (used by landing/billing). Returns static config on error or empty. */
export async function fetchPlansFromApi(): Promise<PlanFeature[]> {
  try {
    const res = await api.plans.getPlans();
    if (!res?.success || !Array.isArray((res as any)?.data?.plans) || (res as any).data.plans.length === 0) {
      return getAllPlans();
    }
    const apiPlans = (res as any).data.plans as ApiPlan[];
    return apiPlans.map((p) => {
      const planTier = normalizeApiTier(p.tier);
      const staticPlan = PLAN_CONFIG[planTier];
      const normalizedId =
        planTier === "free" ? "starter"
        : planTier === "pro" ? "professional"
        : "enterprise";
      return {
        id: normalizedId,
        name: p.name || staticPlan.name,
        price: Number(p.price) || staticPlan.price,
        currency: (p.currency as "GBP") || "GBP",
        period: (p.period as "month") || "month",
        description: p.description || staticPlan.description,
        features: staticPlan.features,
        popular: Boolean(p.popular ?? staticPlan.popular),
        color: p.color || staticPlan.color,
        icon: TIER_ICON[planTier] || Shield,
        limits: {
          searches: p.limits?.searches ?? staticPlan.limits.searches,
          api_calls: p.limits?.api_calls ?? staticPlan.limits.api_calls,
          storage: p.limits?.storage ?? staticPlan.limits.storage,
        },
        // Trial length is canonical in PLAN_CONFIG (DB trial_days may be stale)
        trial: staticPlan.trial
          ? {
              days: staticPlan.trial.days,
              trialPrice: staticPlan.trial.trialPrice,
            }
          : undefined,
      } satisfies PlanFeature;
    });
  } catch {
    return getAllPlans();
  }
}

export const getPlanByPrice = (price: number): PlanFeature | null => {
  return getAllPlans().find((plan) => plan.price === price) || null;
};

export const formatPrice = (plan: PlanFeature): string => {
  return `£${plan.price}`;
};

export const formatPriceWithPeriod = (plan: PlanFeature): string => {
  return `£${plan.price}/${plan.period}`;
};

export const getPlanDisplayName = (tier: PlanTier): string => {
  return PLAN_CONFIG[tier].name;
};

export const getPlanLimits = (tier: PlanTier) => {
  return PLAN_CONFIG[tier].limits;
};

export const isUnlimited = (value: number): boolean => {
  return value === -1;
};

export const formatLimit = (value: number, unit: string): string => {
  if (isUnlimited(value)) {
    return "Unlimited";
  }
  return `${value} ${unit}`;
};

// For legacy compatibility - maps internal tier names to display names
export const TIER_DISPLAY_MAP: Record<PlanTier, string> = {
  free: "Starter",
  pro: "Professional",
  enterprise: "Enterprise",
};

/** Tier order for strict feature gating (higher index = more access) */
const TIER_ORDER: PlanTier[] = ["free", "pro", "enterprise"];

/** Returns true only if the user's tier includes access to the required tier. Strict: no access to higher-plan features. */
export function canAccessFeature(
  currentTier: PlanTier | "none" | string | null,
  requiredTier: PlanTier
): boolean {
  if (!currentTier || currentTier === "none") return false;
  const current = TIER_ORDER.indexOf(currentTier as PlanTier);
  const required = TIER_ORDER.indexOf(requiredTier);
  if (current === -1) return false; // unknown tier = no access
  return current >= required;
}

// Subscription limits for backend compatibility
export const SUBSCRIPTION_LIMITS = Object.fromEntries(
  Object.entries(PLAN_CONFIG).map(([tier, plan]) => [
    tier,
    {
      searches: plan.limits.searches,
      api_calls: plan.limits.api_calls,
      storage: plan.limits.storage,
    },
  ])
);

// Plan features for component compatibility
export const PLAN_FEATURES = Object.fromEntries(
  Object.entries(PLAN_CONFIG).map(([tier, plan]) => [
    tier,
    {
      name: plan.name,
      price: plan.price,
      currency: plan.currency.toUpperCase(),
      color: plan.color,
      icon: plan.icon,
      features: plan.features,
    },
  ])
);

export default PLAN_CONFIG;
