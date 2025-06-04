import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, History, CreditCard, Zap, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardSidebar from '@/components/DashboardSidebar';

const Dashboard = () => {
  // Mock data - will be replaced with real data from Supabase
  const stats = {
    totalUploads: 24,
    thisMonth: 8,
    successRate: 96,
    avgProcessTime: '2.3s'
  };

  const recentUploads = [
    { id: 1, name: 'Brake Pad Model XY-123', date: '2 hours ago', status: 'completed' },
    { id: 2, name: 'Engine Filter AF-456', date: '1 day ago', status: 'completed' },
    { id: 3, name: 'Transmission Gear TG-789', date: '2 days ago', status: 'completed' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      <DashboardSidebar />
      
      <div className="flex-1 lg:ml-64 p-8 lg:pt-8 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-gray-400">Welcome back! Here's your AI part identification overview.</p>
            </div>
            <Link to="/dashboard/upload">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Upload className="w-4 h-4 mr-2" />
                Upload New Part
              </Button>
            </Link>
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
                  <CardTitle className="text-sm font-medium text-gray-300">Total Uploads</CardTitle>
                  <Upload className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.totalUploads}</div>
                  <p className="text-xs text-gray-400">All time uploads</p>
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
                  <CardTitle className="text-sm font-medium text-gray-300">This Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.thisMonth}</div>
                  <p className="text-xs text-green-400">+20% from last month</p>
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
                  <CardTitle className="text-sm font-medium text-gray-300">Success Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.successRate}%</div>
                  <p className="text-xs text-gray-400">AI accuracy rate</p>
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
                  <CardTitle className="text-sm font-medium text-gray-300">Avg Process Time</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.avgProcessTime}</div>
                  <p className="text-xs text-gray-400">Lightning fast AI</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                  <CardDescription className="text-gray-400">
                    Common tasks and shortcuts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to="/dashboard/upload">
                    <Button className="w-full justify-start bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-white hover:from-purple-600/30 hover:to-blue-600/30">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New Part Image
                    </Button>
                  </Link>
                  <Link to="/dashboard/history">
                    <Button variant="outline" className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                      <History className="w-4 h-4 mr-2" />
                      View Upload History
                    </Button>
                  </Link>
                  <Link to="/dashboard/billing">
                    <Button variant="outline" className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manage Subscription
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Recent Uploads</CardTitle>
                  <CardDescription className="text-gray-400">
                    Your latest part identifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentUploads.map((upload) => (
                      <div key={upload.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <div>
                            <p className="text-white text-sm font-medium">{upload.name}</p>
                            <p className="text-gray-400 text-xs">{upload.date}</p>
                          </div>
                        </div>
                        <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                          {upload.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link to="/dashboard/history">
                    <Button variant="ghost" className="w-full mt-4 text-gray-300 hover:text-white hover:bg-gray-700/50">
                      View All History
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
