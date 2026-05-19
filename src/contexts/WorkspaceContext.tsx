import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  api,
  setWorkspaceIdProvider,
  type WorkspaceQuota,
  type WorkspaceRecord,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type WorkspaceContextValue = {
  workspaces: WorkspaceRecord[];
  activeWorkspace: WorkspaceRecord | null;
  activeWorkspaceId: string | null;
  quota: WorkspaceQuota | null;
  isLoading: boolean;
  needsSetup: boolean;
  refreshWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<WorkspaceRecord | null>;
  renameWorkspace: (
    workspaceId: string,
    name: string
  ) => Promise<WorkspaceRecord | null>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined
);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceRecord | null>(
    null
  );
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [quota, setQuota] = useState<WorkspaceQuota | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const applyPayload = useCallback(
    (data?: {
      workspaces?: WorkspaceRecord[];
      activeWorkspaceId?: string | null;
      activeWorkspace?: WorkspaceRecord | null;
      needsSetup?: boolean;
      quota?: WorkspaceQuota;
    }) => {
      const list = data?.workspaces ?? [];
      setWorkspaces(list);
      setActiveWorkspaceId(data?.activeWorkspaceId ?? list[0]?.id ?? null);
      setActiveWorkspace(
        data?.activeWorkspace ??
          list.find((w) => w.id === data?.activeWorkspaceId) ??
          list[0] ??
          null
      );
      setNeedsSetup(Boolean(data?.needsSetup));
      if (data?.quota) setQuota(data.quota);
    },
    []
  );

  const refreshWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setActiveWorkspaceId(null);
      setQuota(null);
      setNeedsSetup(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.workspaces.list({ bootstrap: true });
      if (res.success && res.data) {
        applyPayload(res.data);
      }
    } catch (err) {
      console.warn("Failed to load workspaces:", err);
    } finally {
      setIsLoading(false);
    }
  }, [applyPayload, isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    void refreshWorkspaces();
  }, [authLoading, isAuthenticated, refreshWorkspaces]);

  useEffect(() => {
    if (!isAuthenticated || !activeWorkspaceId) {
      setWorkspaceIdProvider(null);
      return;
    }
    setWorkspaceIdProvider(() => activeWorkspaceId);
    return () => setWorkspaceIdProvider(null);
  }, [isAuthenticated, activeWorkspaceId]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      const res = await api.workspaces.activate(workspaceId);
      if (res.success && res.data) {
        setActiveWorkspaceId(res.data.activeWorkspaceId);
        setActiveWorkspace(res.data.activeWorkspace);
        await checkAuth();
      }
    },
    [checkAuth]
  );

  const createWorkspace = useCallback(
    async (name: string) => {
      try {
        const res = await api.workspaces.create(name.trim());
        if (res.success && res.data) {
          applyPayload(res.data);
          await checkAuth();
          return res.data.activeWorkspace;
        }
        const message =
          (res as { message?: string }).message ||
          (typeof res.error === "string" ? res.error : undefined);
        throw new Error(message || "Could not create workspace");
      } catch (err: unknown) {
        const axiosMsg =
          err &&
          typeof err === "object" &&
          "response" in err &&
          (err as { response?: { data?: { message?: string } } }).response?.data
            ?.message;
        throw new Error(
          axiosMsg || (err instanceof Error ? err.message : "Could not create workspace")
        );
      }
    },
    [applyPayload, checkAuth]
  );

  const renameWorkspace = useCallback(
    async (workspaceId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error("Workspace name is required");
      }

      try {
        const res = await api.workspaces.update(workspaceId, trimmed);
        if (res.success && res.data?.workspace) {
          const updated = res.data.workspace;
          setWorkspaces((prev) =>
            prev.map((w) => (w.id === workspaceId ? { ...w, ...updated } : w))
          );
          if (activeWorkspaceId === workspaceId) {
            setActiveWorkspace(updated);
            await checkAuth();
          }
          return updated;
        }
        const message =
          (res as { message?: string }).message ||
          (typeof res.error === "string" ? res.error : undefined);
        throw new Error(message || "Could not rename workspace");
      } catch (err: unknown) {
        const axiosMsg =
          err &&
          typeof err === "object" &&
          "response" in err &&
          (err as { response?: { data?: { message?: string } } }).response?.data
            ?.message;
        throw new Error(
          axiosMsg || (err instanceof Error ? err.message : "Could not rename workspace")
        );
      }
    },
    [activeWorkspaceId, checkAuth]
  );

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspace,
      activeWorkspaceId,
      quota,
      isLoading,
      needsSetup,
      refreshWorkspaces,
      switchWorkspace,
      createWorkspace,
      renameWorkspace,
    }),
    [
      workspaces,
      activeWorkspace,
      activeWorkspaceId,
      quota,
      isLoading,
      needsSetup,
      refreshWorkspaces,
      switchWorkspace,
      createWorkspace,
      renameWorkspace,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}
