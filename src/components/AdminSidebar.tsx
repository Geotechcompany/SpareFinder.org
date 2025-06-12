import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users,
  Shield,
  BarChart3,
  Settings,
  Terminal,
  Database,
  LogOut,
  X,
  Menu,
  Mail,
  CreditCard,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Crown,
  Server,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const AdminSidebar = ({ isCollapsed = false, onToggle }: AdminSidebarProps) => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { 
      href: '/admin/user-management', 
      label: 'User Management', 
      icon: Users,
      description: 'Manage system users and permissions'
    },
    { 
      href: '/admin/system-analytics', 
      label: 'System Analytics', 
      icon: BarChart3,
      description: 'View system performance metrics'
    },
    { 
      href: '/admin/system-settings', 
      label: 'System Settings', 
      icon: Settings,
      description: 'Configure system parameters'
    },
    { 
      href: '/admin/database-console', 
      label: 'Database Console', 
      icon: Database,
      description: 'Database management tools'
    },
    { 
      href: '/admin/audit-logs', 
      label: 'Audit Logs', 
      icon: Terminal,
      description: 'System activity monitoring'
    },
    { 
      href: '/admin/email-smtp', 
      label: 'Email SMTP', 
      icon: Mail,
      description: 'Email server configuration'
    },
    { 
      href: '/admin/payment-methods', 
      label: 'Payment Methods', 
      icon: CreditCard,
      description: 'Payment gateway settings'
    },
    { 
      href: '/admin/ai-models', 
      label: 'AI Models', 
      icon: BrainCircuit,
      description: 'AI model configuration'
    }
  ];

  const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

  const handleLogout = () => {
    console.log('Admin logout');
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Menu Button */}
      {!isMobileOpen && (
        <motion.button
          onClick={toggleMobileMenu}
          className="lg:hidden fixed top-6 left-6 z-50 p-3 rounded-xl bg-red-800/80 backdrop-blur-sm border border-red-700/50 hover:bg-red-700/80 transition-colors"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Menu className="w-6 h-6 text-white" />
        </motion.button>
      )}

      {/* Mobile Sidebar */}
      <AnimatePresence mode="wait">
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={toggleMobileMenu}
            />
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-full w-80 bg-gray-900/95 backdrop-blur-xl border-r border-red-800/50 lg:hidden"
            >
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-6 border-b border-red-800/30">
                <Link to="/admin" className="flex items-center space-x-3 group">
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-rose-600/20 rounded-full blur-lg"
                    />
                    <div className="relative w-10 h-10 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold bg-gradient-to-r from-red-200 to-rose-200 bg-clip-text text-transparent">
                      Admin Console
                    </h2>
                    <p className="text-red-400/60 text-xs">System Administration</p>
                  </div>
                </Link>

                <motion.button
                  onClick={toggleMobileMenu}
                  className="p-2 rounded-lg hover:bg-red-800/30 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-6 h-6 text-red-400" />
                </motion.button>
              </div>

              {/* Mobile Navigation */}
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
                      className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 group ${
                        location.pathname === item.href 
                          ? 'bg-gradient-to-r from-red-600/20 to-rose-600/20 border border-red-500/30 text-red-100'
                          : 'hover:bg-red-800/10 text-gray-300 hover:text-red-200'
                      }`}
                    >
                      <div className={`p-2 rounded-lg transition-colors ${
                        location.pathname === item.href
                          ? 'bg-red-600/20 text-red-300'
                          : 'bg-gray-800/50 text-gray-400 group-hover:bg-red-800/20 group-hover:text-red-400'
                      }`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.label}</div>
                        <div className="text-xs opacity-60 truncate">{item.description}</div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Mobile User Section */}
              <div className="p-4 border-t border-red-800/30">
                <div className="flex items-center space-x-3 p-3 rounded-xl bg-red-900/30 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-rose-600 rounded-lg flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-red-100 truncate">Administrator</div>
                    <div className="text-xs text-red-400/60">Super Admin</div>
                  </div>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full justify-start text-red-300 hover:text-red-100 hover:bg-red-800/20 rounded-xl h-12"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    <span className="font-medium">Logout</span>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: isCollapsed ? 80 : 320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:flex h-screen bg-gray-900/95 backdrop-blur-xl border-r border-red-800/50 flex-col fixed left-0 top-0 z-30"
      >
        {/* Desktop Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/30 to-rose-900/20 opacity-60" />
          <div className="relative p-6 border-b border-red-800/30">
            <AnimatePresence mode="wait">
              {!isCollapsed ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link to="/admin" className="flex items-center space-x-3 group">
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-rose-600/20 rounded-full blur-lg"
                      />
                      <div className="relative w-10 h-10 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold bg-gradient-to-r from-red-200 to-rose-200 bg-clip-text text-transparent">
                        Admin Console
                      </h2>
                      <p className="text-red-400/60 text-xs">System Administration</p>
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
                  <Link to="/admin" className="group">
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-rose-600/20 rounded-full blur-lg"
                      />
                      <div className="relative w-10 h-10 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Toggle Button */}
          {onToggle && (
            <motion.button
              onClick={onToggle}
              className="absolute -right-3 top-8 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg transition-colors"
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

        {/* Desktop Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <AnimatePresence mode="wait">
            {navItems.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Link
                  to={item.href}
                  className={`relative flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 group ${
                    location.pathname === item.href 
                      ? 'text-red-100'
                      : 'text-gray-300 hover:text-red-200'
                  }`}
                >
                  {location.pathname === item.href && (
                    <motion.div
                      layoutId="adminActiveTab"
                      className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-rose-600/20 border border-red-500/30 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  
                  <div className={`relative p-2 rounded-lg transition-colors ${
                    location.pathname === item.href
                      ? 'bg-red-600/20 text-red-300'
                      : 'bg-gray-800/50 text-gray-400 group-hover:bg-red-800/20 group-hover:text-red-400'
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.div
                        key="nav-text"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex-1 min-w-0 overflow-hidden"
                      >
                        <div className="font-medium truncate">{item.label}</div>
                        <div className="text-xs opacity-60 truncate">{item.description}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Desktop User Section */}
        <div className="p-4 border-t border-red-800/30">
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="user-expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center space-x-3 p-3 rounded-xl bg-red-900/30 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-rose-600 rounded-lg flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-red-100 truncate">Administrator</div>
                    <div className="text-xs text-red-400/60">Super Admin</div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="user-collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex justify-center mb-3"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-rose-600 rounded-lg flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleLogout}
              variant="ghost"
              className={`${
                isCollapsed ? 'w-12 h-12 p-0' : 'w-full justify-start'
              } text-red-300 hover:text-red-100 hover:bg-red-800/20 rounded-xl transition-all duration-200`}
            >
              <LogOut className="w-5 h-5" />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    key="logout-text"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.3 }}
                    className="ml-3 font-medium overflow-hidden"
                  >
                    Logout
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};

export default AdminSidebar; 