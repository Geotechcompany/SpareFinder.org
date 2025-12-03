import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  Check,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  Settings,
  Mail,
  Smartphone,
  Clock,
  Filter,
  CheckCheck,
  Sparkles,
  Zap,
  Upload,
  TrendingUp,
  Target,
  Menu,
  Loader2,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import { PageSkeleton } from "@/components/skeletons";
import { notificationsApi } from "@/lib/api";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  action_url?: string;
  created_at: string;
  expires_at?: string;
  metadata?: any;
}

interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byType: Record<string, number>;
}

const Notifications = () => {
  const { inLayout } = useDashboardLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set());

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Fetch notifications and stats
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [notificationsResponse, statsResponse] = await Promise.all([
        notificationsApi.getNotifications({ limit: 50 }),
        notificationsApi.getStats(),
      ]);

      if (notificationsResponse.success && notificationsResponse.data) {
        setNotifications(notificationsResponse.data.notifications || []);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const notificationSettings = [
    {
      key: "email_uploads",
      title: "Upload Notifications",
      description: "Get notified when your uploads are processed",
      icon: Upload,
      color: "from-blue-600 to-cyan-600",
      enabled: true,
    },
    {
      key: "email_reports",
      title: "Weekly Reports",
      description: "Receive weekly analysis reports",
      icon: TrendingUp,
      color: "from-green-600 to-emerald-600",
      enabled: true,
    },
    {
      key: "email_features",
      title: "New Features",
      description: "Be first to know about new features",
      icon: Zap,
      color: "from-purple-600 to-blue-600",
      enabled: false,
    },
    {
      key: "sms_urgent",
      title: "Urgent Alerts",
      description: "Critical notifications via SMS",
      icon: AlertTriangle,
      color: "from-orange-600 to-red-600",
      enabled: false,
    },
  ];

  const filteredNotifications = notifications.filter((notification) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "unread") return !notification.read;
    return notification.type === selectedFilter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      setMarkingAsRead((prev) => new Set([...prev, id]));
      const response = await notificationsApi.markAsRead(id);

      if (response.success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === id
              ? { ...notification, read: true }
              : notification
          )
        );
        toast.success("Notification marked as read");
      } else {
        toast.error("Failed to mark notification as read");
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    } finally {
      setMarkingAsRead((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await notificationsApi.markAllAsRead();

      if (response.success) {
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, read: true }))
        );
        toast.success("All notifications marked as read");
      } else {
        toast.error("Failed to mark all notifications as read");
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await notificationsApi.deleteNotification(id);

      if (response.success) {
        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== id)
        );
        toast.success("Notification deleted");
      } else {
        toast.error("Failed to delete notification");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  // Full-page skeleton while initial notifications + stats load
  if (loading && !notifications.length && !stats) {
    return (
      <PageSkeleton
        variant="dashboard"
        showSidebar={!inLayout}
        showHeader={false}
      />
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return CheckCircle;
      case "warning":
        return AlertTriangle;
      case "info":
        return Info;
      case "error":
        return AlertTriangle;
      default:
        return Bell;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "from-green-600 to-emerald-600";
      case "warning":
        return "from-yellow-600 to-orange-600";
      case "info":
        return "from-blue-600 to-cyan-600";
      case "error":
        return "from-red-600 to-pink-600";
      default:
        return "from-gray-600 to-gray-700";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} minutes ago`;
    } else if (hours < 24) {
      return `${hours} hours ago`;
    } else {
      return `${days} days ago`;
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 relative overflow-hidden">
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

      {/* Sidebar and mobile menu handled by layout when inLayout */}
      {!inLayout && (
        <>
          <DashboardSidebar
            isCollapsed={isCollapsed}
            onToggle={handleToggleSidebar}
          />
          <MobileSidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
          <button
            onClick={handleToggleMobileMenu}
            className="fixed top-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/95 text-muted-foreground shadow-soft-elevated backdrop-blur-xl md:hidden dark:bg-black/20 dark:border-white/10 dark:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={
          inLayout
            ? { marginLeft: 0, width: "100%" }
            : {
                marginLeft: isCollapsed
                  ? "var(--collapsed-sidebar-width, 80px)"
                  : "var(--expanded-sidebar-width, 320px)",
                width: isCollapsed
                  ? "calc(100% - var(--collapsed-sidebar-width, 80px))"
                  : "calc(100% - var(--expanded-sidebar-width, 320px))",
              }
        }
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-6xl mx-auto"
        >

          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3A5AFE0A] via-[#8B5CF60A] to-transparent blur-xl opacity-80 dark:from-purple-600/10 dark:to-blue-600/10" />
            <div className="relative rounded-3xl border border-border bg-card shadow-soft-elevated backdrop-blur-xl p-4 sm:p-6 dark:bg-black/20 dark:border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full border border-purple-500/30 backdrop-blur-xl mb-4"
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
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </motion.div>
                    <span className="text-purple-300 text-sm font-semibold">
                      Notifications Center
                    </span>
                  </motion.div>
                  <div className="flex items-center space-x-3 mb-3">
                    <motion.h1
                      className="text-3xl lg:text-4xl font-bold text-foreground dark:bg-gradient-to-r dark:from-white dark:via-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Notifications
                    </motion.h1>
                  {unreadCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-orange-500 shadow-sm shadow-red-500/40"
                    >
                      <span className="text-sm font-bold text-white">
                        {unreadCount}
                      </span>
                    </motion.div>
                  )}
                  </div>
                  <motion.p
                    className="text-lg text-muted-foreground dark:text-gray-400"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Stay updated with your part identification activities
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  {unreadCount > 0 && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        onClick={markAllAsRead}
                        variant="outline"
                        className="h-12 w-full px-6 text-sm sm:w-auto border-border text-muted-foreground hover:bg-muted hover:text-foreground dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white dark:hover:border-white/30"
                      >
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Mark All Read
                      </Button>
                    </motion.div>
                  )}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 h-12 px-6">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Filter Tabs - Make scrollable on mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#6366F11A] via-[#8B5CF61A] to-transparent blur-xl opacity-80 dark:from-indigo-600/10 dark:to-purple-600/10" />
            <div className="relative overflow-x-auto rounded-3xl border border-border bg-card/95 p-2 backdrop-blur-xl shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
              <div className="flex flex-nowrap gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
                {[
                  { id: "all", label: "All", count: notifications.length },
                  { id: "unread", label: "Unread", count: unreadCount },
                  {
                    id: "success",
                    label: "Success",
                    count: stats?.byType?.success || 0,
                  },
                  {
                    id: "warning",
                    label: "Warnings",
                    count: stats?.byType?.warning || 0,
                  },
                  {
                    id: "info",
                    label: "Info",
                    count: stats?.byType?.info || 0,
                  },
                  {
                    id: "error",
                    label: "Errors",
                    count: stats?.byType?.error || 0,
                  },
                ].map((filter, index) => (
                  <motion.button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter.id)}
                    className={`relative flex items-center space-x-2 rounded-2xl px-4 py-3 text-sm transition-all duration-300 ${
                      selectedFilter === filter.id
                        ? "text-foreground dark:text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    {selectedFilter === filter.id && (
                      <motion.div
                        layoutId="activeFilterTab"
                        className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-blue-600/20 rounded-2xl border border-purple-500/30 backdrop-blur-xl"
                        initial={false}
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                    <div className="relative z-10 flex items-center space-x-2">
                      <span className="font-medium">{filter.label}</span>
                      <Badge
                        variant="secondary"
                        className="border border-border bg-muted/60 text-xs text-muted-foreground dark:bg-white/10 dark:text-gray-300 dark:border-white/20"
                      >
                        {filter.count}
                      </Badge>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Main Grid - Update for better mobile layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Notifications List */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="order-2 relative lg:order-1 lg:col-span-2"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3A5AFE0A] via-[#8B5CF60A] to-transparent blur-xl opacity-80 dark:from-purple-600/5 dark:to-blue-600/5" />
              <Card className="relative border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-foreground dark:text-white">
                    <span className="flex items-center space-x-2">
                      <Bell className="w-5 h-5 text-[#8B5CF6]" />
                      <span>
                        Recent Notifications ({filteredNotifications.length})
                      </span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                      <AnimatePresence>
                        {filteredNotifications.map((notification, index) => {
                          const Icon = getTypeIcon(notification.type);
                          const isBeingMarked = markingAsRead.has(
                            notification.id
                          );

                          return (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ scale: 1.02, y: -2 }}
                            className={`relative group cursor-pointer rounded-xl border p-4 transition-all duration-300 ${
                              notification.read
                                ? "bg-muted/60 border-border/70 opacity-80 dark:bg-white/5 dark:border-white/10"
                                : "bg-card border-border hover:bg-muted/60 dark:bg-white/10 dark:border-white/20 dark:hover:bg-white/15"
                            }`}
                              onClick={() =>
                                !notification.read &&
                                markAsRead(notification.id)
                              }
                            >
                              <div className="flex items-start space-x-4">
                                <div
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${getTypeColor(
                                    notification.type
                                  )} flex-shrink-0`}
                                >
                                  <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-white font-medium truncate">
                                      {notification.title}
                                    </h4>
                                    <div className="flex items-center space-x-2">
                                      {!notification.read && (
                                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                      )}
                                      {isBeingMarked && (
                                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                      )}
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-white/10 transition-all"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteNotification(notification.id);
                                        }}
                                      >
                                        <X className="w-4 h-4 text-gray-400" />
                                      </motion.button>
                                    </div>
                                  </div>
                                  <p className="text-gray-400 text-sm mb-2">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500 text-xs">
                                      {formatTimestamp(notification.created_at)}
                                    </span>
                                    {notification.read && (
                                      <span className="text-green-400 text-xs flex items-center">
                                        <Check className="w-3 h-3 mr-1" />
                                        Read
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {!loading && filteredNotifications.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-12"
                        >
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          >
                            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          </motion.div>
                          <p className="text-gray-300 text-lg mb-2">
                            No notifications found
                          </p>
                          <p className="text-gray-400">
                            Try adjusting your filter or check back later
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Notification Settings */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="relative order-1 lg:order-2"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#0EA5E91A] via-[#22C55E1A] to-transparent blur-xl opacity-80 dark:from-blue-600/10 dark:to-green-600/10" />
              <Card className="relative rounded-3xl border border-border bg-card text-foreground shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                    <Settings className="w-5 h-5 text-[#0EA5E9]" />
                    <span>Preferences</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground dark:text-gray-400">
                    Manage your notification settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {notificationSettings.map((setting, index) => (
                    <motion.div
                      key={setting.key}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/60 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r ${setting.color} shadow-sm shadow-black/10`}
                          >
                            <setting.icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground dark:text-white">
                              {setting.title}
                            </h4>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">
                              {setting.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={setting.enabled}
                          onCheckedChange={() => {}}
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>
                    </motion.div>
                  ))}

                  <div className="pt-4 border-t border-border dark:border-white/10">
                    <h4 className="mb-4 font-medium text-foreground dark:text-white">
                      Delivery Methods
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 dark:bg-white/5 dark:border-white/10">
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-[#3B82F6]" />
                          <span className="text-foreground dark:text-white">
                            Email
                          </span>
                        </div>
                        <Switch
                          checked={true}
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 dark:bg-white/5 dark:border-white/10">
                        <div className="flex items-center space-x-3">
                          <Smartphone className="h-5 w-5 text-emerald-500 dark:text-green-400" />
                          <span className="text-foreground dark:text-white">
                            SMS
                          </span>
                        </div>
                        <Switch
                          checked={false}
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>
                    </div>
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

export default Notifications;
