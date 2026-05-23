import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { api, type ApiResponse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type SubscriptionTier = "free" | "pro" | "enterprise" | "none";
type SubscriptionStatus = string | null;

type RawSubscription = {
  tier?: string;
  status?: string;
  current_period_start?: string;
  current_period_end?: string;
};

type BillingPayload = {
  subscription?: RawSubscription;
  trial_used?: boolean;
  inheritedWorkspaceAccess?: boolean;
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
  inheritedWorkspaceAccess: boolean;
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
  if (tier === "starter" || tier === "basic") return "free";
  return "none";
};

const isStatusActive = (status: unknown): boolean => {
  const s = typeof status === "string" ? status.toLowerCase() : "";
  return s === "active" || s === "trialing";
};

const extractBillingPayload = (raw: unknown): BillingPayload | null => {
  if (!raw || typeof raw !== "object") return null;

  const envelope = raw as ApiResponse<BillingPayload> & BillingPayload;

  if (envelope.success === false) {
    return null;
  }

  if (envelope.data && typeof envelope.data === "object") {
    return envelope.data as BillingPayload;
  }

  if ("subscription" in envelope) {
    return envelope as BillingPayload;
  }

  return null;
};

const parseBilling = (
  raw: unknown
): {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
} => {
  const payload = extractBillingPayload(raw);
  const sub = payload?.subscription;

  const statusRaw = sub?.status ?? null;
  const status =
    typeof statusRaw === "string" ? statusRaw.toLowerCase() : statusRaw;
  const tier = isStatusActive(status) ? normalizeTier(sub?.tier) : "none";

  return {
    tier,
    status: status as SubscriptionStatus,
    currentPeriodStart: parseIsoDate(sub?.current_period_start),
    currentPeriodEnd: parseIsoDate(sub?.current_period_end),
  };
};

function isRetryableBillingError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return true;
  const status = error.response?.status;
  if (!status) return true;
  if (status === 401 || status === 403) return true;
  if (status === 429 || status >= 500) return true;
  if (error.code === "ECONNABORTED") return true;
  return false;
}

function isCanceledError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (!axios.isAxiosError(error)) return false;
  return error.code === "ERR_CANCELED" || error.name === "CanceledError";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { activeWorkspaceId, isLoading: workspaceLoading } = useWorkspace();

  const [tier, setTier] = useState<SubscriptionTier>("none");
  const [status, setStatus] = useState<SubscriptionStatus>(null);
  const [inheritedWorkspaceAccess, setInheritedWorkspaceAccess] = useState(false);
  const [currentPeriodStart, setCurrentPeriodStart] = useState<Date | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestSeqRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const clearSubscription = useCallback(() => {
    setTier("none");
    setStatus(null);
    setInheritedWorkspaceAccess(false);
    setCurrentPeriodStart(null);
    setCurrentPeriodEnd(null);
    hasLoadedRef.current = false;
  }, []);

  const applySubscription = useCallback(
    (next: ReturnType<typeof parseBilling>, inherited: boolean) => {
      setTier(next.tier);
      setStatus(next.status);
      setInheritedWorkspaceAccess(inherited);
      setCurrentPeriodStart(next.currentPeriodStart);
      setCurrentPeriodEnd(next.currentPeriodEnd);
      hasLoadedRef.current = true;
    },
    []
  );

  const refreshSubscription = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      if (!isAuthLoading) {
        clearSubscription();
      }
      setIsLoading(false);
      return;
    }

    // Wait until workspace context is ready so X-Workspace-Id is sent on billing requests.
    if (workspaceLoading) {
      return;
    }

    const seq = ++requestSeqRef.current;
    const showBlockingLoader = !hasLoadedRef.current;
    if (showBlockingLoader) setIsLoading(true);

    const maxAttempts = hasLoadedRef.current ? 1 : 3;

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (seq !== requestSeqRef.current) return;

        if (attempt > 0) {
          await sleep(400 * attempt);
        }

        try {
          const response = await api.billing.getBillingInfo({
            timeout: 15000,
          });

          if (seq !== requestSeqRef.current) return;

          const payload = extractBillingPayload(response);
          if (!payload) {
            throw new Error("Billing response missing subscription payload");
          }

          applySubscription(
            parseBilling(response),
            Boolean(payload?.inheritedWorkspaceAccess)
          );
          return;
        } catch (err) {
          if (isCanceledError(err)) return;

          const canRetry =
            attempt < maxAttempts - 1 && isRetryableBillingError(err);

          if (!canRetry) {
            console.warn("Billing fetch failed:", err);
            if (!hasLoadedRef.current) {
              clearSubscription();
            }
            return;
          }
        }
      }
    } finally {
      if (seq === requestSeqRef.current && showBlockingLoader) {
        setIsLoading(false);
      }
    }
  }, [
    applySubscription,
    clearSubscription,
    isAuthenticated,
    isAuthLoading,
    user?.id,
    workspaceLoading,
  ]);

  useEffect(() => {
    if (isAuthLoading || workspaceLoading) return;
    void refreshSubscription();
  }, [
    isAuthLoading,
    workspaceLoading,
    isAuthenticated,
    user?.id,
    activeWorkspaceId,
    refreshSubscription,
  ]);

  const value: SubscriptionContextValue = useMemo(
    () => ({
      tier,
      status,
      isPlanActive: isStatusActive(status),
      isTrialing: status === "trialing",
      inheritedWorkspaceAccess,
      currentPeriodStart,
      currentPeriodEnd,
      isLoading:
        (isAuthLoading && !hasLoadedRef.current) ||
        workspaceLoading ||
        isLoading,
      refreshSubscription,
    }),
    [
      tier,
      status,
      inheritedWorkspaceAccess,
      currentPeriodStart,
      currentPeriodEnd,
      isAuthLoading,
      workspaceLoading,
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
