import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { apiClient } from '@/lib/api';
import AdminDesktopSidebar from '@/components/AdminDesktopSidebar';
import MobileSidebar from '@/components/MobileSidebar';
import { 
  Loader2, 
  AlertCircle, 
  Users, 
  Search, 
  Activity, 
  TrendingUp, 
  Shield, 
  Settings, 
  FileText, 
  BarChart3, 
  Menu,
  RefreshCw,
  Download,
  Bell,
  Clock,
  Zap,
  Database,
  Server
} from 'lucide-react';

interface AdminStats {
  total_users: number;
  total_searches: number;
  active_users: number;
  success_rate: number;
  searches_today: number;
  new_users_today: number;
  searches_this_week: number;
  system_health: string;
  pending_tasks: number;
  recent_alerts: number;
  recent_searches: any[];
  top_users: any[];
  avg_response_time: number;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

const AdminDashboardLayout = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch admin stats
      const statsResponse = await apiClient.getAdminStats();
      if (statsResponse.success && statsResponse.data?.statistics) {
        setStats(statsResponse.data.statistics);
      }

      // Fetch current admin user
      const userResponse = await apiClient.getCurrentUser();
      if (userResponse.success && userResponse.data?.user) {
        setAdminUser(userResponse.data.user);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load admin data. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleRefresh = () => {
    fetchAdminData();
    toast({
      title: "Data Refreshed",
      description: "Admin dashboard data has been updated.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchAdminData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const quickStats = [
    {
      title: 'Total Users',
      value: stats?.total_users?.toLocaleString() || '0',
      change: `+${stats?.new_users_today || 0} today`,
      icon: Users,
      color: 'from-blue-600 to-cyan-600',
      trend: 'up'
    },
    {
      title: 'Total Searches',
      value: stats?.total_searches?.toLocaleString() || '0',
      change: `+${stats?.searches_today || 0} today`,
      icon: Search,
      color: 'from-green-600 to-emerald-600',
      trend: 'up'
    },
    {
      title: 'Active Users',
      value: stats?.active_users?.toLocaleString() || '0',
      change: 'Last 30 days',
      icon: Activity,
      color: 'from-purple-600 to-pink-600',
      trend: 'up'
    },
    {
      title: 'Success Rate',
      value: `${stats?.success_rate?.toFixed(1) || '0'}%`,
      change: 'AI Accuracy',
      icon: TrendingUp,
      color: 'from-orange-600 to-red-600',
      trend: 'up'
    }
  ];

  const systemMetrics = [
    {
      title: 'Response Time',
      value: `${stats?.avg_response_time || 0}ms`,
      icon: Zap,
      color: 'text-yellow-400'
    },
    {
      title: 'CPU Usage',
      value: `${stats?.cpu_usage || 0}%`,
      icon: Server,
      color: 'text-blue-400'
    },
    {
      title: 'Memory Usage',
      value: `${stats?.memory_usage || 0}%`,
      icon: Database,
      color: 'text-green-400'
    },
    {
      title: 'Disk Usage',
      value: `${stats?.disk_usage || 0}%`,
      icon: Database,
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-40 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl opacity-60"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl opacity-40"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <AdminDesktopSidebar isCollapsed={isCollapsed} onToggle={handleToggleSidebar} />
      
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
          marginLeft: isCollapsed ? '80px' : '320px',
          width: isCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 320px)'
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-200 to-blue-200 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-400 mt-2">
                Welcome back, {adminUser?.full_name || 'Administrator'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-purple-600/20 text-purple-400 border-purple-500/30">
                <Shield className="w-3 h-3 mr-1" />
                {adminUser?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}
              </Badge>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {quickStats.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-10 rounded-2xl blur-xl group-hover:opacity-20 transition-opacity`} />
                <Card className="relative bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                        <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                        <p className="text-sm mt-1 text-gray-400">{stat.change}</p>
                      </div>
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* System Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* System Performance */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 h-full">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Server className="w-5 h-5 text-purple-400" />
                    <span>System Performance</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Real-time system metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {systemMetrics.map((metric, index) => (
                      <div key={metric.title} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                        <div className="flex items-center space-x-3">
                          <metric.icon className={`w-5 h-5 ${metric.color}`} />
                          <span className="text-gray-300">{metric.title}</span>
                        </div>
                        <span className="text-white font-semibold">{metric.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 h-full">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Latest system activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats?.recent_searches?.slice(0, 5).map((search, index) => (
                      <div key={search.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                        <div className="flex items-center space-x-3">
                          <Search className="w-4 h-4 text-blue-400" />
                          <div>
                            <p className="text-white text-sm">Part Search</p>
                            <p className="text-gray-400 text-xs">
                              {search.profiles?.email || 'Unknown user'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-500/30 text-xs">
                            {Math.round((search.confidence_score || 0) * 100)}%
                          </Badge>
                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(search.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-gray-400">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No recent activity</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminDashboardLayout; 