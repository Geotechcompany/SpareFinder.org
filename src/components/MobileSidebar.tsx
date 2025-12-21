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
  UserCircle
} from 'lucide-react';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { isPlanActive, isLoading: subscriptionLoading, tier, status } = useSubscription();

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard', description: 'Overview & analytics' },
    { href: '/dashboard/upload', icon: Upload, label: 'Upload', description: 'Identify parts' },
    { href: '/dashboard/history', icon: History, label: 'History', description: 'Past uploads' },
    { href: '/dashboard/profile', icon: User, label: 'Profile', description: 'Your account' },
    { href: '/dashboard/notifications', icon: Bell, label: 'Notifications', description: 'Updates & alerts' },
    { href: '/dashboard/billing', icon: CreditCard, label: 'Billing', description: 'Subscription' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings', description: 'Preferences' }
  ];

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
            <div className="p-4 space-y-2">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isActiveRoute(item.href)
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border/80'
                      : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs opacity-60">{item.description}</div>
                  </div>
                </Link>
              ))}
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
