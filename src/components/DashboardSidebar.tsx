
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Upload, 
  History, 
  CreditCard, 
  Settings, 
  LogOut,
  Zap,
  Users,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isAdmin?: boolean;
}

const DashboardSidebar: React.FC<SidebarProps> = ({ isAdmin = false }) => {
  const location = useLocation();

  const userNavItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/dashboard/upload', icon: Upload, label: 'Upload Part' },
    { href: '/dashboard/history', icon: History, label: 'History' },
    { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const adminNavItems = [
    { href: '/admin', icon: BarChart3, label: 'Analytics' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const handleLogout = () => {
    // Logout logic will be implemented with Supabase
    console.log('Logout attempt');
  };

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 flex flex-col"
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">PartFinder AI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Actions */}
      <div className="p-4 border-t border-gray-800">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800/50"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </motion.div>
  );
};

export default DashboardSidebar;
