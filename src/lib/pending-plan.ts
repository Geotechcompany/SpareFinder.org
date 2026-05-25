import type { PlanFeature, PlanTier } from "@/lib/plans";

export const PENDING_PLAN_STORAGE_KEY = "sparefinder_pending_plan";

export type PendingPlanSelection = {
  tier: PlanTier;
  planName?: string;
  billingCycle?: "monthly" | "annually";
  selectedAt: number;
};

export function planFeatureIdToTier(planId: string): PlanTier {
  const id = (planId || "").toLowerCase().trim();
  if (id === "enterprise") return "enterprise";
  if (id === "professional" || id === "pro") return "pro";
  return "free";
}

export function planParamToTier(param: string | null | undefined): PlanTier | null {
  if (!param) return null;
  const p = param.toLowerCase().trim();
  if (p === "enterprise") return "enterprise";
  if (p === "pro" || p === "professional" || p === "business") return "pro";
  if (p === "free" || p === "starter" || p === "basic") return "free";
  return null;
}

export function tierToPlanParam(tier: PlanTier): string {
  if (tier === "free") return "starter";
  return tier;
}

export function savePendingPlan(
  selection: Omit<PendingPlanSelection, "selectedAt"> & { selectedAt?: number }
): void {
  try {
    const payload: PendingPlanSelection = {
      ...selection,
      selectedAt: selection.selectedAt ?? Date.now(),
    };
    sessionStorage.setItem(PENDING_PLAN_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function getPendingPlan(): PendingPlanSelection | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PLAN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPlanSelection;
    if (!parsed?.tier) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPlan(): void {
  try {
    sessionStorage.removeItem(PENDING_PLAN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function buildTrialPathWithPlan(tier: PlanTier): string {
  return `/onboarding/trial?plan=${tierToPlanParam(tier)}`;
}

/** Profile onboarding first, then plan activation (correct order after sign-up). */
export function buildProfileThenTrialPath(tier: PlanTier): string {
  const { pathname, search } = profileLocationWithTrialNext(tier);
  return `${pathname}${search}`;
}

/** Extract ?plan= from a path like /onboarding/trial?plan=pro */
export function parsePlanTierFromPath(path: string | null | undefined): PlanTier | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  const queryStart = trimmed.indexOf("?");
  if (queryStart < 0) return null;
  const params = new URLSearchParams(trimmed.slice(queryStart + 1));
  return planParamToTier(params.get("plan"));
}

/**
 * Resolve selected plan: explicit ?plan= on current URL, then nested `next` path,
 * then sessionStorage (landing page selection).
 */
export function resolveSelectedTier(
  urlPlan?: string | null,
  nestedNextPath?: string | null
): PlanTier | null {
  const fromUrl = planParamToTier(urlPlan ?? null);
  if (fromUrl) return fromUrl;

  const fromNested = parsePlanTierFromPath(nestedNextPath ?? null);
  if (fromNested) return fromNested;

  return getPendingPlan()?.tier ?? null;
}

export function trialLocationForTier(tier: PlanTier): {
  pathname: string;
  search: string;
} {
  return {
    pathname: "/onboarding/trial",
    search: `?plan=${tierToPlanParam(tier)}`,
  };
}

export function profileLocationWithTrialNext(tier: PlanTier): {
  pathname: string;
  search: string;
} {
  const trial = buildTrialPathWithPlan(tier);
  return {
    pathname: "/onboarding/profile",
    search: `?next=${encodeURIComponent(trial)}`,
  };
}

/** Persist selection and build register URL that returns to plan onboarding after sign-up. */
export function buildRegisterPath(
  plan: PlanFeature,
  billingCycle: "monthly" | "annually" = "monthly"
): string {
  const tier = planFeatureIdToTier(plan.id);
  savePendingPlan({ tier, planName: plan.name, billingCycle });
  const afterSignup = buildProfileThenTrialPath(tier);
  return `/register?plan=${tierToPlanParam(tier)}&next=${encodeURIComponent(afterSignup)}`;
}
