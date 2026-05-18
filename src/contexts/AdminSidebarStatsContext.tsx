import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";

type AdminSidebarStats = {
  totalUsers: number;
  recentAlerts: number;
  systemHealth: "healthy" | "warning" | "critical";
  isLoading: boolean;
};

const AdminSidebarStatsContext = createContext<AdminSidebarStats>({
  totalUsers: 0,
  recentAlerts: 0,
  systemHealth: "healthy",
  isLoading: true,
});

export const AdminSidebarStatsProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState(0);
  const [systemHealth, setSystemHealth] =
    useState<AdminSidebarStats["systemHealth"]>("healthy");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await api.admin.getAdminStats();
        const stats = (
          response.data as {
            statistics?: {
              total_users?: number;
              recent_alerts?: number;
              system_health?: AdminSidebarStats["systemHealth"];
            };
          }
        )?.statistics;

        if (!cancelled && response.success && stats) {
          setTotalUsers(stats.total_users ?? 0);
          setRecentAlerts(stats.recent_alerts ?? 0);
          setSystemHealth(stats.system_health ?? "healthy");
        }
      } catch {
        /* optional sidebar metrics */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ totalUsers, recentAlerts, systemHealth, isLoading }),
    [isLoading, recentAlerts, systemHealth, totalUsers]
  );

  return (
    <AdminSidebarStatsContext.Provider value={value}>
      {children}
    </AdminSidebarStatsContext.Provider>
  );
};

export const useAdminSidebarStats = () => useContext(AdminSidebarStatsContext);
