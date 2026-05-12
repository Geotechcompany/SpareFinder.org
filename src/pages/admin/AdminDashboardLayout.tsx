import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AdminDesktopSidebar from "@/components/AdminDesktopSidebar";
import { ADMIN_MOBILE_TOP_PADDING, useAdminMainMotion } from "@/lib/admin-layout";
import {
  PageSkeleton,
  CardSkeleton,
  ListSkeleton,
  ChartSkeleton,
} from "@/components/skeletons";
import {
  Loader2,
  AlertCircle,
  Users,
  Search,
  Activity,
  TrendingUp,
  Shield,
  Settings,
  FileText,
  BarChart3,
  RefreshCw,
  LogOut,
  Download,
  Bell,
  Clock,
  Zap,
  Database,
  Server,
  CreditCard,
  PoundSterling,
} from "lucide-react";
import { PLAN_CONFIG } from "@/lib/plans";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AdminPageHeader, AdminPageHeaderToolbar } from "@/components/admin/AdminPageHeader";
import { AdminKpiStatCard } from "@/components/admin/AdminKpiStatCard";

interface AdminStats {
  total_users: number;
  total_searches: number;
  active_users: number;
  success_rate: number;
  searches_today: number;
  new_users_today: number;
  searches_this_week: number;
  system_health: string;
  pending_tasks: number;
  recent_alerts: number;
  recent_searches: any[];
  top_users: any[];
  avg_response_time: number;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
}

interface SubscriptionStatistics {
  total?: number;
  by_tier?: {
    free?: number;
    pro?: number;
    enterprise?: number;
  };
  by_status?: {
    active?: number;
    canceled?: number;
    past_due?: number;
    unpaid?: number;
    trialing?: number;
  };
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

type AdminAnalytics = {
  searches_by_day: Record<string, number>;
  registrations_by_day: Record<string, number>;
  time_range: string;
};

type OnboardingSummary = {
  range: string;
  total: number;
  byReferralSource: Record<string, number>;
  byCompanySize: Record<string, number>;
  byRole: Record<string, number>;
  byPrimaryGoal: Record<string, number>;
  topInterests: Array<{ interest: string; count: number }>;
};

const AdminDashboardLayout = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [subscriptionStats, setSubscriptionStats] =
    useState<SubscriptionStatistics | null>(null);
  const [estimatedRevenue, setEstimatedRevenue] = useState<number | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const mainMotion = useAdminMainMotion(isCollapsed);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [onboardingSummary, setOnboardingSummary] = useState<OnboardingSummary | null>(null);

  const { toast } = useToast();
  const {
    user,
    isLoading: authLoading,
    logout,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth context to load
    if (authLoading) return;

    // Admin routes are already wrapped by AdminProtectedRoute, but keep a defensive check
    if (!isAuthenticated) {
      navigate("/admin/login");
      return;
    }

    const hasAdminRole = isSuperAdmin || isAdmin;
    if (!hasAdminRole) {
      navigate("/unauthorized");
      return;
    }

    if (user) {
      setAdminUser({
        id: user.id,
        email: user.email,
        full_name: user.full_name || "Administrator",
        role: (user as any).role,
        avatar_url: user.avatar_url || undefined,
      });
    }

    fetchAdminData();
  }, [authLoading, isAuthenticated, isAdmin, isSuperAdmin, user?.id]);

  const fetchAdminData = async () => {
    if (!isAuthenticated || !(isSuperAdmin || isAdmin)) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log("📊 Fetching admin dashboard data...");

      // Fetch admin stats
      const statsResponse = await api.admin.getAdminStats();
      const statistics = statsResponse.data?.statistics;
      if (statsResponse.success && statistics) {
        console.log("✅ Admin stats fetched successfully:", statistics);
        setStats(statistics as AdminStats);
      } else {
        console.warn("❌ Failed to fetch admin stats:", statsResponse);
        throw new Error(
          statsResponse.error || "Failed to fetch admin statistics"
        );
      }

      // Best-effort fetch of subscriber statistics for revenue analytics
      try {
        const subscribersResponse = await api.admin.getSubscribers(
          1,
          1,
          "all",
          "all"
        );

        const statsData = (subscribersResponse.data as any)?.statistics;

        if (subscribersResponse.success && statsData) {
          const subsStats = statsData as SubscriptionStatistics;
          setSubscriptionStats(subsStats);

          const byTier = subsStats.by_tier || {};
          const freeCount = byTier.free || 0;
          const proCount = byTier.pro || 0;
          const enterpriseCount = byTier.enterprise || 0;

          const totalRevenue =
            freeCount * PLAN_CONFIG.free.price +
            proCount * PLAN_CONFIG.pro.price +
            enterpriseCount * PLAN_CONFIG.enterprise.price;

          setEstimatedRevenue(totalRevenue);
        } else {
          setSubscriptionStats(null);
          setEstimatedRevenue(null);
        }
      } catch (subErr) {
        console.error(
          "⚠️ Failed to fetch subscriber statistics for dashboard revenue:",
          subErr
        );
        setSubscriptionStats(null);
        setEstimatedRevenue(null);
      }

      // Best-effort: fetch analytics and onboarding summary for charts
      try {
        const [analyticsResp, onboardingResp] = await Promise.all([
          api.admin.getAnalytics("30d"),
          api.admin.getOnboardingSurveysSummary("90d"),
        ]);

        const analyticsData = (analyticsResp as any)?.data?.analytics;
        if (analyticsData?.searches_by_day && analyticsData?.registrations_by_day) {
          setAnalytics(analyticsData as AdminAnalytics);
        } else {
          setAnalytics(null);
        }

        const onboardingData = (onboardingResp as any)?.data;
        if (onboardingData?.byReferralSource) {
          setOnboardingSummary(onboardingData as OnboardingSummary);
        } else {
          setOnboardingSummary(null);
        }
      } catch (chartErr) {
        console.warn("⚠️ Failed to load admin charts:", chartErr);
        setAnalytics(null);
        setOnboardingSummary(null);
      }
    } catch (err: any) {
      console.error("❌ Error fetching admin data:", err);

      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log("🔒 Admin authentication error, redirecting to login");
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Your admin session has expired. Please log in again.",
        });
        await logout();
        navigate("/admin/login");
        return;
      }

      const errorMessage =
        err instanceof Error ? err.message : "Failed to load admin data";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Could not load dashboard",
        description: errorMessage,
      });
    } finally {
      console.log("📊 Setting admin dashboard loading to false");
      setIsLoading(false);
    }
  };

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleRefresh = () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Please sign in",
        description: "You need to be logged in to refresh this page.",
      });
      navigate("/admin/login");
      return;
    }

    fetchAdminData();
    toast({
      title: "Numbers updated",
      description: "You are seeing the latest activity on the dashboard.",
    });
  };

  const handleTryAgain = () => {
    fetchAdminData();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin/login");
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      navigate("/admin/login");
    }
  };

  console.log("📊 Admin Dashboard render state:", {
    authLoading,
    isLoading,
    isAuthenticated,
    stats: !!stats,
    error,
  });

  // Show loading while checking authentication or fetching data
  if (authLoading || isLoading) {
    console.log("📊 Rendering admin dashboard skeleton");
    return (
      <PageSkeleton variant="dashboard" showSidebar={true} showHeader={true} />
    );
  }

  if (error) {
    return (
      <div className="dashboard-premium min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-purple-500 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="space-x-2">
            <Button onClick={handleTryAgain} variant="outline">
              Try Again
            </Button>
            <Button onClick={handleLogout} variant="ghost">
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  console.log("📊 Rendering admin dashboard main content");
  const quickStats = [
    {
      title: "Signed-up users",
      value: (stats?.total_users ?? 0).toLocaleString(),
      subtitle: `+${stats?.new_users_today || 0} joined today`,
      icon: Users,
      iconClassName:
        "bg-violet-500/[0.11] text-violet-600 ring-violet-500/15 dark:text-violet-400",
      animation: { target: stats?.total_users ?? 0, kind: "integer" as const },
    },
    {
      title: "Part lookups",
      value: (stats?.total_searches ?? 0).toLocaleString(),
      subtitle: `+${stats?.searches_today || 0} run today`,
      icon: Search,
      iconClassName:
        "bg-emerald-500/[0.11] text-emerald-600 ring-emerald-500/15 dark:text-emerald-400",
      animation: { target: stats?.total_searches ?? 0, kind: "integer" as const },
    },
    {
      title: "Recently active users",
      value: (stats?.active_users ?? 0).toLocaleString(),
      subtitle: "Used the app in the last 30 days",
      icon: Activity,
      iconClassName:
        "bg-primary/[0.11] text-primary ring-primary/15",
      animation: { target: stats?.active_users ?? 0, kind: "integer" as const },
    },
    {
      title: "Successful AI matches",
      value: `${stats?.success_rate?.toFixed(1) ?? "0.0"}%`,
      subtitle: "Lookups that ended with a strong match",
      icon: TrendingUp,
      iconClassName:
        "bg-amber-500/[0.11] text-amber-600 ring-amber-500/15 dark:text-amber-400",
      animation: {
        target: stats?.success_rate ?? 0,
        kind: "percent1" as const,
      },
    },
  ];

  const systemMetrics = [
    {
      title: "Typical response time",
      value: `${stats?.avg_response_time || 0}ms`,
      icon: Zap,
      color: "text-yellow-400",
    },
    {
      title: "Server processing",
      value: `${stats?.cpu_usage || 0}%`,
      icon: Server,
      color: "text-blue-400",
    },
    {
      title: "Server memory in use",
      value: `${stats?.memory_usage || 0}%`,
      icon: Database,
      color: "text-green-400",
    },
    {
      title: "Disk space used",
      value: `${stats?.disk_usage || 0}%`,
      icon: Database,
      color: "text-purple-400",
    },
  ];

  const revenueStats = [
    {
      title: "Rough monthly income",
      value:
        estimatedRevenue !== null
          ? `£${estimatedRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : "£0.00",
      subtitle: "From listed plan prices (estimate only)",
      icon: PoundSterling,
      iconClassName:
        "bg-emerald-500/[0.11] text-emerald-600 ring-emerald-500/15 dark:text-emerald-400",
      animation: {
        target: estimatedRevenue ?? 0,
        kind: "currencyGBP" as const,
      },
    },
    {
      title: "People on a plan",
      value:
        subscriptionStats?.total !== undefined
          ? subscriptionStats.total.toLocaleString()
          : "0",
      subtitle: "Free and paid plans combined",
      icon: Users,
      iconClassName:
        "bg-violet-500/[0.11] text-violet-600 ring-violet-500/15 dark:text-violet-400",
      animation: {
        target: subscriptionStats?.total ?? 0,
        kind: "integer" as const,
      },
    },
    {
      title: "Paying subscriptions",
      value:
        subscriptionStats?.by_status?.active !== undefined
          ? subscriptionStats.by_status.active.toLocaleString()
          : "0",
      subtitle: "Currently in good standing",
      icon: CreditCard,
      iconClassName:
        "bg-primary/[0.11] text-primary ring-primary/15",
      animation: {
        target: subscriptionStats?.by_status?.active ?? 0,
        kind: "integer" as const,
      },
    },
    {
      title: "Canceled plans",
      value:
        subscriptionStats?.by_status?.canceled !== undefined
          ? subscriptionStats.by_status.canceled.toLocaleString()
          : "0",
      subtitle: "All-time cancellations",
      icon: TrendingUp,
      iconClassName:
        "bg-amber-500/[0.11] text-amber-600 ring-amber-500/15 dark:text-amber-400",
      animation: {
        target: subscriptionStats?.by_status?.canceled ?? 0,
        kind: "integer" as const,
      },
    },
  ];

  const formatDayLabel = (isoDate: string) => {
    // isoDate: YYYY-MM-DD
    const d = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  };

  const timeSeries = (() => {
    const searches = analytics?.searches_by_day ?? {};
    const regs = analytics?.registrations_by_day ?? {};
    const keys = Array.from(new Set([...Object.keys(searches), ...Object.keys(regs)])).sort();
    return keys.map((date) => ({
      date,
      label: formatDayLabel(date),
      searches: searches[date] ?? 0,
      registrations: regs[date] ?? 0,
    }));
  })();

  const referralBars = (() => {
    const by = onboardingSummary?.byReferralSource ?? {};
    return Object.entries(by)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  })();

  const tierPie = (() => {
    const byTier = subscriptionStats?.by_tier ?? {};
    return [
      { name: "Starter", key: "free", value: byTier.free || 0, color: "#60a5fa" },
      { name: "Pro", key: "pro", value: byTier.pro || 0, color: "#a78bfa" },
      { name: "Enterprise", key: "enterprise", value: byTier.enterprise || 0, color: "#34d399" },
    ].filter((x) => x.value > 0);
  })();

  const formatConfidencePct = (raw: any) => {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) return 0;
    // support [0..1] and [0..100]
    const pct = n <= 1 ? n * 100 : n;
    return Math.max(0, Math.min(100, Math.round(pct)));
  };

  return (
    <div className="dashboard-premium min-h-screen flex w-full bg-background relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="hidden"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="hidden"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <AdminDesktopSidebar
        isCollapsed={isCollapsed}
        onToggle={handleToggleSidebar}
      />

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={mainMotion}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible ${ADMIN_MOBILE_TOP_PADDING}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-7xl mx-auto"
        >
          <AdminPageHeader
            breadcrumbPage="Overview"
            title="Your dashboard"
            description={
              <>
                Hi,{" "}
                {(adminUser?.full_name?.trim() && adminUser.full_name.trim().split(/\s+/)[0]) || "there"} — here&apos;s a
                quick snapshot of how SpareFinder is doing.
              </>
            }
            actions={
              <AdminPageHeaderToolbar>
                <Badge
                  variant="secondary"
                  className="h-9 shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 text-xs font-medium text-primary shadow-none dark:border-primary/25 dark:bg-primary/15"
                >
                  <Shield className="mr-1.5 h-3.5 w-3.5 opacity-90" aria-hidden />
                  {adminUser?.role === "super_admin" ? "Super admin" : "Admin"}
                </Badge>
                <div className="mx-0.5 hidden h-7 w-px bg-border/70 sm:block" aria-hidden />
                <ThemeToggle />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={handleRefresh}
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-2 rounded-xl px-3 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      aria-label="Update dashboard numbers"
                    >
                      <RefreshCw className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">Update</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="rounded-lg border-border/60 text-xs">
                    Load the latest numbers
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={handleLogout}
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-2 rounded-xl px-3 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      aria-label="Sign out of admin"
                    >
                      <LogOut className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      <span className="hidden sm:inline">Sign out</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="rounded-lg border-border/60 text-xs">
                    Sign out of admin
                  </TooltipContent>
                </Tooltip>
              </AdminPageHeaderToolbar>
            }
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {quickStats.map((stat, index) => (
              <AdminKpiStatCard
                key={stat.title}
                title={stat.title}
                subtitle={stat.subtitle}
                icon={stat.icon}
                index={index}
                iconClassName={stat.iconClassName}
                value={stat.value}
                animation={stat.animation}
              />
            ))}
          </div>

          {/* Revenue & Subscribers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {revenueStats.map((stat, index) => (
              <AdminKpiStatCard
                key={stat.title}
                title={stat.title}
                subtitle={stat.subtitle}
                icon={stat.icon}
                index={index}
                staggerGroupDelay={0.08}
                iconClassName={stat.iconClassName}
                value={stat.value}
                animation={stat.animation}
              />
            ))}
          </div>

          {/* Growth & Acquisition */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Growth Chart */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="relative lg:col-span-2"
            >
              <div className="hidden" />
              <Card className="premium-card relative bg-card/95 backdrop-blur-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <TrendingUp className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                        Growth — last 30 days
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Daily part lookups and new sign-ups
                      </CardDescription>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-primary/15 text-primary border-primary/30"
                    >
                      {analytics?.time_range || "30d"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  {timeSeries.length ? (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timeSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradSearches" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="gradRegs" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.30} />
                              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                          <YAxis tickLine={false} axisLine={false} fontSize={12} />
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(17,24,39,0.85)",
                              color: "white",
                            }}
                            labelStyle={{ color: "rgba(255,255,255,0.85)" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="searches"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            fill="url(#gradSearches)"
                            name="Lookups"
                          />
                          <Area
                            type="monotone"
                            dataKey="registrations"
                            stroke="#60a5fa"
                            strokeWidth={2}
                            fill="url(#gradRegs)"
                            name="New sign-ups"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      No data for this chart yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Subscription mix */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="relative"
            >
              <div className="hidden" />
              <Card className="premium-card relative h-full bg-card/95 backdrop-blur-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <CreditCard className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                    Plans people are on
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Free, Pro, and Enterprise breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {tierPie.length ? (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={tierPie}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={92}
                            paddingAngle={2}
                          >
                            {tierPie.map((entry) => (
                              <Cell key={entry.key} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(17,24,39,0.85)",
                              color: "white",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      No subscription breakdown yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Acquisition (Onboarding surveys) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="relative"
          >
            <div className="hidden" />
            <Card className="premium-card relative bg-card/95 backdrop-blur-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                      Where people heard about you
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Top answers from the welcome survey
                    </CardDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-accent/15 text-accent border-accent/30"
                  >
                    {onboardingSummary ? onboardingSummary.range : "—"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {referralBars.length ? (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={referralBars} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="source" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} />
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "rgba(17,24,39,0.85)",
                            color: "white",
                          }}
                        />
                        <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#60a5fa" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                    No survey answers to show yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* System Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* System Performance */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="hidden" />
              <Card className="premium-card relative h-full bg-card/95 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground">
                    <Server className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                    <span>How the servers are doing</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Live readings (may be a minute behind)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {systemMetrics.map((metric, index) => (
                      <div
                        key={metric.title}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/70 text-sm text-foreground"
                      >
                        <div className="flex items-center space-x-3">
                          <metric.icon className={`w-5 h-5 ${metric.color}`} />
                          <span className="text-foreground">{metric.title}</span>
                        </div>
                        <span className="font-semibold text-foreground">
                          {metric.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="hidden" />
              <Card className="premium-card relative h-full bg-card/95 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground">
                    <Activity className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                    <span>Latest part lookups</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    The five most recent searches
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats?.recent_searches
                      ?.slice(0, 5)
                      .map((search, index) => (
                        <div
                          key={search.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/60 border border-border/60"
                        >
                          <div className="flex items-center space-x-3">
                            <Search className="w-4 h-4 text-blue-400" />
                            <div>
                              <p className="text-foreground text-sm">Part lookup</p>
                              <p className="text-muted-foreground text-xs">
                                {search.profiles?.email || "Unknown user"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant="secondary"
                              className="bg-green-600/20 text-green-400 border-green-500/30 text-xs"
                            >
                              {formatConfidencePct(search.ai_confidence ?? search.confidence_score)}%
                            </Badge>
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(search.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      )) || (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No recent lookups yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminDashboardLayout;
