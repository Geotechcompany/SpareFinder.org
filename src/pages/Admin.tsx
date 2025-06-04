
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  DollarSign, 
  Upload, 
  TrendingUp, 
  Activity,
  BarChart3,
  Shield
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

const Admin = () => {
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <DashboardSidebar isAdmin={true} />
        
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-800 px-4">
            <SidebarTrigger className="-ml-1 text-gray-300 hover:text-white hover:bg-gray-800" />
            <div className="ml-auto flex items-center space-x-2 bg-red-600/20 text-red-300 px-3 py-2 rounded-lg border border-red-500/30">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Admin Access</span>
            </div>
          </header>

          <div className="flex-1 p-4 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 lg:space-y-8"
            >
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                <p className="text-gray-400">System overview and analytics</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
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
                              <div className="min-w-0 flex-1">
                                <p className="text-white text-sm font-medium truncate">
                                  {activity.type === 'user_signup' ? 'New user registered' :
                                   activity.type === 'upload' ? 'Part uploaded' :
                                   'Subscription upgraded'}
                                </p>
                                <p className="text-gray-400 text-xs truncate">{activity.user}</p>
                              </div>
                            </div>
                            <span className="text-gray-400 text-xs whitespace-nowrap ml-2">{activity.time}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

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
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/50">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="text-sm font-medium text-white truncate">{part.name}</div>
                              <div className="flex-1 bg-gray-600 rounded-full h-2 ml-4">
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" 
                                  style={{ width: `${part.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-sm font-medium text-white">{part.searches}</div>
                              <div className="text-xs text-gray-400">{part.percentage}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
