import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Eye,
  Download,
  Search,
  Cpu,
  Database,
  Activity,
  Menu
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileSidebar from '@/components/MobileSidebar';

const Dashboard = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mock data - will be replaced with real data from Supabase
  const stats = {
    totalUploads: 24,
    thisMonth: 8,
    successRate: 96,
    avgProcessTime: '2.3s'
  };

  const recentUploads = [
    { id: 1, name: 'Brake Pad Model XY-123', date: '2 hours ago', status: 'completed', confidence: 99.2 },
    { id: 2, name: 'Engine Filter AF-456', date: '1 day ago', status: 'completed', confidence: 97.8 },
    { id: 3, name: 'Transmission Gear TG-789', date: '2 days ago', status: 'completed', confidence: 98.5 },
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'upload',
      title: 'Brake Pad Set Identified',
      description: 'Successfully identified as Bosch QuietCast Premium',
      time: '2 minutes ago',
      confidence: 99.2,
      status: 'success'
    },
    {
      id: 2,
      type: 'search',
      title: 'Air Filter Analysis',
      description: 'Matched with OEM specification AF-8901-STD',
      time: '15 minutes ago',
      confidence: 97.8,
      status: 'success'
    },
    {
      id: 3,
      type: 'upload',
      title: 'Oil Filter Recognition',
      description: 'Identified as Premium Guard PG-4967',
      time: '1 hour ago',
      confidence: 98.5,
      status: 'success'
    }
  ];

  const performanceMetrics = [
    {
      label: 'AI Model Accuracy',
      value: '99.2%',
      change: '+2.1%',
      icon: Cpu,
      color: 'from-green-600 to-emerald-600'
    },
    {
      label: 'Database Coverage',
      value: '10.2M',
      change: '+15K',
      icon: Database,
      color: 'from-blue-600 to-cyan-600'
    },
    {
      label: 'Response Time',
      value: '87ms',
      change: '-12ms',
      icon: Activity,
      color: 'from-purple-600 to-violet-600'
    }
  ];

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -left-40 w-80 h-80 bg-purple-600/30 rounded-full blur-3xl opacity-70"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl opacity-60"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-40 left-1/3 w-64 h-64 bg-indigo-600/25 rounded-full blur-3xl opacity-50"
          animate={{
            scale: [1, 1.3, 1],
            x: [-20, 20, -20],
            y: [-10, 10, -10],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Desktop Sidebar */}
      <DashboardSidebar isCollapsed={isCollapsed} onToggle={handleToggleSidebar} />

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Mobile Menu Button */}
      <button 
        onClick={handleToggleMobileMenu}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-black/20 backdrop-blur-xl border border-white/10 md:hidden"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={{ 
          marginLeft: isCollapsed 
            ? 'var(--collapsed-sidebar-width, 80px)' 
            : 'var(--expanded-sidebar-width, 320px)',
          width: isCollapsed
            ? 'calc(100% - var(--collapsed-sidebar-width, 80px))'
            : 'calc(100% - var(--expanded-sidebar-width, 320px))'
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 sm:space-y-6 lg:space-y-8"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-2xl sm:rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <motion.h1 
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Welcome back, John
                  </motion.h1>
                  <motion.p 
                    className="text-sm sm:text-base text-gray-400 mt-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Here's what's happening with your part identification today
                  </motion.p>
                </div>
                <motion.div
                  className="flex space-x-3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25">
                      <Upload className="w-4 h-4 mr-2" />
                      New Upload
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {[
              { 
                title: 'Total Uploads', 
                value: '2,847', 
                change: '+12%', 
                icon: Upload, 
                color: 'from-purple-600 to-blue-600',
                bgColor: 'from-purple-600/20 to-blue-600/20'
              },
              { 
                title: 'Successful IDs', 
                value: '2,731', 
                change: '+8%', 
                icon: CheckCircle, 
                color: 'from-green-600 to-emerald-600',
                bgColor: 'from-green-600/20 to-emerald-600/20'
              },
              { 
                title: 'Avg Confidence', 
                value: '96.8%', 
                change: '+2.1%', 
                icon: TrendingUp, 
                color: 'from-blue-600 to-cyan-600',
                bgColor: 'from-blue-600/20 to-cyan-600/20'
              },
              { 
                title: 'Processing Time', 
                value: '0.3s', 
                change: '-15%', 
                icon: Clock, 
                color: 'from-orange-600 to-red-600',
                bgColor: 'from-orange-600/20 to-red-600/20'
              }
            ].map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.bgColor} rounded-xl sm:rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity`} />
                <Card className="relative bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm font-medium">{stat.title}</p>
                        <p className="text-xl sm:text-2xl font-bold text-white mt-1">{stat.value}</p>
                        <p className={`text-xs sm:text-sm mt-1 ${
                          stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {stat.change} from last month
                        </p>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${stat.color} shadow-lg`}>
                        <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Performance Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-2xl sm:rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span>Performance Overview</span>
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  AI model insights and system performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {performanceMetrics.map((metric, index) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="relative group"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${metric.color} opacity-10 rounded-2xl blur group-hover:opacity-20 transition-opacity`} />
                      <div className="relative p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`p-2 rounded-xl bg-gradient-to-r ${metric.color} shadow-lg`}>
                            <metric.icon className="w-5 h-5 text-white" />
                          </div>
                          <Badge variant="secondary" className="bg-white/10 text-green-400 border-green-500/30">
                            {metric.change}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">{metric.label}</p>
                          <p className="text-2xl font-bold text-white">{metric.value}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="bg-black/20 backdrop-blur-xl border-white/10 h-full">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
                    <Activity className="w-5 h-5 text-blue-400" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm">
                    Your latest part identification results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                  {recentActivities.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="flex items-start space-x-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <div className="p-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-white/10 group-hover:border-white/20 transition-colors">
                        {activity.type === 'upload' ? (
                          <Upload className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Search className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-white text-sm font-medium truncate">{activity.title}</p>
                          <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-500/30 text-xs">
                            {activity.confidence}%
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">{activity.description}</p>
                        <p className="text-gray-500 text-xs mt-1">{activity.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="bg-black/20 backdrop-blur-xl border-white/10 h-full">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <span>Quick Actions</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm">
                    Frequently used features and tools
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6">
                  {[
                    { label: 'Upload New Part', icon: Upload, href: '/dashboard/upload', color: 'from-purple-600 to-blue-600' },
                    { label: 'View History', icon: FileText, href: '/dashboard/history', color: 'from-blue-600 to-cyan-600' },
                    { label: 'Download Report', icon: Download, href: '#', color: 'from-green-600 to-emerald-600' },
                    { label: 'View Analytics', icon: Eye, href: '#', color: 'from-orange-600 to-red-600' }
                  ].map((action, index) => (
                    <motion.div
                      key={action.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 + index * 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 text-gray-300 hover:text-white hover:bg-white/5 group"
                      >
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${action.color} mr-3 group-hover:scale-110 transition-transform`}>
                          <action.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium">{action.label}</span>
                      </Button>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
