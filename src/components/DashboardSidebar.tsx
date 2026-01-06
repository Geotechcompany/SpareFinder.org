import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Upload, 
  History, 
  CreditCard, 
  Settings, 
  LogOut,
  Zap,
  Users,
  BarChart3,
  X,
  Menu,
  User,
  ChevronLeft,
  ChevronRight,
  Bell,
  UserCircle,
  Shield,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  requiresPlan?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const DashboardSidebar: React.FC<SidebarProps> = ({ isCollapsed = false, onToggle }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { isPlanActive, isLoading: subscriptionLoading, tier, status } = useSubscription();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Close mobile menu on window resize if screen becomes larger
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
    if (onToggle) onToggle();
  };

  const handleSignOut = async () => {
    try {
      console.log('🚪 User logout initiated...');
      await logout();
      console.log('✅ User logout successful');
      navigate('/login');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      // Force navigation even if logout fails
      navigate('/login');
    }
  };

  const navGroups: NavGroup[] = [
    {
      title: "Workspace",
      items: [
        { href: "/dashboard", icon: Home, label: "Dashboard", description: "Overview & analytics" },
      ],
    },
    {
      title: "Analysis",
      items: [
        { href: "/dashboard/upload", icon: Upload, label: "Upload", description: "Identify parts", requiresPlan: true },
        { href: "/dashboard/history", icon: History, label: "History", description: "Past uploads", requiresPlan: true },
      ],
    },
    {
      title: "Engagement",
      items: [
        { href: "/dashboard/reviews", icon: Star, label: "Reviews", description: "Your feedback", requiresPlan: true },
        { href: "/dashboard/notifications", icon: Bell, label: "Notifications", description: "Updates & alerts", requiresPlan: true },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/dashboard/profile", icon: User, label: "Profile", description: "Your account" },
        { href: "/dashboard/billing", icon: CreditCard, label: "Billing", description: "Subscription" },
        { href: "/dashboard/settings", icon: Settings, label: "Settings", description: "Preferences" },
      ],
    },
  ];

  const visibleNavGroups: NavGroup[] = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
  // Hide feature usage until a plan is active. Keep Billing/Profile/Settings visible.
        if (!subscriptionLoading && !isPlanActive && i.requiresPlan) return false;
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);



  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const nameParts = [user.full_name, user.email].filter(Boolean)[0]?.split(' ') || [];
    if (nameParts.length === 0) return 'U';
    if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };

  const planLabel = (() => {
    if (subscriptionLoading) return "Checking plan…";
    if (isAdmin) return "Admin access";
    if (!isPlanActive) return "No active plan";
    const tierLabel =
      tier === "free"
        ? "Starter"
        : tier === "pro"
        ? "Professional"
        : tier === "enterprise"
        ? "Enterprise"
        : "Plan active";
    return status === "trialing" ? `${tierLabel} (trial)` : tierLabel;
  })();

  const planCtaLabel = (() => {
    if (subscriptionLoading) return "Checking plan…";
    if (isAdmin) return null;
    if (!isPlanActive) return "Choose plan";
    if (tier === "enterprise") return "Manage plan";
    return "Upgrade plan";
  })();

  const handlePlanCta = () => {
    // If plan isn't active, take them to the plan selector. Otherwise Billing is fine.
    navigate(!subscriptionLoading && !isPlanActive ? "/onboarding/trial" : "/dashboard/billing");
  };

  const renderUserSection = (isMobile = false) => (
    <div className={`p-4 border-t border-sidebar-border/80 dark:border-white/10 ${isMobile ? '' : ''}`}>
      <div className="relative overflow-hidden flex items-center space-x-3 p-3 rounded-2xl bg-sidebar-accent/40 border border-sidebar-border dark:bg-white/5 dark:border-white/10">
        <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-r from-purple-500/25 to-blue-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/10 blur-2xl" />
        <Avatar className="w-10 h-10">
          <AvatarImage src={user?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        {!isCollapsed && (
          <div className="flex-1">
            <p className="font-medium text-sidebar-foreground dark:text-white">
              {user?.full_name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-muted-foreground dark:text-gray-400">
              {(user as any)?.company || " "}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-black/10 px-2 py-0.5 text-xs text-muted-foreground dark:bg-white/5 dark:text-gray-300">
                {planLabel}
              </span>
              {!subscriptionLoading && !isPlanActive && !isAdmin ? (
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-300">
                  Locked
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
      {!isCollapsed && (
        <div className="mt-3 grid grid-cols-1 gap-2">
          {planCtaLabel ? (
          <Button
            type="button"
              onClick={handlePlanCta}
              disabled={subscriptionLoading}
            className="w-full justify-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20"
          >
              {planCtaLabel}
          </Button>
          ) : null}
          <Button 
            variant="ghost" 
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-600/10 justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button - Removed as it's now handled in Dashboard.tsx */}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            onClick={toggleMobileMenu}
            className="md:hidden fixed inset-0 z-40 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: isMobileOpen ? 0 : -320 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="fixed md:hidden z-50 h-full w-[280px] bg-sidebar text-sidebar-foreground border-r border-sidebar-border backdrop-blur-xl dark:bg-black/95 dark:border-white/10"
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border/80 dark:border-white/10">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-r from-[#3A5AFE] to-[#4C5DFF] text-white"
            >
              <Zap className="w-5 h-5" />
            </motion.div>
            <div>
              <h2 className="font-bold text-base text-foreground dark:text-white">
                SpareFinder
              </h2>
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Mobile Dashboard
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-5">
            {visibleNavGroups.map((group, groupIdx) => (
              <div key={group.title} className="space-y-2">
                <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-gray-400/80">
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.items.map((item, index) => {
                    const active = isActiveRoute(item.href);
                    return (
            <motion.div
              key={item.href}
                        initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: groupIdx * 0.04 + index * 0.03 }}
            >
              <Link
                to={item.href}
                onClick={toggleMobileMenu}
                          className={`relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-200 border ${
                            active
                              ? "bg-sidebar-accent/80 text-sidebar-accent-foreground border-sidebar-border shadow-soft-elevated dark:bg-gradient-to-r dark:from-purple-600/15 dark:to-blue-600/15 dark:border-purple-500/25"
                              : "border-transparent text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5"
                }`}
              >
                          {active ? (
                            <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-purple-500 to-blue-500" />
                          ) : null}
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 transition-colors ${
                              active
                                ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-blue-300 ring-blue-500/25"
                                : "bg-muted text-muted-foreground ring-border/60 dark:bg-gray-800/50 dark:text-gray-400 dark:ring-white/10"
                            }`}
                          >
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate text-sm font-semibold">
                                {item.label}
                              </div>
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground dark:text-gray-400">
                              {item.description}
                            </div>
                </div>
              </Link>
            </motion.div>
                    );
                  })}
                </div>
              </div>
          ))}
          </div>
        </div>

        {/* Mobile User Section */}
        {renderUserSection(true)}
      </motion.div>

      {/* Desktop Sidebar */}
      <motion.div
        initial={false}
        animate={{ 
          width: isCollapsed ? 'var(--collapsed-sidebar-width, 80px)' : 'var(--expanded-sidebar-width, 320px)',
          x: 0 
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden md:flex h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border backdrop-blur-xl flex-col fixed left-0 top-0 z-30 dark:bg-black/95 dark:text-white dark:border-white/10"
      >
        {/* Desktop Header */}
        <div className="flex items-center justify-between p-6 border-b border-sidebar-border/80 dark:border-white/10">
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center space-x-3"
              >
                <div className="flex items-center">
                  {/* Light theme logo */}
                  <img
                    src="/sparefinderlogo.png"
                    alt="SpareFinder Logo"
                    className="h-14 w-auto object-contain dark:hidden"
                  />
                  {/* Dark theme logo */}
                  <img
                    src="/sparefinderlogodark.png"
                    alt="SpareFinder Logo"
                    className="hidden h-14 w-auto object-contain dark:inline-block"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="mx-auto"
              >
                <img 
                  src="/sparefinderlogodark.png" 
                  alt="SpareFinder Icon" 
                  className="h-11 w-auto object-contain"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {!isCollapsed && (
            <motion.button
              onClick={onToggle}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Collapse Toggle Button (when collapsed) */}
        {isCollapsed && (
          <div className="px-4 py-2">
            <motion.button
              onClick={onToggle}
              className="w-full p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        )}

        {/* Desktop Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-5">
            {visibleNavGroups.map((group, groupIdx) => (
              <div key={group.title} className="space-y-2">
                {!isCollapsed ? (
                  <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-gray-400/80">
                    {group.title}
                  </div>
                ) : groupIdx > 0 ? (
                  <div className="my-3 h-px w-full bg-border/60 dark:bg-white/10" />
                ) : null}

                <div className="space-y-1">
                  {group.items.map((item, index) => {
                    const active = isActiveRoute(item.href);
                    const linkEl = (
              <Link
                to={item.href}
                        title={isCollapsed ? item.label : undefined}
                        className={`relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 group border ${
                          active
                            ? "bg-sidebar-accent/80 text-sidebar-accent-foreground border-sidebar-border shadow-soft-elevated dark:bg-gradient-to-r dark:from-purple-600/15 dark:to-blue-600/15 dark:border-purple-500/25"
                            : "border-transparent text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5"
                }`}
              >
                        {active ? (
                          <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-purple-500 to-blue-500" />
                        ) : null}

                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 transition-colors ${
                            active
                              ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-blue-300 ring-blue-500/25"
                              : "bg-muted text-muted-foreground ring-border/60 group-hover:bg-sidebar-accent/50 group-hover:text-sidebar-accent-foreground dark:bg-gray-800/50 dark:text-gray-400 dark:ring-white/10 dark:group-hover:bg-white/10 dark:group-hover:text-white"
                          }`}
                        >
                          <item.icon className="h-5 w-5" />
                        </div>

                        {!isCollapsed ? (
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">
                              {item.label}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground dark:text-gray-400">
                              {item.description}
                            </div>
                          </div>
                        ) : (
                          <span className="sr-only">{item.label}</span>
                        )}
                      </Link>
                    );

                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: groupIdx * 0.05 + index * 0.03 }}
                        whileHover={{ x: isCollapsed ? 0 : 3 }}
                      >
                        {linkEl}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
          ))}
          </div>
        </div>

        {/* Desktop User Section */}
        {renderUserSection()}
      </motion.div>
    </>
  );
};

export default DashboardSidebar;
