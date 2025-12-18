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

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard', description: 'Overview & analytics' },
    { href: '/dashboard/upload', icon: Upload, label: 'Upload', description: 'Identify parts' },
    { href: '/dashboard/history', icon: History, label: 'History', description: 'Past uploads' },
    { href: '/dashboard/reviews', icon: Star, label: 'Reviews', description: 'Your feedback' },
    { href: '/dashboard/profile', icon: User, label: 'Profile', description: 'Your account' },
    { href: '/dashboard/notifications', icon: Bell, label: 'Notifications', description: 'Updates & alerts' },
    { href: '/dashboard/billing', icon: CreditCard, label: 'Billing', description: 'Subscription' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings', description: 'Preferences' }
  ];

  // Hide feature usage until a plan is active. Keep Billing/Profile/Settings visible.
  const visibleNavItems = (!subscriptionLoading && !isPlanActive)
    ? navItems.filter((i) =>
        ["/dashboard", "/dashboard/billing", "/dashboard/profile", "/dashboard/settings"].includes(i.href)
      )
    : navItems;



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
        <div className="flex-1 p-4 space-y-2">
          {visibleNavItems.map((item, index) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={item.href}
                onClick={toggleMobileMenu}
                className={`relative flex items-center space-x-3 p-4 rounded-xl transition-all duration-300 group ${
                  isActiveRoute(item.href)
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border/80'
                    : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs opacity-75">{item.description}</div>
                </div>
              </Link>
            </motion.div>
          ))}


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
        <div className="flex-1 p-4 space-y-2">
          {visibleNavItems.map((item, index) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: isCollapsed ? 0 : 5 }}
            >
              <Link
                to={item.href}
                className={`relative flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${
                  isActiveRoute(item.href)
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border/80'
                    : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
                }`}
              >
                {isActiveRoute(item.href) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-xl border border-purple-500/20"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative z-10 flex items-center space-x-3 w-full">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1"
                      >
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs opacity-75">{item.description}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            </motion.div>
          ))}


        </div>

        {/* Desktop User Section */}
        {renderUserSection()}
      </motion.div>
    </>
  );
};

export default DashboardSidebar;
