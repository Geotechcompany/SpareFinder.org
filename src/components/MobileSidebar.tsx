import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SidebarUserPlanCard } from '@/components/dashboard/SidebarUserPlanCard';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from "@/contexts/SubscriptionContext";
import { 
  Home, 
  Upload, 
  History, 
  Settings, 
  X,
  User,
  Bell,
  CreditCard,
  Star,
  Ticket
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
  const { logout } = useAuth();
  const { isPlanActive, isLoading: subscriptionLoading } = useSubscription();

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
        { href: "/dashboard/support", icon: Ticket, label: "Support", description: "Help & tickets" },
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
            className="fixed left-0 top-0 bottom-0 flex w-[min(100vw,320px)] flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border backdrop-blur-xl z-50 md:hidden dark:bg-[#0F1221] dark:text-white dark:border-white/10"
          >
            <div className="flex items-center justify-between border-b border-sidebar-border/80 p-4 dark:border-white/10">
              <motion.div>
                <h2 className="text-base font-bold text-sidebar-foreground dark:text-white">SpareFinder</h2>
                <p className="text-[11px] text-muted-foreground dark:text-gray-400">Your workspace</p>
              </motion.div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground dark:hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
                                ? "bg-sidebar-accent/80 text-sidebar-accent-foreground border-sidebar-border shadow-soft-elevated dark:bg-accent/10 dark:border-accent/30"
                                : "border-transparent text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5"
                  }`}
                >
                            {active ? (
                              <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
                            ) : null}
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 transition-colors ${
                                active
                                  ? "bg-primary/20 text-primary ring-primary/40"
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

            <motion.div className="border-t border-sidebar-border/80 p-4 dark:border-white/10">
              <SidebarUserPlanCard onSignOut={handleSignOut} />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileSidebar; 
