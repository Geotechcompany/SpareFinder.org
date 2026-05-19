import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type SubscriptionTier = "free" | "pro" | "enterprise" | "none";
type SubscriptionStatus = string | null;

type RawSubscription = {
  tier?: string;
  status?: string;
  current_period_start?: string;
  current_period_end?: string;
};

type RawBillingResponse =
  | {
      subscription?: RawSubscription;
    }
  | {
      success?: boolean;
      data?: {
        subscription?: RawSubscription;
      };
    };

const parseIsoDate = (value: unknown): Date | null => {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export type SubscriptionContextValue = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isPlanActive: boolean;
  isTrialing: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(
  undefined
);

const normalizeTier = (tier: unknown): SubscriptionTier => {
  if (tier === "free" || tier === "pro" || tier === "enterprise") return tier;
  // Backend may return "starter" for Starter plan; map to "free" for feature checks
  if (tier === "starter" || tier === "basic") return "free";
  return "none";
};

const isStatusActive = (status: unknown): boolean => {
  return status === "active" || status === "trialing";
};

const parseBilling = (
  raw: unknown
): {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
} => {
  const payload = raw as RawBillingResponse | null | undefined;

  const sub =
    (payload && "subscription" in payload ? payload.subscription : undefined) ||
    (payload && "data" in payload ? payload.data?.subscription : undefined);

  const status = (sub?.status ?? null) as SubscriptionStatus;
  const tier = isStatusActive(status) ? normalizeTier(sub?.tier) : "none";

  return {
    tier,
    status,
    currentPeriodStart: parseIsoDate(sub?.current_period_start),
    currentPeriodEnd: parseIsoDate(sub?.current_period_end),
  };
};

export const useSubscription = (): SubscriptionContextValue => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [tier, setTier] = useState<SubscriptionTier>("none");
  const [status, setStatus] = useState<SubscriptionStatus>(null);
  const [currentPeriodStart, setCurrentPeriodStart] = useState<Date | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (isAuthLoading || !isAuthenticated) {
      setTier("none");
      setStatus(null);
      setCurrentPeriodStart(null);
      setCurrentPeriodEnd(null);
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setIsLoading(true);
      const response = await api.billing.getBillingInfo({
        signal: controller.signal,
      });
      const next = parseBilling(response);
      setTier(next.tier);
      setStatus(next.status);
      setCurrentPeriodStart(next.currentPeriodStart);
      setCurrentPeriodEnd(next.currentPeriodEnd);
    } catch (err) {
      // If the request was intentionally aborted, ignore.
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Fail closed: treat as no active plan.
      setTier("none");
      setStatus(null);
      setCurrentPeriodStart(null);
      setCurrentPeriodEnd(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    void refreshSubscription();
    return () => {
      abortRef.current?.abort();
    };
  }, [refreshSubscription]);

  // Re-fetch after admin plan changes or when returning to the tab.
  useEffect(() => {
    if (!isAuthenticated || isAuthLoading) return;

    const onFocus = () => void refreshSubscription();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshSubscription();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAuthenticated, isAuthLoading, refreshSubscription]);

  const value: SubscriptionContextValue = useMemo(
    () => ({
      tier,
      status,
      isPlanActive: isStatusActive(status),
      isTrialing: status === "trialing",
      currentPeriodStart,
      currentPeriodEnd,
      isLoading: isAuthLoading || isLoading,
      refreshSubscription,
    }),
    [
      tier,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      isAuthLoading,
      isLoading,
      refreshSubscription,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

