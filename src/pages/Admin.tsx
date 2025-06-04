import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  DollarSign, 
  Upload, 
  TrendingUp, 
  Activity,
  BarChart3,
  Shield,
  Menu,
  X
} from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import { Outlet } from 'react-router-dom';

const Admin = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const stats = {
    totalUsers: 1247,
    activeUsers: 892,
    totalRevenue: 45680,
    monthlyRevenue: 12450,
    totalUploads: 15234,
    successRate: 94.2,
    avgProcessTime: 2.3
  };

  const recentActivity = [
    { id: 1, type: 'user_signup', user: 'john@example.com', time: '2 minutes ago' },
    { id: 2, type: 'upload', user: 'sarah@example.com', time: '5 minutes ago' },
    { id: 3, type: 'subscription', user: 'mike@example.com', time: '10 minutes ago' },
    { id: 4, type: 'upload', user: 'anna@example.com', time: '15 minutes ago' },
  ];

  const topParts = [
    { name: 'Brake Pads', searches: 234, percentage: 15.2 },
    { name: 'Air Filters', searches: 189, percentage: 12.3 },
    { name: 'Spark Plugs', searches: 156, percentage: 10.1 },
    { name: 'Oil Filters', searches: 134, percentage: 8.7 },
  ];

  const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <Outlet />
      </div>
    </div>
  );
};

export default Admin; 