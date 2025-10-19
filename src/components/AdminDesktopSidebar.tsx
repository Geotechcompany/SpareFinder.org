import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
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

const AdminDesktopSidebar: React.FC<AdminSidebarProps> = ({
  isCollapsed = false,
  onToggle,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

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
      if (statsResponse.success && statsResponse.data?.statistics) {
        const stats = statsResponse.data.statistics;
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
      if (userResponse.success && userResponse.data?.user) {
        setAdminUser(userResponse.data.user);
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
      href: "/admin/system-settings",
      label: "System Settings",
      icon: Settings,
      description: "System configuration",
      badge: null,
      superAdminOnly: true,
    },
    {
      href: "/admin/database-console",
      label: "Database Console",
      icon: Database,
      description: "Database management",
      badge: null,
      superAdminOnly: true,
    },
    {
      href: "/admin/email-smtp",
      label: "Email SMTP",
      icon: Mail,
      description: "Email configuration",
      badge: null,
      superAdminOnly: true,
    },
    {
      href: "/admin/ai-models",
      label: "AI Models",
      icon: BrainCircuit,
      description: "AI model management",
      badge: null,
      superAdminOnly: true,
    },
  ];

  const handleLogout = async () => {
    try {
      console.log("🚪 Admin logout initiated...");

      // Use the proper logout function
      await api.auth.logout();

      // Clear any admin-specific storage
      localStorage.removeItem("admin_session");

      console.log("✅ Admin logout successful");

      toast({
        title: "Logged out successfully",
        description: "You have been logged out of the admin console.",
      });

      // Navigate to admin login page
      navigate("/admin/login");
    } catch (error) {
      console.error("❌ Admin logout error:", error);

      // Force logout even if API call fails
      localStorage.removeItem("admin_session");

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
        return "text-green-400";
      case "warning":
        return "text-yellow-400";
      case "critical":
        return "text-red-400";
      default:
        return "text-gray-400";
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

  // Remove the filter so all nav items are visible
  // const filteredNavItems = navItems.filter(item =>
  //   !item.superAdminOnly || adminUser?.role === 'super_admin'
  // );

  // Use navItems directly

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 320 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="hidden lg:flex h-screen bg-gray-900/95 backdrop-blur-xl border-r border-blue-800/50 flex-col fixed left-0 top-0 z-30"
    >
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-purple-900/20 opacity-60" />
        <div className="relative p-6 border-b border-blue-800/30">
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
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-lg"
                    />
                    <div className="relative w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                      Admin Console
                    </h2>
                    <p className="text-blue-400/60 text-xs">
                      System Administration
                    </p>
                  </div>
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
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-lg"
                    />
                    <div className="relative w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Button */}
          {onToggle && (
            <motion.button
              onClick={onToggle}
              className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-gray-900 hover:bg-blue-700 transition-colors"
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
        <div className="p-4 border-b border-blue-800/30">
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
                  <div className="bg-blue-900/20 rounded-lg p-2">
                    <Skeleton className="h-3 w-8 mb-1" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="bg-blue-900/20 rounded-lg p-2">
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
                  <div className="bg-blue-900/20 rounded-lg p-2">
                    <div className="text-gray-400">Users</div>
                    <div className="text-white font-semibold">
                      {adminStats.totalUsers.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-blue-900/20 rounded-lg p-2">
                    <div className="text-gray-400">Active</div>
                    <div className="text-green-400 font-semibold">
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
        {navItems.map((item, index) => (
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
                  ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-blue-100"
                  : "hover:bg-blue-800/10 text-gray-300 hover:text-blue-200"
              }`}
            >
              <div
                className={`p-2 rounded-lg transition-colors ${
                  location.pathname === item.href
                    ? "bg-blue-600/20 text-blue-300"
                    : "bg-gray-800/50 text-gray-400 group-hover:bg-blue-800/20 group-hover:text-blue-400"
                }`}
              >
                <item.icon className="w-5 h-5" />
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center justify-between">
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
                  <div className="text-xs opacity-60 truncate">
                    {item.description}
                  </div>
                </div>
              )}

              {isCollapsed && item.badge && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">{item.badge}</span>
                </div>
              )}
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Admin User Section */}
      <div className="p-4 border-t border-blue-800/30">
        {isLoading ? (
          !isCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-blue-900/30">
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
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-blue-900/30">
              <Avatar className="w-10 h-10">
                <AvatarImage src={adminUser?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  {adminUser?.full_name?.charAt(0) ||
                    adminUser?.email?.charAt(0) ||
                    "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-blue-100 truncate">
                  {adminUser?.full_name || "Administrator"}
                </div>
                <div className="text-xs text-blue-400/60 truncate flex items-center space-x-1">
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
                className="w-full justify-start text-blue-300 hover:text-blue-100 hover:bg-blue-800/20 rounded-xl h-12"
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
                className="text-blue-300 hover:text-blue-100 hover:bg-blue-800/20 rounded-xl p-2"
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
