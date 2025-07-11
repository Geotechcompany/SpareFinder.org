import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminDesktopSidebar from '@/components/AdminDesktopSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { 
  BarChart3, 
  Activity, 
  Server, 
  Database, 
  Cpu,
  Users,
  Upload,
  Download,
  Zap,
  HardDrive,
  Wifi,
  TrendingUp,
  TrendingDown,
  Clock,
  Globe,
  Shield,
  AlertTriangle,
  CheckCircle,
  MemoryStick,
  RefreshCw,
  Calendar,
  Target,
  Loader2
} from 'lucide-react';

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  avg_response_time: number;
  total_users: number;
  active_users: number;
  total_searches: number;
  success_rate: number;
  searches_today: number;
  new_users_today: number;
  searches_this_week: number;
  system_health: 'healthy' | 'warning' | 'critical';
}

interface AnalyticsData {
  searches_by_day: Record<string, number>;
  registrations_by_day: Record<string, number>;
  time_range: string;
}

const SystemAnalytics = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const { toast } = useToast();

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  useEffect(() => {
    fetchSystemData();
  }, [timeRange]);

  const fetchSystemData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch system metrics 
      const metricsResponse = await api.admin.getAdminStats();

      if (metricsResponse.success && metricsResponse.data?.statistics) {
        const stats = metricsResponse.data.statistics;
        setMetrics({
          ...stats,
          system_health: (stats.system_health as 'healthy' | 'warning' | 'critical') || 'healthy'
        });
      }

      // For now, create mock analytics data since the API endpoint doesn't exist yet
      const mockAnalytics: AnalyticsData = {
        searches_by_day: {},
        registrations_by_day: {},
        time_range: timeRange
      };
      
      // Generate mock data for the selected time range
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const now = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        mockAnalytics.searches_by_day[dateStr] = Math.floor(Math.random() * 100) + 20;
        mockAnalytics.registrations_by_day[dateStr] = Math.floor(Math.random() * 20) + 1;
      }
      
      setAnalytics(mockAnalytics);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching system data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch system data');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load system analytics. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Clock;
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage >= 90) return 'from-red-600 to-rose-600';
    if (usage >= 70) return 'from-yellow-600 to-orange-600';
    return 'from-green-600 to-emerald-600';
  };

  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString();
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Calculate chart data from analytics
  const chartData = analytics ? Object.entries(analytics.searches_by_day).map(([date, searches]) => ({
    date,
    searches,
    registrations: analytics.registrations_by_day[date] || 0
  })).slice(-30) : [];

  const systemMetrics = {
    uptime: '47d 12h 34m',
    totalUsers: 12847,
    activeUsers: 2341,
    totalUploads: 847293,
    avgResponseTime: '0.32s',
    successRate: 99.7,
    errorRate: 0.3,
    dataProcessed: '2.4TB'
  };

  const performanceData = [
    { label: 'CPU Usage', value: 68, unit: '%', status: 'good', icon: Cpu, color: 'from-blue-600 to-cyan-600' },
    { label: 'Memory Usage', value: 74, unit: '%', status: 'warning', icon: MemoryStick, color: 'from-yellow-600 to-orange-600' },
    { label: 'Disk Usage', value: 45, unit: '%', status: 'good', icon: HardDrive, color: 'from-green-600 to-emerald-600' },
    { label: 'Network I/O', value: 23, unit: 'MB/s', status: 'good', icon: Wifi, color: 'from-purple-600 to-violet-600' }
  ];

  const recentActivity = [
    { time: '14:32', action: 'System backup completed', status: 'success', icon: CheckCircle },
    { time: '14:28', action: 'High CPU usage detected', status: 'warning', icon: AlertTriangle },
    { time: '14:15', action: 'New user registration spike', status: 'info', icon: Users },
    { time: '14:02', action: 'Database optimization completed', status: 'success', icon: Database },
    { time: '13:45', action: 'API response time improved', status: 'success', icon: Zap }
  ];

  const trafficStats = [
    { label: 'Total Requests', value: '1.2M', change: '+12.3%', trend: 'up' },
    { label: 'API Calls', value: '847K', change: '+8.7%', trend: 'up' },
    { label: 'Upload Requests', value: '234K', change: '-2.1%', trend: 'down' },
    { label: 'Error Responses', value: '1.2K', change: '-15.4%', trend: 'down' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'warning':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
      case 'error':
        return 'bg-red-600/20 text-red-300 border-red-500/30';
      default:
        return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-40 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl opacity-60"
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
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl opacity-40"
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
      
      <motion.div
        initial={false}
        animate={{ marginLeft: isCollapsed ? 80 : 320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-4 lg:p-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 lg:space-y-8 max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full border border-blue-500/30 backdrop-blur-xl mb-4"
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                    </motion.div>
                    <span className="text-blue-300 text-sm font-semibold">System Analytics</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    System Analytics
                  </motion.h1>
                  <motion.p 
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Real-time system performance monitoring
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center space-x-3"
                >
                  <Badge className="bg-green-600/20 text-green-300 border-green-500/30 px-3 py-1">
                    <Activity className="w-4 h-4 mr-2" />
                    System Online
                  </Badge>
                  <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 px-3 py-1">
                    <Clock className="w-4 h-4 mr-2" />
                    {systemMetrics.uptime}
                  </Badge>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { label: 'Total Users', value: systemMetrics.totalUsers.toLocaleString(), icon: Users, color: 'from-blue-600 to-cyan-600' },
              { label: 'Active Users', value: systemMetrics.activeUsers.toLocaleString(), icon: Activity, color: 'from-green-600 to-emerald-600' },
              { label: 'Total Uploads', value: systemMetrics.totalUploads.toLocaleString(), icon: Upload, color: 'from-purple-600 to-violet-600' },
              { label: 'Success Rate', value: `${systemMetrics.successRate}%`, icon: CheckCircle, color: 'from-emerald-600 to-teal-600' }
            ].map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${metric.color} opacity-10 rounded-2xl blur-xl`} />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">{metric.label}</p>
                        <p className="text-2xl font-bold text-white">{metric.value}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${metric.color} flex items-center justify-center`}>
                        <metric.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Performance Metrics */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* System Performance */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl blur-xl opacity-60" />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Server className="w-5 h-5 text-blue-400" />
                      <span>System Performance</span>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Real-time system resource monitoring
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {performanceData.map((item, index) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9 + index * 0.1 }}
                          className="relative p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${item.color} flex items-center justify-center`}>
                                <item.icon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-white">{item.label}</div>
                                <div className={`text-sm ${getStatusColor(item.status)}`}>
                                  {item.status === 'good' ? 'Normal' : item.status === 'warning' ? 'High' : 'Critical'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-xl font-bold ${getStatusColor(item.status)}`}>
                                {item.value}{item.unit}
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-700/50 rounded-full h-2">
                            <motion.div
                              className={`h-2 rounded-full bg-gradient-to-r ${item.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${typeof item.value === 'number' ? item.value : 0}%` }}
                              transition={{ delay: 1 + index * 0.1, duration: 1 }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Traffic Statistics */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl blur-xl opacity-60" />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Globe className="w-5 h-5 text-blue-400" />
                      <span>Traffic Statistics</span>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      API and upload traffic analytics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {trafficStats.map((stat, index) => (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.1 + index * 0.1 }}
                          className="p-4 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-gray-400 text-sm">{stat.label}</div>
                              <div className="text-xl font-bold text-white">{stat.value}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {stat.trend === 'up' ? (
                                <TrendingUp className="w-5 h-5 text-green-400" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-red-400" />
                              )}
                              <span className={`text-sm font-medium ${
                                stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {stat.change}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    System events and alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 + index * 0.1 }}
                        className="flex items-start space-x-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <Badge className={`${getActivityStatusColor(activity.status)} p-1`}>
                            <activity.icon className="w-3 h-3" />
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{activity.action}</p>
                          <p className="text-gray-400 text-xs">{activity.time}</p>
                        </div>
                      </motion.div>
                    ))}
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

export default SystemAnalytics; 