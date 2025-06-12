import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  BarChart3, 
  CreditCard, 
  Activity, 
  Settings, 
  Shield,
  Database,
  Zap,
  TrendingUp,
  Bell,
  Search,
  Download,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import UserManagementTable from '@/components/admin/UserManagementTable'
import SystemAnalytics from '@/components/admin/SystemAnalytics'
import SubscriptionManager from '@/components/billing/SubscriptionManager'
import SearchHistoryAnalytics from '@/components/search/SearchHistoryAnalytics'
import PerformanceMonitor from '@/components/monitoring/PerformanceMonitor'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface QuickStat {
  title: string
  value: string | number
  change: string
  icon: React.ElementType
  color: string
  trend: 'up' | 'down' | 'neutral'
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedUser, setSelectedUser] = useState(null)
  const { user } = useAuth()

  // Mock quick stats - in production, these would come from your analytics service
  const quickStats: QuickStat[] = [
    {
      title: 'Total Users',
      value: '2,847',
      change: '+12.5%',
      icon: Users,
      color: 'blue',
      trend: 'up',
    },
    {
      title: 'Monthly Revenue',
      value: '$18,430',
      change: '+23.1%',
      icon: CreditCard,
      color: 'green',
      trend: 'up',
    },
    {
      title: 'AI Searches',
      value: '156,293',
      change: '+8.7%',
      icon: Search,
      color: 'purple',
      trend: 'up',
    },
    {
      title: 'System Uptime',
      value: '99.97%',
      change: '-0.03%',
      icon: Activity,
      color: 'orange',
      trend: 'down',
    },
    {
      title: 'Avg Accuracy',
      value: '94.2%',
      change: '+2.1%',
      icon: TrendingUp,
      color: 'emerald',
      trend: 'up',
    },
    {
      title: 'Active Sessions',
      value: '1,234',
      change: '+5.4%',
      icon: Shield,
      color: 'indigo',
      trend: 'up',
    },
  ]

  const recentActivities = [
    {
      id: 1,
      type: 'user_signup',
      message: 'New user registered: john.doe@example.com',
      timestamp: '2 minutes ago',
      icon: Users,
      color: 'text-blue-400',
    },
    {
      id: 2,
      type: 'subscription',
      message: 'Pro plan subscription activated',
      timestamp: '5 minutes ago',
      icon: CreditCard,
      color: 'text-green-400',
    },
    {
      id: 3,
      type: 'alert',
      message: 'High CPU usage detected on AI node #3',
      timestamp: '12 minutes ago',
      icon: Bell,
      color: 'text-orange-400',
    },
    {
      id: 4,
      type: 'search',
      message: '1,000+ searches processed in the last hour',
      timestamp: '15 minutes ago',
      icon: Search,
      color: 'text-purple-400',
    },
    {
      id: 5,
      type: 'system',
      message: 'Database backup completed successfully',
      timestamp: '1 hour ago',
      icon: Database,
      color: 'text-emerald-400',
    },
  ]

  const handleUserSelect = (userData: any) => {
    setSelectedUser(userData)
    toast.success(`Selected user: ${userData.email}`)
  }

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'
  }

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">
              Welcome back, {user?.profile?.full_name || user?.email || 'Administrator'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-black/20 backdrop-blur-xl border-white/10 p-1">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-white/20">
              <Users className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-white/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="billing" className="text-white data-[state=active]:bg-white/20">
              <CreditCard className="w-4 h-4 mr-2" />
              Billing & Subscriptions
            </TabsTrigger>
            <TabsTrigger value="search-analytics" className="text-white data-[state=active]:bg-white/20">
              <Search className="w-4 h-4 mr-2" />
              Search Analytics
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-white data-[state=active]:bg-white/20">
              <Activity className="w-4 h-4 mr-2" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {quickStats.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm mb-1">{stat.title}</p>
                          <p className="text-2xl font-bold text-white">{stat.value}</p>
                          <div className="flex items-center mt-2">
                            <span className={`text-sm ${getTrendColor(stat.trend)}`}>
                              {getTrendIcon(stat.trend)} {stat.change}
                            </span>
                          </div>
                        </div>
                        <div className={`p-3 rounded-lg bg-${stat.color}-600/20`}>
                          <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <Card className="xl:col-span-2 bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-purple-400" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Latest system events and user activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="p-2 rounded-lg bg-white/10">
                          <activity.icon className={`w-4 h-4 ${activity.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{activity.message}</p>
                          <p className="text-gray-400 text-xs">{activity.timestamp}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    System Health
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Current system status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">API Gateway</span>
                      <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">AI Processing</span>
                      <Badge className="bg-orange-600/20 text-orange-300 border-orange-500/30">
                        Warning
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Database</span>
                      <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">File Storage</span>
                      <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Load Balancer</span>
                      <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                        Healthy
                      </Badge>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="pt-2">
                      <Button 
                        size="sm" 
                        className="w-full bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30"
                      >
                        View Detailed Status
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
                <CardDescription className="text-gray-400">
                  Common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 h-20 flex-col gap-2"
                    onClick={() => setActiveTab('users')}
                  >
                    <Users className="w-5 h-5" />
                    Manage Users
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 h-20 flex-col gap-2"
                    onClick={() => setActiveTab('analytics')}
                  >
                    <BarChart3 className="w-5 h-5" />
                    View Analytics
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 h-20 flex-col gap-2"
                    onClick={() => setActiveTab('billing')}
                  >
                    <CreditCard className="w-5 h-5" />
                    Billing
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 h-20 flex-col gap-2"
                    onClick={() => setActiveTab('performance')}
                  >
                    <Activity className="w-5 h-5" />
                    Performance
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 h-20 flex-col gap-2"
                  >
                    <Database className="w-5 h-5" />
                    Database
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 h-20 flex-col gap-2"
                  >
                    <Settings className="w-5 h-5" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <UserManagementTable onUserSelect={handleUserSelect} />
          </TabsContent>

          <TabsContent value="analytics">
            <SystemAnalytics />
          </TabsContent>

          <TabsContent value="billing">
            <SubscriptionManager />
          </TabsContent>

          <TabsContent value="search-analytics">
            <SearchHistoryAnalytics />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceMonitor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AdminDashboard 