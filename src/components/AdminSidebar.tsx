import { useState } from 'react';
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
  BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const AdminSidebar = () => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { href: '/admin/user-management', label: 'User Management', icon: Users },
    { href: '/admin/system-analytics', label: 'System Analytics', icon: BarChart3 },
    { href: '/admin/system-settings', label: 'System Settings', icon: Settings },
    { href: '/admin/database-console', label: 'Database Console', icon: Database },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: Terminal },
    { href: '/admin/email-smtp', label: 'Email SMTP', icon: Mail },
    { href: '/admin/payment-methods', label: 'Payment Methods', icon: CreditCard },
    { href: '/admin/ai-models', label: 'AI Models', icon: BrainCircuit }
  ];

  const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

  const handleLogout = () => {
    console.log('Admin logout');
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-red-800/80 backdrop-blur-sm border border-red-700"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.3 }}
            className="fixed lg:hidden z-40 h-full w-64 bg-gray-900/95 backdrop-blur-xl border-r border-red-800 flex flex-col"
          >
            {/* Close Button */}
            <div className="absolute top-4 right-4">
              <button
                onClick={toggleMobileMenu}
                className="p-1 rounded-full hover:bg-red-800/50 transition-colors"
              >
                <X className="w-6 h-6 text-red-400" />
              </button>
            </div>
            
            {/* Admin Logo */}
            <div className="p-6 border-b border-red-800 bg-gradient-to-r from-red-900/30 to-rose-900/20">
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-red-200 to-rose-200 bg-clip-text text-transparent">
                  Admin Console
                </span>
              </Link>
            </div>

            {/* Admin Navigation */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    location.pathname === item.href 
                      ? 'bg-red-800/30 text-red-100'
                      : 'hover:bg-red-800/20 text-gray-300'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="p-4 border-t border-red-800">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start text-red-300 hover:text-red-100 hover:bg-red-800/20"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span className="font-medium">Logout</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Removed motion */}
      <div className="hidden lg:flex h-screen w-64 bg-gray-900/95 backdrop-blur-xl border-r border-red-800 flex-col fixed left-0 top-0">
        {/* Desktop Admin Logo */}
        <div className="p-6 border-b border-red-800 bg-gradient-to-r from-red-900/30 to-rose-900/20">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-red-200 to-rose-200 bg-clip-text text-transparent">
              Admin Console
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                location.pathname === item.href 
                  ? 'bg-red-800/30 text-red-100'
                  : 'hover:bg-red-800/20 text-gray-300'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-red-800">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-red-300 hover:text-red-100 hover:bg-red-800/20"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Logout</span>
          </Button>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar; 