import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

const Dashboard = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // State for dashboard data
  const [stats, setStats] = useState({
    totalUploads: 0,
    successfulUploads: 0,
    avgConfidence: 0,
    avgProcessTime: 0
  });
  
  const [recentUploads, setRecentUploads] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState([
    {
      label: 'AI Model Accuracy',
      value: '0%',
      change: '0%',
      icon: Cpu,
      color: 'from-green-600 to-emerald-600'
    },
    {
      label: 'Database Coverage',
      value: '0',
      change: '0',
      icon: Database,
      color: 'from-blue-600 to-cyan-600'
    },
    {
      label: 'Response Time',
      value: '0ms',
      change: '0ms',
      icon: Activity,
      color: 'from-purple-600 to-violet-600'
    }
  ]);

  useEffect(() => {
    // Check auth state - redirect to login if no user
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchDashboardData = async () => {
      if (!user?.id) {
        return;
      }

      try {
        setIsDataLoading(true);
        
        // Fetch dashboard stats
        const statsResponse = await apiClient.getDashboardStats();
        if (statsResponse.success && statsResponse.data) {
          setStats({
            totalUploads: statsResponse.data.totalUploads,
            successfulUploads: statsResponse.data.successfulUploads,
            avgConfidence: statsResponse.data.avgConfidence,
            avgProcessTime: statsResponse.data.avgProcessTime
          });
        }

        // Fetch recent uploads
        const uploadsResponse = await apiClient.getRecentUploads(5);
        if (uploadsResponse.success && uploadsResponse.data?.uploads) {
          setRecentUploads(uploadsResponse.data.uploads.map(upload => ({
            id: upload.id,
            name: upload.image_name || 'Unknown',
            date: format(new Date(upload.created_at), 'PPp'),
            status: 'completed',
            confidence: upload.confidence_score ? Math.round(upload.confidence_score * 100) : 0
          })));
        }

        // Fetch recent activities
        const activitiesResponse = await apiClient.getRecentActivities(5);
        if (activitiesResponse.success && activitiesResponse.data?.activities) {
          setRecentActivities(activitiesResponse.data.activities.map(activity => ({
            id: activity.id,
            type: activity.resource_type,
            title: activity.action,
            description: activity.details?.description || '',
            time: format(new Date(activity.created_at), 'PPp'),
            confidence: activity.details?.confidence || null,
            status: activity.details?.status || 'success'
          })));
        }

        // Fetch performance metrics
        const metricsResponse = await apiClient.getPerformanceMetrics();
        if (metricsResponse.success && metricsResponse.data) {
          const data = metricsResponse.data;
          setPerformanceMetrics([
            {
              label: 'AI Model Accuracy',
              value: `${data.modelAccuracy.toFixed(1)}%`,
              change: `${(data.accuracyChange > 0 ? '+' : '')}${data.accuracyChange.toFixed(1)}%`,
              icon: Cpu,
              color: 'from-green-600 to-emerald-600'
            },
            {
              label: 'Total Searches',
              value: `${data.totalSearches}`,
              change: `${(data.searchesGrowth > 0 ? '+' : '')}${data.searchesGrowth.toFixed(1)}%`,
              icon: Database,
              color: 'from-blue-600 to-cyan-600'
            },
            {
              label: 'Response Time',
              value: `${data.avgResponseTime}ms`,
              change: `${(data.responseTimeChange < 0 ? '' : '+')}${data.responseTimeChange}ms`,
              icon: Activity,
              color: 'from-purple-600 to-violet-600'
            }
          ]);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Dashboard will still load with default/empty data
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id, navigate]);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  if (isDataLoading) {
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
        </div>

        {/* Desktop Sidebar Skeleton */}
        <div className="hidden md:flex h-screen bg-black/95 backdrop-blur-xl border-r border-white/10 flex-col fixed left-0 top-0 z-30 w-[320px]">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
          <div className="flex-1 p-4 space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-xl">
                <Skeleton className="w-5 h-5" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center space-x-3 p-3 rounded-xl">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="fixed top-4 right-4 z-50 md:hidden">
          <Skeleton className="w-10 h-10 rounded-lg" />
        </div>

        {/* Main Content */}
        <div className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible md:ml-[320px]">
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Header Skeleton */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-2xl sm:rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1">
                      <Skeleton className="h-8 sm:h-10 w-64 sm:w-80 mb-3" />
                      <Skeleton className="h-4 sm:h-5 w-48 sm:w-64" />
                    </div>
                    <Skeleton className="h-12 w-full sm:w-32" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-black/40 backdrop-blur-xl border-white/10">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-3 sm:h-4 w-20 mb-2" />
                        <Skeleton className="h-6 sm:h-8 w-16 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Performance Overview Skeleton */}
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center space-x-2">
                  <Skeleton className="w-5 h-5" />
                  <Skeleton className="h-6 w-48" />
                </div>
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <Skeleton className="w-10 h-10 rounded-xl" />
                        <Skeleton className="w-12 h-6 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-24 mb-2" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              {/* Recent Activity Card */}
              <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="w-5 h-5" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start space-x-3 p-3 rounded-xl">
                      <Skeleton className="w-8 h-8 rounded-lg" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="w-12 h-5 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-48 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="w-5 h-5" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 h-12 p-3 rounded-xl">
                      <Skeleton className="w-8 h-8 rounded-lg" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                    Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
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
                value: stats.totalUploads.toString(), 
                change: '+12%', 
                icon: Upload, 
                color: 'from-purple-600 to-blue-600',
                bgColor: 'from-purple-600/20 to-blue-600/20'
              },
              { 
                title: 'Successful IDs', 
                value: stats.successfulUploads.toString(), 
                change: `${((stats.successfulUploads / stats.totalUploads) * 100).toFixed(1)}%`, 
                icon: CheckCircle, 
                color: 'from-green-600 to-emerald-600',
                bgColor: 'from-green-600/20 to-emerald-600/20'
              },
              { 
                title: 'Avg Confidence', 
                value: `${stats.avgConfidence}%`, 
                change: '+2.1%', 
                icon: TrendingUp, 
                color: 'from-blue-600 to-cyan-600',
                bgColor: 'from-blue-600/20 to-cyan-600/20'
              },
              { 
                title: 'Processing Time', 
                value: `${stats.avgProcessTime}s`, 
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
