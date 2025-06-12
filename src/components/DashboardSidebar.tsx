import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const DashboardSidebar: React.FC<SidebarProps> = ({ isCollapsed = false, onToggle }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

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
    <>
      {/* Mobile Menu Button */}
      <motion.button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Menu className="w-6 h-6" />
      </motion.button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            onClick={toggleMobileMenu}
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="fixed lg:hidden z-50 h-full w-80 bg-black/95 backdrop-blur-xl border-r border-white/10"
          >
            <div className="flex flex-col h-full">
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center"
                  >
                    <Zap className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-white font-bold text-lg">PartFinder AI</h2>
                    <p className="text-gray-400 text-xs">Mobile Dashboard</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMobileMenu}
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Mobile Navigation */}
              <div className="flex-1 p-4 space-y-2">
                {navItems.map((item, index) => (
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
                          ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
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
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">John Doe</p>
                    <p className="text-gray-400 text-sm">Pro Plan</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full mt-3 text-red-400 hover:text-red-300 hover:bg-red-600/10 justify-start"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: isCollapsed ? 80 : 320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:flex h-screen bg-black/95 backdrop-blur-xl border-r border-white/10 flex-col fixed left-0 top-0 z-30"
      >
        {/* Desktop Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
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
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25"
                >
                  <Zap className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-white font-bold text-lg">PartFinder AI</h2>
                  <p className="text-gray-400 text-xs">AI-Powered Recognition</p>
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
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25"
                >
                  <Zap className="w-6 h-6 text-white" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isCollapsed && (
            <motion.button
              onClick={onToggle}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
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
              className="w-full p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
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
          {navItems.map((item, index) => (
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
                    ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
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
        <div className="p-4 border-t border-white/10">
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="user-expanded"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 border border-white/10 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">John Doe</p>
                    <p className="text-gray-400 text-sm">Pro Plan</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-600/10 justify-start"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="user-collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center space-y-3"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                  <UserCircle className="w-6 h-6 text-white" />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-10 h-10 p-0 text-red-400 hover:text-red-300 hover:bg-red-600/10"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

export default DashboardSidebar;
