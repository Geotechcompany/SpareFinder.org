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

type RawBillingResponse =
  | {
      subscription?: {
        tier?: string;
        status?: string;
      };
    }
  | {
      success?: boolean;
      data?: {
        subscription?: {
          tier?: string;
          status?: string;
        };
      };
    };

export type SubscriptionContextValue = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isPlanActive: boolean;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(
  undefined
);

const normalizeTier = (tier: unknown): SubscriptionTier => {
  if (tier === "free" || tier === "pro" || tier === "enterprise") return tier;
  return "none";
};

const isStatusActive = (status: unknown): boolean => {
  return status === "active" || status === "trialing";
};

const parseBilling = (raw: unknown): { tier: SubscriptionTier; status: SubscriptionStatus } => {
  const payload = raw as RawBillingResponse | null | undefined;

  const sub =
    (payload && "subscription" in payload ? payload.subscription : undefined) ||
    (payload && "data" in payload ? payload.data?.subscription : undefined);

  const status = (sub?.status ?? null) as SubscriptionStatus;
  const tier = isStatusActive(status) ? normalizeTier(sub?.tier) : "none";

  return { tier, status };
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
  const [isLoading, setIsLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (isAuthLoading || !isAuthenticated) {
      setTier("none");
      setStatus(null);
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
    } catch (err) {
      // If the request was intentionally aborted, ignore.
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Fail closed: treat as no active plan.
      setTier("none");
      setStatus(null);
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

  const value: SubscriptionContextValue = useMemo(
    () => ({
      tier,
      status,
      isPlanActive: isStatusActive(status),
      isLoading: isAuthLoading || isLoading,
      refreshSubscription,
    }),
    [tier, status, isAuthLoading, isLoading, refreshSubscription]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

