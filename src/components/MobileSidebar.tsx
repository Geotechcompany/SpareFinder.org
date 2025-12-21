import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from "@/contexts/SubscriptionContext";
import { 
  Home, 
  Upload, 
  History, 
  Settings, 
  LogOut,
  X,
  User,
  Bell,
  CreditCard,
  Star
} from 'lucide-react';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
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

const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { isPlanActive, isLoading: subscriptionLoading, tier, status } = useSubscription();

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

  const handleSignOut = async () => {
    try {
      console.log('🚪 Mobile logout initiated...');
      await logout();
      console.log('✅ Mobile logout successful');
      onClose();
    } catch (error) {
      console.error('❌ Mobile sign out failed:', error);
      // Close the sidebar even if logout fails
      onClose();
    }
  };

  // Get user display info
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';
  
  const tierDisplay = (() => {
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

  const handleUpgrade = () => {
    onClose();
    navigate(!subscriptionLoading && !isPlanActive ? "/onboarding/trial" : "/dashboard/billing");
  };

  const planCtaLabel = (() => {
    if (subscriptionLoading) return "Checking plan…";
    if (isAdmin) return null;
    if (!isPlanActive) return "Choose plan";
    if (tier === "enterprise") return "Manage plan";
    return "Upgrade plan";
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-sidebar text-sidebar-foreground border-r border-sidebar-border backdrop-blur-xl z-50 md:hidden dark:bg-black/95 dark:text-white dark:border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border/80 dark:border-white/10">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatar_url} alt={displayName} />
                  <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm text-sidebar-foreground dark:text-white">
                    {displayName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground dark:text-gray-400">
                    {(user as any)?.company || " "}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/10 px-2 py-0.5 text-[11px] text-muted-foreground dark:bg-white/5 dark:text-gray-300">
                      {tierDisplay}
                    </span>
                    {!subscriptionLoading && !isPlanActive && !isAdmin ? (
                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-600 dark:text-amber-300">
                        Locked
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Upgrade CTA */}
            <div className="px-4 pt-4">
              {planCtaLabel ? (
              <Button
                type="button"
                onClick={handleUpgrade}
                  disabled={subscriptionLoading}
                className="h-11 w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20"
              >
                  {planCtaLabel}
              </Button>
              ) : null}
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-5">
                {visibleNavGroups.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-gray-400/80">
                      {group.title}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const active = isActiveRoute(item.href);
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={onClose}
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
                              <div className="truncate text-sm font-semibold">
                                {item.label}
                              </div>
                              <div className="truncate text-[11px] text-muted-foreground dark:text-gray-400">
                                {item.description}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border/80 dark:border-white/10">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileSidebar; 
