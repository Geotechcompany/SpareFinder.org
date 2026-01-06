import { Shield, Zap, Crown, LucideIcon } from "lucide-react";

// Centralized plan configuration to ensure consistency across the entire app
export type PlanTier = "free" | "pro" | "enterprise";

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

// Base features for each tier (only tier-specific features)
const BASE_FEATURES: Record<PlanTier, string[]> = {
  free: [
    "20 image recognitions per month",
    "Basic search & match results",
    "Access via web portal only",
  ],
  pro: [
    "500 recognitions per month",
    "Catalogue storage (part lists, drawings)",
    "API access for ERP/CMMS",
    "Analytics dashboard",
  ],
  enterprise: [
    "Unlimited recognition",
    "Advanced AI customisation (train on your data)",
    "ERP/CMMS full integration",
    "Predictive demand analytics",
    "Dedicated support & SLA",
  ],
};

// Helper function to get cumulative features (includes all previous tier features)
const getCumulativeFeatures = (tier: PlanTier): string[] => {
  const tiers: PlanTier[] = ["free", "pro", "enterprise"];
  const currentTierIndex = tiers.indexOf(tier);
  const features: string[] = [];
  
  // Include all features from previous tiers
  for (let i = 0; i <= currentTierIndex; i++) {
    features.push(...BASE_FEATURES[tiers[i]]);
  }
  
  return features;
};

// Master plan configuration - UPDATE THIS TO CHANGE PLANS ACROSS THE ENTIRE APP
export const PLAN_CONFIG: Record<PlanTier, PlanFeature> = {
  free: {
    id: "starter",
    name: "Starter / Basic",
    price: 12.99,
    currency: "GBP",
    period: "month",
    description: "For small users testing the service",
    features: getCumulativeFeatures("free"),
    popular: false,
    color: "from-gray-600 to-gray-700",
    icon: Shield,
    limits: {
      searches: 20,
      api_calls: 0,
      storage: 1 * 1024 * 1024 * 1024, // 1GB
    },
    trial: {
      days: 30,
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
    features: getCumulativeFeatures("pro"),
    popular: true,
    color: "from-purple-600 to-blue-600",
    icon: Zap,
    limits: {
      searches: 500,
      api_calls: 5000,
      storage: 25 * 1024 * 1024 * 1024, // 25GB
    },
    trial: {
      days: 7,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 460,
    currency: "GBP",
    period: "month",
    description: "For OEMs, large factories, distributors",
    features: getCumulativeFeatures("enterprise"),
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
