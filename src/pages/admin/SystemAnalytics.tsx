import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminDesktopSidebar from "@/components/AdminDesktopSidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import {
  BarChart3,
  Activity,
  Server,
  Database,
  Cpu,
  Users,
  Upload,
  Zap,
  HardDrive,
  Wifi,
  TrendingUp,
  TrendingDown,
  Clock,
  Globe,
  AlertTriangle,
  CheckCircle,
  MemoryStick,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  CardSkeleton,
  ChartSkeleton,
  ListSkeleton,
} from "@/components/skeletons";
import ThemeToggle from "@/components/ThemeToggle";

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  avg_response_time: number;
  total_users: number;
  active_users: number;
  total_searches: number;
  success_rate: number;
  searches_today: number;
  new_users_today: number;
  searches_this_week: number;
  system_health: "healthy" | "warning" | "critical";
}

interface AnalyticsData {
  searches_by_day: Record<string, number>;
  registrations_by_day: Record<string, number>;
  time_range: string;
}

const SystemAnalytics = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [timeRange, setTimeRange] = useState("30d");
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { toast } = useToast();

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  useEffect(() => {
    fetchSystemData();
  }, [timeRange]);

  const fetchSystemData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch system metrics and analytics in parallel
      const [metricsResponse, analyticsResponse] = await Promise.all([
        api.admin.getAdminStats(),
        api.admin.getAnalytics(timeRange),
      ]);

      console.log("📊 System metrics response:", metricsResponse);
      console.log("📈 Analytics response:", analyticsResponse);

      if (metricsResponse.success && metricsResponse.data?.statistics) {
        const stats = metricsResponse.data.statistics;
        setMetrics({
          ...stats,
          system_health:
            (stats.system_health as "healthy" | "warning" | "critical") ||
            "healthy",
        });
      }

      // Use real analytics data from API
      if (analyticsResponse.success && analyticsResponse.data?.analytics) {
        const analyticsData = analyticsResponse.data.analytics;
        setAnalytics({
          searches_by_day: analyticsData.searches_by_day || {},
          registrations_by_day: analyticsData.registrations_by_day || {},
          time_range: analyticsData.time_range || timeRange,
        });
      } else {
        // Fallback to empty analytics if API fails
        setAnalytics({
          searches_by_day: {},
          registrations_by_day: {},
          time_range: timeRange,
        });
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching system data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch system data"
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load system analytics. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString();
  };

  const systemMetrics = {
    uptime: "47d 12h 34m",
    totalUsers: metrics?.total_users || 0,
    activeUsers: metrics?.active_users || 0,
    totalUploads: metrics?.total_searches || 0,
    avgResponseTime: metrics?.avg_response_time
      ? `${metrics.avg_response_time}ms`
      : "0ms",
    successRate: metrics?.success_rate || 0,
    errorRate: metrics?.success_rate ? 100 - metrics.success_rate : 0,
    dataProcessed: "2.4TB",
  };

  const performanceData = [
    {
      label: "CPU Usage",
      value: metrics?.cpu_usage || 0,
      unit: "%",
      status:
        (metrics?.cpu_usage || 0) > 80
          ? "critical"
          : (metrics?.cpu_usage || 0) > 60
          ? "warning"
          : "good",
      icon: Cpu,
      color: "from-blue-600 to-cyan-600",
    },
    {
      label: "Memory Usage",
      value: metrics?.memory_usage || 0,
      unit: "%",
      status:
        (metrics?.memory_usage || 0) > 80
          ? "critical"
          : (metrics?.memory_usage || 0) > 60
          ? "warning"
          : "good",
      icon: MemoryStick,
      color: "from-yellow-600 to-orange-600",
    },
    {
      label: "Disk Usage",
      value: metrics?.disk_usage || 0,
      unit: "%",
      status:
        (metrics?.disk_usage || 0) > 80
          ? "critical"
          : (metrics?.disk_usage || 0) > 60
          ? "warning"
          : "good",
      icon: HardDrive,
      color: "from-green-600 to-emerald-600",
    },
    {
      label: "Avg Response Time",
      value: metrics?.avg_response_time || 0,
      unit: "ms",
      status:
        (metrics?.avg_response_time || 0) > 1000
          ? "critical"
          : (metrics?.avg_response_time || 0) > 500
          ? "warning"
          : "good",
      icon: Wifi,
      color: "from-purple-600 to-violet-600",
    },
  ];

  const trafficStats = [
    {
      label: "Total Searches",
      value: metrics?.total_searches
        ? metrics.total_searches.toLocaleString()
        : "0",
      change:
        metrics?.searches_this_week && metrics?.searches_today
          ? `+${Math.round(
              (metrics.searches_today /
                Math.max(metrics.searches_this_week, 1)) *
                100
            )}%`
          : "+0%",
      trend:
        metrics?.searches_today &&
        metrics?.searches_this_week &&
        metrics.searches_today > 0
          ? "up"
          : "down",
    },
    {
      label: "Active Users",
      value: metrics?.active_users
        ? metrics.active_users.toLocaleString()
        : "0",
      change: metrics?.new_users_today ? `+${metrics.new_users_today}%` : "+0%",
      trend:
        metrics?.new_users_today && metrics.new_users_today > 0 ? "up" : "down",
    },
    {
      label: "Success Rate",
      value: metrics?.success_rate
        ? `${metrics.success_rate.toFixed(1)}%`
        : "0%",
      change: metrics?.success_rate
        ? `+${(metrics.success_rate - 90).toFixed(1)}%`
        : "+0%",
      trend: metrics?.success_rate && metrics.success_rate > 90 ? "up" : "down",
    },
    {
      label: "New Users Today",
      value: metrics?.new_users_today
        ? metrics.new_users_today.toLocaleString()
        : "0",
      change: metrics?.new_users_today ? `+${metrics.new_users_today}` : "+0",
      trend:
        metrics?.new_users_today && metrics.new_users_today > 0 ? "up" : "down",
    },
  ];

  const generateRecentActivity = () => {
    const activity = [];
    const now = new Date();

    if (metrics?.system_health) {
      activity.push({
        time: now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        action: `System health check: ${metrics.system_health}`,
        status:
          metrics.system_health === "healthy"
            ? "success"
            : metrics.system_health === "warning"
            ? "warning"
            : "error",
        icon: metrics.system_health === "healthy" ? CheckCircle : AlertTriangle,
      });
    }

    if (metrics?.cpu_usage && metrics.cpu_usage > 80) {
      activity.push({
        time: new Date(now.getTime() - 5 * 60 * 1000).toLocaleTimeString(
          "en-US",
          { hour: "2-digit", minute: "2-digit" }
        ),
        action: `High CPU usage detected: ${metrics.cpu_usage}%`,
        status: "warning",
        icon: AlertTriangle,
      });
    }

    if (metrics?.new_users_today && metrics.new_users_today > 0) {
      activity.push({
        time: new Date(now.getTime() - 15 * 60 * 1000).toLocaleTimeString(
          "en-US",
          { hour: "2-digit", minute: "2-digit" }
        ),
        action: `${metrics.new_users_today} new users registered today`,
        status: "info",
        icon: Users,
      });
    }

    if (metrics?.searches_today && metrics.searches_today > 0) {
      activity.push({
        time: new Date(now.getTime() - 30 * 60 * 1000).toLocaleTimeString(
          "en-US",
          { hour: "2-digit", minute: "2-digit" }
        ),
        action: `${metrics.searches_today} searches completed today`,
        status: "success",
        icon: Database,
      });
    }

    if (metrics?.avg_response_time && metrics.avg_response_time < 500) {
      activity.push({
        time: new Date(now.getTime() - 45 * 60 * 1000).toLocaleTimeString(
          "en-US",
          { hour: "2-digit", minute: "2-digit" }
        ),
        action: `API response time optimized: ${metrics.avg_response_time}ms`,
        status: "success",
        icon: Zap,
      });
    }

    return activity.slice(0, 5);
  };

  const recentActivity = generateRecentActivity();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-emerald-600 dark:text-green-400";
      case "warning":
        return "text-amber-600 dark:text-yellow-400";
      case "critical":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-green-600/20 dark:text-green-300 dark:border-green-500/30";
      case "warning":
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-yellow-600/20 dark:text-yellow-300 dark:border-yellow-500/30";
      case "error":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-600/20 dark:text-red-300 dark:border-red-500/30";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-600/20 dark:text-blue-300 dark:border-blue-500/30";
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-[#0B1026] dark:via-[#1A1033] dark:to-[#0C1226] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-40 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl opacity-60"
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
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl opacity-40"
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

      <motion.div
        initial={false}
        animate={{ marginLeft: isCollapsed ? 80 : 320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-4 lg:p-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 lg:space-y-8 max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-xl opacity-70 dark:from-blue-600/10 dark:to-purple-600/10" />
            <div className="relative rounded-3xl border border-border bg-card/95 backdrop-blur-xl shadow-soft-elevated px-4 py-4 sm:px-6 sm:py-6 dark:bg-black/20 dark:border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200 text-blue-700 backdrop-blur-xl mb-4 dark:border-blue-500/30 dark:text-blue-300"
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="mr-2"
                    >
                      <BarChart3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    </motion.div>
                    <span className="text-sm font-semibold">
                      System Analytics
                    </span>
                  </motion.div>
                  <motion.h1
                    className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground dark:bg-gradient-to-r dark:from-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    System Analytics
                  </motion.h1>
                  <motion.p
                    className="text-muted-foreground text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Real-time system performance monitoring
                  </motion.p>
                  <motion.p
                    className="text-muted-foreground text-sm"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    Last updated: {formatLastUpdated()}
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center space-x-3"
                >
                  <Badge className="px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-green-600/20 dark:text-green-300 dark:border-green-500/30">
                    <Activity className="w-4 h-4 mr-2" />
                    System Online
                  </Badge>
                  <Badge className="px-3 py-1 bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-600/20 dark:text-blue-300 dark:border-blue-500/30">
                    <Clock className="w-4 h-4 mr-2" />
                    {systemMetrics.uptime}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="Toggle theme"
                  >
                    <ThemeToggle />
                  </Button>
                  <Button
                    onClick={fetchSystemData}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                    className="border-border bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-white/5 dark:text-white dark:border-white/20 dark:hover:bg-white/10"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Refresh Data
                  </Button>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-32 border-border bg-card/80 text-foreground hover:bg-muted dark:border-white/20 dark:text-white dark:bg-white/5">
                      <SelectValue placeholder="Time Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-orange-600/10 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-card/95 backdrop-blur-xl border-red-500/30 shadow-soft-elevated dark:bg-black/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 text-red-500 dark:text-red-400">
                    <AlertTriangle className="w-6 h-6" />
                    <div>
                      <h3 className="text-lg font-semibold">
                        Error Loading System Data
                      </h3>
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Key Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {isLoading
              ? Array.from({ length: 4 }, (_, index) => (
                  <motion.div
                    key={`loading-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="relative"
                  >
                    <CardSkeleton variant="stats" />
                  </motion.div>
                ))
              : [
                  {
                    label: "Total Users",
                    value: systemMetrics.totalUsers.toLocaleString(),
                    icon: Users,
                    color: "from-blue-600 to-cyan-600",
                  },
                  {
                    label: "Active Users",
                    value: systemMetrics.activeUsers.toLocaleString(),
                    icon: Activity,
                    color: "from-green-600 to-emerald-600",
                  },
                  {
                    label: "Total Uploads",
                    value: systemMetrics.totalUploads.toLocaleString(),
                    icon: Upload,
                    color: "from-purple-600 to-violet-600",
                  },
                  {
                    label: "Success Rate",
                    value: `${systemMetrics.successRate}%`,
                    icon: CheckCircle,
                    color: "from-emerald-600 to-teal-600",
                  },
                ].map((metric, index) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="relative"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${metric.color} opacity-10 rounded-2xl blur-xl`}
                    />
                    <Card className="relative bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated hover:border-primary/30 hover:shadow-lg dark:bg-black/20 dark:border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {metric.label}
                            </p>
                            <p className="mt-1 text-2xl font-bold text-foreground dark:text-white">
                              {metric.value}
                            </p>
                          </div>
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-r ${metric.color} flex items-center justify-center`}
                          >
                            <metric.icon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Performance Metrics */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* System Performance */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl blur-xl opacity-60" />
                <Card className="relative bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                      <Server className="w-5 h-5 text-blue-400" />
                      <span>System Performance</span>
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Real-time system resource monitoring
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {performanceData.map((item, index) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9 + index * 0.1 }}
                          className="relative p-4 rounded-xl bg-muted/80 border border-border/60 hover:bg-muted transition-all duration-300 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-10 h-10 rounded-lg bg-gradient-to-r ${item.color} flex items-center justify-center`}
                              >
                                <item.icon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-foreground dark:text-white">
                                  {item.label}
                                </div>
                                <div
                                  className={`text-sm ${getStatusColor(
                                    item.status
                                  )}`}
                                >
                                  {item.status === "good"
                                    ? "Normal"
                                    : item.status === "warning"
                                    ? "High"
                                    : "Critical"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-xl font-bold ${getStatusColor(
                                  item.status
                                )}`}
                              >
                                {item.value}
                                {item.unit}
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-700/50 rounded-full h-2">
                            <motion.div
                              className={`h-2 rounded-full bg-gradient-to-r ${item.color}`}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${
                                  typeof item.value === "number"
                                    ? item.value
                                    : 0
                                }%`,
                              }}
                              transition={{
                                delay: 1 + index * 0.1,
                                duration: 1,
                              }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Traffic Statistics */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl blur-xl opacity-60" />
                <Card className="relative bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                      <Globe className="w-5 h-5 text-blue-400" />
                      <span>Traffic Statistics</span>
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      API and upload traffic analytics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {trafficStats.map((stat, index) => (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.1 + index * 0.1 }}
                          className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-muted-foreground">
                                {stat.label}
                              </div>
                              <div className="text-xl font-bold text-foreground dark:text-white">
                                {stat.value}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {stat.trend === "up" ? (
                                <TrendingUp className="w-5 h-5 text-green-400" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-red-400" />
                              )}
                              <span
                                className={`text-sm font-medium ${
                                  stat.trend === "up"
                                    ? "text-emerald-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {stat.change}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                    <Activity className="w-5 h-5 text-green-400" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    System events and alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 + index * 0.1 }}
                        className="flex items-start space-x-3 p-3 rounded-xl bg-muted/80 border border-border/60 hover:bg-muted transition-colors dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
                      >
                        <div className="flex-shrink-0">
                          <Badge
                            className={`${getActivityStatusColor(
                              activity.status
                            )} p-1`}
                          >
                            <activity.icon className="w-3 h-3" />
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground dark:text-white">
                            {activity.action}
                          </p>
                          <p className="text-xs text-muted-foreground dark:text-gray-400">
                            {activity.time}
                          </p>
                        </div>
                      </motion.div>
                    ))}
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

export default SystemAnalytics;
