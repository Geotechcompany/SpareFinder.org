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
import { api, tokenStorage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AdminDesktopSidebar from "@/components/AdminDesktopSidebar";
import MobileSidebar from "@/components/MobileSidebar";
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
  Menu,
  RefreshCw,
  Download,
  Bell,
  Clock,
  Zap,
  Database,
  Server,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

const AdminDashboardLayout = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { toast } = useToast();
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  // Check authentication and token validity
  const checkAuthentication = async () => {
    try {
      const token = tokenStorage.getToken();

      if (!token) {
        console.log("🔒 No admin token found in session storage");
        navigate("/admin/login");
        return false;
      }

      console.log("🔍 Admin token found, validating...");

      // Verify token with backend
      const userResponse = await api.auth.getCurrentUser();

      if (userResponse.success && userResponse.data?.user) {
        const userData = userResponse.data.user;

        // Check if user has admin role
        if (
          !userData.role ||
          !["admin", "super_admin"].includes(userData.role)
        ) {
          console.log("❌ User does not have admin privileges");
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You don't have admin privileges to access this page.",
          });
          navigate("/dashboard");
          return false;
        }

        console.log("✅ Admin authentication successful:", userData);
        setAdminUser(userData);
        setIsAuthenticated(true);
        return true;
      } else {
        console.warn("❌ Admin token validation failed:", userResponse.error);
        tokenStorage.clearAll();
        navigate("/admin/login");
        return false;
      }
    } catch (error) {
      console.error("❌ Admin authentication check failed:", error);
      tokenStorage.clearAll();
      navigate("/admin/login");
      return false;
    }
  };

  useEffect(() => {
    const initializeAdmin = async () => {
      // Wait for auth context to load
      if (authLoading) {
        return;
      }

      const isValid = await checkAuthentication();
      if (isValid) {
        fetchAdminData(true); // Skip auth check since we just validated
      }
    };

    initializeAdmin();
  }, [authLoading]);

  const fetchAdminData = async (skipAuthCheck = false) => {
    if (!skipAuthCheck && !isAuthenticated) {
      console.log("⏳ Skipping admin data fetch - not authenticated");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log("📊 Fetching admin dashboard data...");

      // Check token before making requests
      const token = tokenStorage.getToken();
      if (!token) {
        console.log("❌ No token available for admin data fetch");
        navigate("/admin/login");
        return;
      }

      // Fetch admin stats
      const statsResponse = await api.admin.getAdminStats();
      if (statsResponse.success && statsResponse.data?.statistics) {
        console.log(
          "✅ Admin stats fetched successfully:",
          statsResponse.data.statistics
        );
        setStats(statsResponse.data.statistics);
      } else {
        console.warn("❌ Failed to fetch admin stats:", statsResponse);
        throw new Error(
          statsResponse.error || "Failed to fetch admin statistics"
        );
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
        tokenStorage.clearAll();
        navigate("/admin/login");
        return;
      }

      const errorMessage =
        err instanceof Error ? err.message : "Failed to load admin data";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
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

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleRefresh = () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to refresh admin data.",
      });
      navigate("/admin/login");
      return;
    }

    fetchAdminData(false); // Use normal auth check for manual refresh
    toast({
      title: "Data Refreshed",
      description: "Admin dashboard data has been updated.",
    });
  };

  const handleTryAgain = () => {
    fetchAdminData(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      tokenStorage.clearAll();
      navigate("/admin/login");
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      tokenStorage.clearAll();
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">{error}</p>
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
      title: "Total Users",
      value: stats?.total_users?.toLocaleString() || "0",
      change: `+${stats?.new_users_today || 0} today`,
      icon: Users,
      color: "from-blue-600 to-cyan-600",
      trend: "up",
    },
    {
      title: "Total Searches",
      value: stats?.total_searches?.toLocaleString() || "0",
      change: `+${stats?.searches_today || 0} today`,
      icon: Search,
      color: "from-green-600 to-emerald-600",
      trend: "up",
    },
    {
      title: "Active Users",
      value: stats?.active_users?.toLocaleString() || "0",
      change: "Last 30 days",
      icon: Activity,
      color: "from-purple-600 to-pink-600",
      trend: "up",
    },
    {
      title: "Success Rate",
      value: `${stats?.success_rate?.toFixed(1) || "0"}%`,
      change: "AI Accuracy",
      icon: TrendingUp,
      color: "from-orange-600 to-red-600",
      trend: "up",
    },
  ];

  const systemMetrics = [
    {
      title: "Response Time",
      value: `${stats?.avg_response_time || 0}ms`,
      icon: Zap,
      color: "text-yellow-400",
    },
    {
      title: "CPU Usage",
      value: `${stats?.cpu_usage || 0}%`,
      icon: Server,
      color: "text-blue-400",
    },
    {
      title: "Memory Usage",
      value: `${stats?.memory_usage || 0}%`,
      icon: Database,
      color: "text-green-400",
    },
    {
      title: "Disk Usage",
      value: `${stats?.disk_usage || 0}%`,
      icon: Database,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-[#0B1026] dark:via-[#1A1033] dark:to-[#0C1226] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-40 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl opacity-60"
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
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl opacity-40"
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

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Menu Button */}
      <button
        onClick={handleToggleMobileMenu}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-black/20 backdrop-blur-xl border border-white/10 md:hidden"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={{
          marginLeft: isCollapsed ? "80px" : "320px",
          width: isCollapsed ? "calc(100% - 80px)" : "calc(100% - 320px)",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/admin/dashboard">
                      Admin
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Overview</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground dark:bg-gradient-to-r dark:from-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent">
                  Admin Dashboard
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Welcome back, {adminUser?.full_name || "Administrator"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-600/20 dark:text-purple-400 dark:border-purple-500/30"
              >
                <Shield className="w-3 h-3 mr-1" />
                {adminUser?.role === "super_admin"
                  ? "Super Admin"
                  : "Administrator"}
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
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="border-border bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-white/5 dark:text-white dark:border-white/20 dark:hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10"
              >
                Logout
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {quickStats.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative group"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-10 rounded-2xl blur-xl group-hover:opacity-20 transition-opacity`}
                />
                <Card className="relative bg-card/90 backdrop-blur-xl border-border shadow-soft-elevated hover:border-primary/30 hover:shadow-lg dark:bg-black/40 dark:border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-foreground dark:text-white">
                          {stat.value}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {stat.change}
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg`}
                      >
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* System Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* System Performance */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 blur-xl opacity-70 dark:from-purple-600/10 dark:to-blue-600/10" />
              <Card className="relative h-full bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                    <Server className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                    <span>System Performance</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Real-time system metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {systemMetrics.map((metric, index) => (
                      <div
                        key={metric.title}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/70 text-sm text-foreground dark:bg-white/5"
                      >
                        <div className="flex items-center space-x-3">
                          <metric.icon className={`w-5 h-5 ${metric.color}`} />
                          <span className="text-gray-300">{metric.title}</span>
                        </div>
                        <span className="font-semibold text-foreground dark:text-white">
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
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-xl opacity-70 dark:from-blue-600/10 dark:to-purple-600/10" />
              <Card className="relative h-full bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                    <Activity className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Latest system activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats?.recent_searches
                      ?.slice(0, 5)
                      .map((search, index) => (
                        <div
                          key={search.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                        >
                          <div className="flex items-center space-x-3">
                            <Search className="w-4 h-4 text-blue-400" />
                            <div>
                              <p className="text-white text-sm">Part Search</p>
                              <p className="text-gray-400 text-xs">
                                {search.profiles?.email || "Unknown user"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant="secondary"
                              className="bg-green-600/20 text-green-400 border-green-500/30 text-xs"
                            >
                              {Math.round((search.confidence_score || 0) * 100)}
                              %
                            </Badge>
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(search.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      )) || (
                      <div className="text-center py-8 text-gray-400">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No recent activity</p>
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
