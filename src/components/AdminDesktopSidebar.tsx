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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NotificationBellDropdown } from "@/components/NotificationBellDropdown";
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
  Search,
  FileText,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Tag,
  Ticket,
  Megaphone,
  Menu,
  BellRing,
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
  const [navQuery, setNavQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

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

  const navItems: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    badge: string | null;
    section: "Core" | "Billing" | "System";
  }> = [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: BarChart3,
      description: "Summary and charts",
      badge: null,
      section: "Core",
    },
    {
      href: "/admin/user-management",
      label: "Users",
      icon: Users,
      description: "Accounts and roles",
      badge:
        adminStats.totalUsers > 0 ? adminStats.totalUsers.toString() : null,
      section: "Core",
    },
    {
      href: "/admin/tickets",
      label: "Support tickets",
      icon: Ticket,
      description: "Help requests from customers",
      badge: null,
      section: "Core",
    },
    {
      href: "/admin/system-analytics",
      label: "Usage & trends",
      icon: TrendingUp,
      description: "Traffic and product usage",
      badge: null,
      section: "Core",
    },
    {
      href: "/admin/audit-logs",
      label: "Activity log",
      icon: Terminal,
      description: "Who changed what and when",
      badge:
        adminStats.recentAlerts > 0 ? adminStats.recentAlerts.toString() : null,
      section: "Core",
    },
    {
      href: "/admin/payment-methods",
      label: "Payments",
      icon: CreditCard,
      description: "Cards, payouts, and billing",
      badge: null,
      section: "Billing",
    },
    {
      href: "/admin/plans",
      label: "Pricing plans",
      icon: Tag,
      description: "Change prices and features",
      badge: null,
      section: "Billing",
    },
    {
      href: "/admin/subscribers",
      label: "Subscribers",
      icon: Crown,
      description: "Who is on which plan",
      badge: null,
      section: "Billing",
    },
    {
      href: "/admin/onboarding-surveys",
      label: "Welcome survey",
      icon: FileText,
      description: "Answers from new sign-ups",
      badge: null,
      section: "Core",
    },
    {
      href: "/admin/marketing-outbound",
      label: "Email campaigns",
      icon: Megaphone,
      description: "Cold email, contacts, and logs",
      badge: null,
      section: "Core",
    },
    {
      href: "/admin/announcements",
      label: "In-app announcements",
      icon: BellRing,
      description: "Notify users in the dashboard",
      badge: null,
      section: "Core",
    },
    {
      href: "/admin/system-settings",
      label: "Site settings",
      icon: Settings,
      description: "Branding, limits, and toggles",
      badge: null,
      section: "System",
    },
    {
      href: "/admin/database-console",
      label: "Database tools",
      icon: Database,
      description: "Run safe admin queries",
      badge: null,
      section: "System",
    },
    {
      href: "/admin/email-smtp",
      label: "Outgoing email",
      icon: Mail,
      description: "How the app sends mail",
      badge: null,
      section: "System",
    },
    {
      href: "/admin/ai-models",
      label: "AI settings",
      icon: BrainCircuit,
      description: "Models used across the product",
      badge: null,
      section: "System",
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
  const filteredNavItems = navItems.filter((i) => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    );
  });

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  const navSections: Array<{ title: string; items: typeof filteredNavItems }> = [
    { title: "Main", items: filteredNavItems.filter((i) => i.section === "Core") },
    {
      title: "Billing",
      items: filteredNavItems.filter((i) => i.section === "Billing"),
    },
    { title: "Advanced tools", items: filteredNavItems.filter((i) => i.section === "System") },
  ].filter((s) => s.items.length > 0);

  return (
    <>
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <header className="fixed left-0 right-0 top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/85 lg:hidden">
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 border-border bg-card"
              aria-label="Open admin navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <Link
            to="/admin/dashboard"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 pr-2"
            onClick={() => setMobileNavOpen(false)}
          >
            <img
              src="/sparefinderlogo.png"
              alt=""
              className="h-8 w-auto object-contain dark:hidden"
            />
            <img
              src="/sparefinderlogodark.png"
              alt=""
              className="hidden h-8 w-auto object-contain dark:inline-block"
            />
            <span className="truncate text-sm font-semibold text-foreground">Admin</span>
          </Link>
          <div className="ml-auto shrink-0">
            <NotificationBellDropdown
              heading="Your alerts"
              viewAllLabel="Open page"
              triggerButtonClassName="h-9 w-9 rounded-xl border border-border/60 bg-card/90 text-muted-foreground hover:bg-muted/80 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
            />
          </div>
        </header>

        <SheetContent
          side="left"
          className="flex w-[min(100vw-1rem,22rem)] max-w-[22rem] flex-col gap-0 overflow-hidden border-border bg-background p-0 dark:border-white/10"
        >
          <SheetHeader className="space-y-0 border-b border-border px-4 py-3 text-left dark:border-white/10">
            <SheetTitle className="text-base">Admin menu</SheetTitle>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2">
              <div className="mb-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={navQuery}
                    onChange={(e) => setNavQuery(e.target.value)}
                    placeholder="Search admin…"
                    className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {navSections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {section.title}
                    </div>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setMobileNavOpen(false)}
                            className={cn(
                              "relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                              active
                                ? "border-brand/30 bg-brand/10 text-foreground shadow-sm dark:border-brand/35 dark:bg-gradient-to-r dark:from-brand/20 dark:to-brand-dark/15 dark:text-zinc-50 admin-nav-link-active"
                                : "border-transparent bg-muted/40 hover:bg-muted/70 dark:bg-white/[0.05] dark:hover:bg-white/[0.09]"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/60 dark:ring-white/10",
                                active
                                  ? "bg-gradient-to-br from-brand/35 to-cyan-500/15 text-primary shadow-[0_0_14px_-3px_rgba(143,57,187,0.4)]"
                                  : "bg-background text-muted-foreground"
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-semibold">{item.label}</span>
                                {item.badge ? (
                                  <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                    {item.badge}
                                  </span>
                                ) : null}
                              </div>
                              <p className="truncate text-[11px] text-muted-foreground">{item.description}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 border-t border-border p-4 dark:border-white/10">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 dark:border-white/10">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={adminUser?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-r from-brand-dark to-brand text-white">
                        {adminUser?.full_name?.charAt(0) ||
                          adminUser?.email?.charAt(0) ||
                          "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {adminUser?.full_name || "Administrator"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{adminUser?.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start rounded-xl"
                    onClick={() => {
                      setMobileNavOpen(false);
                      void handleLogout();
                    }}
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <motion.div
        initial={false}
        animate={{ width: isCollapsed ? 80 : 320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="admin-sidebar-neo hidden h-screen flex-col fixed left-0 top-0 z-30 border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-xl dark:text-white lg:flex"
      >
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-light/50 via-fuchsia-100/30 to-cyan-200/40 opacity-80 dark:from-blue-900/30 dark:via-brand-dark/15 dark:to-brand-dark/20 dark:opacity-70" />
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

          <div
            className={cn(
              "mt-3 flex",
              isCollapsed ? "justify-center" : "justify-end"
            )}
          >
            <NotificationBellDropdown
              heading="Your alerts"
              viewAllLabel="Full page"
              triggerButtonClassName={cn(
                "h-9 w-9 rounded-xl text-sidebar-foreground hover:bg-white/10 dark:hover:bg-blue-900/40",
                "border border-transparent hover:border-sidebar-border/60"
              )}
            />
          </div>

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
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {!isCollapsed ? (
          <div className="mb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="Search admin…"
                className="w-full rounded-xl border border-border bg-background/70 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          {navSections.map((section, sectionIdx) => (
            <div key={section.title} className="space-y-2">
              {!isCollapsed ? (
                <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {section.title}
                </div>
              ) : sectionIdx > 0 ? (
                <Separator className="my-2 bg-border/60 dark:bg-white/10" />
              ) : null}

              <div className="space-y-1">
                {section.items.map((item, index) => {
                  const active = isActive(item.href);

                  const linkEl = (
                    <Link
                      to={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200",
                        active
                          ? "border-brand-light/70 bg-gradient-to-r from-brand/12 via-white/90 to-cyan-500/12 text-sidebar-accent-foreground shadow-sm dark:border-brand/35 dark:from-brand/25 dark:via-brand-dark/15 dark:to-cyan-600/20 dark:text-blue-50 admin-nav-link-active"
                          : "border-transparent text-sidebar-foreground/80 hover:bg-brand/[0.08] hover:text-sidebar-foreground dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100"
                      )}
                    >
                      {/* Active indicator */}
                      {active ? (
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand to-blue-500" />
                      ) : null}

                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl ring-1 transition-colors",
                          active
                            ? "bg-gradient-to-br from-brand/35 to-cyan-500/20 text-brand-dark ring-brand-light/40 shadow-[0_0_14px_-3px_rgba(143,57,187,0.25)] dark:text-cyan-50 dark:shadow-[0_0_18px_-4px_rgba(143,57,187,0.45)]"
                            : "bg-muted text-muted-foreground ring-border/60 group-hover:bg-brand/[0.12] group-hover:text-brand-dark group-hover:ring-brand-light/50 dark:bg-white/[0.06] dark:text-zinc-400 dark:ring-white/10 dark:group-hover:bg-white/[0.1] dark:group-hover:text-brand-light"
                        )}
                      >
                        <item.icon className="h-4.5 w-4.5" />
                      </div>

                      {!isCollapsed ? (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-sm font-semibold text-foreground dark:text-white">
                              {item.label}
                            </div>
                            {item.badge ? (
                              <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-300">
                                {item.badge}
                              </span>
                            ) : null}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground dark:text-gray-400">
                            {item.description}
                          </div>
                        </div>
                      ) : (
                        <span className="sr-only">{item.label}</span>
                      )}

                      {isCollapsed && item.badge ? (
                        <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-dark px-1 text-[10px] font-semibold text-white shadow">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );

                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (sectionIdx * 0.05) + index * 0.03 }}
                    >
                      {isCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            <div className="font-semibold">{item.label}</div>
                            <div className="opacity-80">{item.description}</div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        linkEl
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
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
                <AvatarFallback className="bg-gradient-to-r from-brand-dark to-brand text-white">
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
                <AvatarFallback className="bg-gradient-to-r from-brand-dark to-brand text-white">
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
    </>
  );
};

export default AdminDesktopSidebar;
