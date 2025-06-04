
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  DollarSign, 
  Upload, 
  TrendingUp, 
  Activity,
  Settings,
  BarChart3,
  Shield
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';

const Admin = () => {
  // Mock data - will be replaced with real analytics from Supabase
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      <DashboardSidebar isAdmin={true} />
      
      <div className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-gray-400">System overview and analytics</p>
            </div>
            <div className="flex items-center space-x-2 bg-red-600/20 text-red-300 px-3 py-2 rounded-lg border border-red-500/30">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Admin Access</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</div>
                  <p className="text-xs text-green-400">+12% from last month</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">${stats.monthlyRevenue.toLocaleString()}</div>
                  <p className="text-xs text-green-400">+8% from last month</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total Uploads</CardTitle>
                  <Upload className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.totalUploads.toLocaleString()}</div>
                  <p className="text-xs text-green-400">+24% from last month</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.successRate}%</div>
                  <p className="text-xs text-green-400">+2% from last month</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Latest user actions and system events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/50">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.type === 'user_signup' ? 'bg-green-400' :
                            activity.type === 'upload' ? 'bg-blue-400' :
                            'bg-purple-400'
                          }`}></div>
                          <div>
                            <p className="text-white text-sm font-medium">
                              {activity.type === 'user_signup' ? 'New user registered' :
                               activity.type === 'upload' ? 'Part uploaded' :
                               'Subscription upgraded'}
                            </p>
                            <p className="text-gray-400 text-xs">{activity.user}</p>
                          </div>
                        </div>
                        <span className="text-gray-400 text-xs">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Searched Parts */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Top Searched Parts</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Most frequently identified parts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topParts.map((part, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">{part.name}</span>
                          <div className="text-right">
                            <span className="text-white text-sm">{part.searches}</span>
                            <span className="text-gray-400 text-xs ml-2">({part.percentage}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full" 
                            style={{ width: `${part.percentage * 5}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* System Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>System Health</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Key performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.successRate}%</div>
                    <p className="text-gray-400 text-sm">AI Success Rate</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{stats.avgProcessTime}s</div>
                    <p className="text-gray-400 text-sm">Avg Process Time</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{stats.activeUsers}</div>
                    <p className="text-gray-400 text-sm">Active Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
