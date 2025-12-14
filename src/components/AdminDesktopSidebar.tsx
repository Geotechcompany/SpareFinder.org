import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Skeleton,
  SkeletonAvatar,
  SkeletonText,
} from "@/components/ui/skeleton";
import {
  Users,
  Shield,
  BarChart3,
  Settings,
  Terminal,
  Database,
  LogOut,
  Mail,
  CreditCard,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Crown,
  Server,
  Activity,
  Bell,
  Search,
  FileText,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
} from "lucide-react";

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalSearches: number;
  systemHealth: "healthy" | "warning" | "critical";
  pendingTasks: number;
  recentAlerts: number;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  last_login?: string;
}

type AdminStatsApiResponse = {
  statistics?: {
    total_users?: number;
    active_users?: number;
    total_searches?: number;
    system_health?: "healthy" | "warning" | "critical";
    pending_tasks?: number;
    recent_alerts?: number;
  };
};

const AdminDesktopSidebar: React.FC<AdminSidebarProps> = ({
  isCollapsed = false,
  onToggle,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();

  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalSearches: 0,
    systemHealth: "healthy",
    pendingTasks: 0,
    recentAlerts: 0,
  });

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);

      // Fetch admin stats
      const statsResponse = await api.admin.getAdminStats();
      const statsData = (statsResponse.data as AdminStatsApiResponse | undefined)
        ?.statistics;

      if (statsResponse.success && statsData) {
        const stats = statsData;
        setAdminStats({
          totalUsers: stats.total_users || 0,
          activeUsers: stats.active_users || 0,
          totalSearches: stats.total_searches || 0,
          systemHealth:
            (stats.system_health as "healthy" | "warning" | "critical") ||
            "healthy",
          pendingTasks: stats.pending_tasks || 0,
          recentAlerts: stats.recent_alerts || 0,
        });
      }

      // Fetch current admin user info
      const userResponse = await api.auth.getCurrentUser();
      if (userResponse.success && userResponse.user) {
        setAdminUser(userResponse.user as AdminUser);
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load admin data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navItems = [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: BarChart3,
      description: "Overview and analytics",
      badge: null,
    },
    {
      href: "/admin/user-management",
      label: "User Management",
      icon: Users,
      description: "Manage system users",
      badge:
        adminStats.totalUsers > 0 ? adminStats.totalUsers.toString() : null,
    },
    {
      href: "/admin/system-analytics",
      label: "System Analytics",
      icon: TrendingUp,
      description: "Performance metrics",
      badge: null,
    },
    {
      href: "/admin/audit-logs",
      label: "Audit Logs",
      icon: Terminal,
      description: "System activity logs",
      badge:
        adminStats.recentAlerts > 0 ? adminStats.recentAlerts.toString() : null,
    },
    {
      href: "/admin/payment-methods",
      label: "Payment Management",
      icon: CreditCard,
      description: "Payment settings",
      badge: null,
    },
    {
      href: "/admin/subscribers",
      label: "Subscribers",
      icon: Crown,
      description: "User subscriptions",
      badge: null,
    },
    {
      href: "/admin/onboarding-surveys",
      label: "Onboarding Surveys",
      icon: FileText,
      description: "Acquisition & interests",
      badge: null,
    },
    {
      href: "/admin/system-settings",
      label: "System Settings",
      icon: Settings,
      description: "System configuration",
      badge: null,
    },
    {
      href: "/admin/database-console",
      label: "Database Console",
      icon: Database,
      description: "Database management",
      badge: null,
    },
    {
      href: "/admin/email-smtp",
      label: "Email SMTP",
      icon: Mail,
      description: "Email configuration",
      badge: null,
    },
    {
      href: "/admin/ai-models",
      label: "AI Models",
      icon: BrainCircuit,
      description: "AI model management",
      badge: null,
    },
  ];

  const handleLogout = async () => {
    try {
      console.log("🚪 Admin logout initiated...");

      await logout();

      console.log("✅ Admin logout successful");

      toast({
        title: "Logged out successfully",
        description: "You have been logged out of the admin console.",
      });

      // Navigate to admin login page
      navigate("/admin/login");
    } catch (error) {
      console.error("❌ Admin logout error:", error);

      toast({
        variant: "destructive",
        title: "Logout failed",
        description:
          "There was an error logging out, but you've been signed out locally.",
      });

      // Navigate anyway
      navigate("/admin/login");
    }
  };

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "text-emerald-500 dark:text-green-400";
      case "warning":
        return "text-amber-500 dark:text-yellow-400";
      case "critical":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getSystemHealthIcon = (health: string) => {
    switch (health) {
      case "healthy":
        return CheckCircle;
      case "warning":
        return AlertCircle;
      case "critical":
        return AlertCircle;
      default:
        return Clock;
    }
  };

  // Admin console: all items are available to admins.
  const filteredNavItems = navItems;

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 320 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="hidden lg:flex h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border backdrop-blur-xl flex-col fixed left-0 top-0 z-30 dark:bg-black/95 dark:text-white dark:border-white/10"
    >
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar-accent/40 to-purple-500/20 opacity-70 dark:from-blue-900/30 dark:to-purple-900/20" />
        <div className="relative p-6 border-b border-sidebar-border/80 dark:border-blue-800/30">
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  to="/admin/dashboard"
                  className="flex items-center space-x-3 group"
                >
                  {/* Light theme logo */}
                  <img
                    src="/sparefinderlogo.png"
                    alt="SpareFinder Logo"
                    className="h-14 w-auto object-contain transition-transform group-hover:scale-105 dark:hidden"
                  />
                  {/* Dark theme logo */}
                  <img
                    src="/sparefinderlogodark.png"
                    alt="SpareFinder Logo"
                    className="hidden h-14 w-auto object-contain transition-transform group-hover:scale-105 dark:inline-block"
                  />
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="flex justify-center"
              >
                <Link to="/admin/dashboard" className="group">
                  <img
                    src="/sparefinderlogo.png"
                    alt="SpareFinder Logo"
                    className="h-12 w-auto object-contain transition-transform group-hover:scale-105 dark:hidden"
                  />
                  <img
                    src="/sparefinderlogodark.png"
                    alt="SpareFinder Logo"
                    className="hidden h-12 w-auto object-contain transition-transform group-hover:scale-105 dark:inline-block"
                  />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Button */}
          {onToggle && (
            <motion.button
              onClick={onToggle}
              className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center border bg-sidebar-accent text-sidebar-accent-foreground shadow-sm hover:bg-sidebar-accent/90 transition-colors dark:bg-blue-600 dark:text-white dark:border-gray-900 dark:hover:bg-blue-700"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3 text-white" />
              ) : (
                <ChevronLeft className="w-3 h-3 text-white" />
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* System Status */}
      {!isCollapsed && (
        <div className="p-4 border-b border-sidebar-border/80 dark:border-blue-800/30">
          <div className="space-y-3">
            {isLoading ? (
              <>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex items-center space-x-1">
                    <Skeleton className="w-4 h-4 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg p-2 bg-muted/80 border border-border/60 dark:bg-blue-900/20 dark:border-blue-800/40">
                    <Skeleton className="h-3 w-8 mb-1" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="rounded-lg p-2 bg-muted/80 border border-border/60 dark:bg-blue-900/20 dark:border-blue-800/40">
                    <Skeleton className="h-3 w-8 mb-1" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">System Status</span>
                  <div className="flex items-center space-x-1">
                    {React.createElement(
                      getSystemHealthIcon(adminStats.systemHealth),
                      {
                        className: `w-4 h-4 ${getSystemHealthColor(
                          adminStats.systemHealth
                        )}`,
                      }
                    )}
                    <span
                      className={`text-sm font-medium ${getSystemHealthColor(
                        adminStats.systemHealth
                      )}`}
                    >
                      {adminStats.systemHealth.charAt(0).toUpperCase() +
                        adminStats.systemHealth.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg p-2 bg-muted/80 border border-border/60 dark:bg-blue-900/20 dark:border-blue-800/40">
                    <div className="text-muted-foreground">Users</div>
                    <div className="text-foreground font-semibold dark:text-white">
                      {adminStats.totalUsers.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-lg p-2 bg-muted/80 border border-border/60 dark:bg-blue-900/20 dark:border-blue-800/40">
                    <div className="text-muted-foreground">Active</div>
                    <div className="text-emerald-500 font-semibold dark:text-green-400">
                      {adminStats.activeUsers.toLocaleString()}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredNavItems.map((item, index) => (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
              <Link
                to={item.href}
                className={`flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 group relative ${
                  location.pathname === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border shadow-soft-elevated dark:bg-gradient-to-r dark:from-blue-600/20 dark:to-purple-600/20 dark:border-blue-500/30 dark:text-blue-100"
                    : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 border border-transparent dark:text-gray-300 dark:hover:text-blue-200 dark:hover:bg-blue-800/10"
                }`}
              >
              <div
                className={`p-2 rounded-lg transition-colors ${
                  location.pathname === item.href
                    ? "bg-sidebar-accent/80 text-sidebar-accent-foreground dark:bg-blue-600/20 dark:text-blue-300"
                    : "bg-muted text-muted-foreground group-hover:bg-sidebar-accent/60 group-hover:text-sidebar-accent-foreground dark:bg-gray-800/50 dark:text-gray-400 dark:group-hover:bg-blue-800/20 dark:group-hover:text-blue-400"
                }`}
              >
                <item.icon className="w-5 h-5" />
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center justify-between text-foreground dark:text-white">
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs opacity-70 truncate text-muted-foreground dark:text-gray-400">
                    {item.description}
                  </div>
                </div>
              )}

              {isCollapsed && item.badge && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-sidebar-accent rounded-full flex items-center justify-center text-sidebar-accent-foreground dark:bg-blue-600 dark:text-white">
                  <span className="text-xs">{item.badge}</span>
                </div>
              )}
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Admin User Section */}
      <div className="p-4 border-t border-sidebar-border/80 dark:border-blue-800/30">
        {isLoading ? (
          !isCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-muted/80 border border-border/60 dark:bg-blue-900/30 dark:border-blue-800/40">
                <SkeletonAvatar size="md" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center">
                <SkeletonAvatar size="md" />
              </div>
              <Skeleton className="h-8 w-8 mx-auto rounded-xl" />
            </div>
          )
        ) : !isCollapsed ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 rounded-xl bg-muted/80 border border-border/60 dark:bg-blue-900/30 dark:border-blue-800/40">
              <Avatar className="w-10 h-10">
                <AvatarImage src={adminUser?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  {adminUser?.full_name?.charAt(0) ||
                    adminUser?.email?.charAt(0) ||
                    "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate dark:text-blue-100">
                  {adminUser?.full_name || "Administrator"}
                </div>
                <div className="text-xs text-muted-foreground truncate flex items-center space-x-1 dark:text-blue-400/60">
                  <Crown className="w-3 h-3" />
                  <span>
                    {adminUser?.role === "super_admin"
                      ? "Super Admin"
                      : "Admin"}
                  </span>
                </div>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-12 dark:text-blue-300 dark:hover:text-blue-100 dark:hover:bg-blue-800/20"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span className="font-medium">Logout</span>
              </Button>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              <Avatar className="w-10 h-10">
                <AvatarImage src={adminUser?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  {adminUser?.full_name?.charAt(0) ||
                    adminUser?.email?.charAt(0) ||
                    "A"}
                </AvatarFallback>
              </Avatar>
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex justify-center"
            >
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl p-2 dark:text-blue-300 dark:hover:text-blue-100 dark:hover:bg-blue-800/20"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminDesktopSidebar;
