import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
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

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard', description: 'Overview & analytics' },
    { href: '/dashboard/upload', icon: Upload, label: 'Upload', description: 'Identify parts' },
    { href: '/dashboard/history', icon: History, label: 'History', description: 'Past uploads' },
    { href: '/dashboard/profile', icon: User, label: 'Profile', description: 'Your account' },
    { href: '/dashboard/notifications', icon: Bell, label: 'Notifications', description: 'Updates & alerts' },
    { href: '/dashboard/billing', icon: CreditCard, label: 'Billing', description: 'Subscription' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings', description: 'Preferences' }
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-black/95 backdrop-blur-xl border-r border-white/10 z-50 md:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">John Doe</h3>
                  <p className="text-xs text-gray-400">Pro Member</p>
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

            {/* Navigation */}
            <div className="p-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isActiveRoute(item.href)
                      ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
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
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => {
                  // Handle logout
                  onClose();
                }}
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