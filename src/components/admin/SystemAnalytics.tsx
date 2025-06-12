import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Users,
  Activity,
  TrendingUp,
  Database,
  Cpu,
  Zap,
  Eye,
  Brain,
  Target,
  Clock,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Globe,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format, subDays, startOfDay } from 'date-fns'

interface UserActivityData {
  date: string
  newUsers: number
  activeUsers: number
  searches: number
}

interface AIPerformanceData {
  date: string
  accuracy: number
  processingTime: number
  requests: number
}

interface AnalyticsData {
  overview: {
    totalUsers: number
    activeUsers: number
    totalSearches: number
    averageAccuracy: number
    totalRevenue: number
    monthlyGrowth: number
  }
  userActivity: UserActivityData[]
  aiPerformance: AIPerformanceData[]
  searchCategories: Array<{
    category: string
    count: number
    percentage: number
  }>
  modelPerformance: Array<{
    model: string
    accuracy: number
    speed: number
    usage: number
  }>
  geographicData: Array<{
    country: string
    users: number
    searches: number
  }>
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: number
  color?: string
}

const SystemAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedMetric, setSelectedMetric] = useState('users')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Calculate date range
      const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      const startDate = startOfDay(subDays(new Date(), days))

      // Fetch user analytics
      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at, role')
        .gte('created_at', startDate.toISOString())

      // Fetch search analytics
      const { data: searches } = await supabase
        .from('part_searches')
        .select('created_at, confidence_score, processing_time, predictions')
        .gte('created_at', startDate.toISOString())

      // Process the data (mock implementation - in real app would come from analytics service)
      const mockAnalytics: AnalyticsData = {
        overview: {
          totalUsers: profiles?.length || 156,
          activeUsers: Math.floor((profiles?.length || 156) * 0.68),
          totalSearches: searches?.length || 2847,
          averageAccuracy: 94.2,
          totalRevenue: 8750,
          monthlyGrowth: 23.5,
        },
        userActivity: generateUserActivityData(days),
        aiPerformance: generateAIPerformanceData(days),
        searchCategories: [
          { category: 'Engine Parts', count: 456, percentage: 32.1 },
          { category: 'Brake Components', count: 398, percentage: 28.0 },
          { category: 'Suspension', count: 234, percentage: 16.5 },
          { category: 'Electrical', count: 189, percentage: 13.3 },
          { category: 'Body Parts', count: 145, percentage: 10.1 },
        ],
        modelPerformance: [
          { model: 'PartNet-V3', accuracy: 96.4, speed: 1.2, usage: 78 },
          { model: 'VisionPart-Pro', accuracy: 94.8, speed: 0.9, usage: 15 },
          { model: 'AutoDetect-Advanced', accuracy: 91.2, speed: 2.1, usage: 7 },
        ],
        geographicData: [
          { country: 'United States', users: 67, searches: 1456 },
          { country: 'United Kingdom', users: 43, searches: 982 },
          { country: 'Germany', users: 28, searches: 645 },
          { country: 'Canada', users: 18, searches: 432 },
        ],
      }

      setAnalytics(mockAnalytics)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to fetch analytics data')
    } finally {
      setLoading(false)
    }
  }

  const generateUserActivityData = (days: number): UserActivityData[] => {
    return Array.from({ length: days }, (_, i) => {
      const date = format(subDays(new Date(), days - 1 - i), 'MMM dd')
      return {
        date,
        newUsers: Math.floor(Math.random() * 20) + 5,
        activeUsers: Math.floor(Math.random() * 50) + 20,
        searches: Math.floor(Math.random() * 100) + 50,
      }
    })
  }

  const generateAIPerformanceData = (days: number): AIPerformanceData[] => {
    return Array.from({ length: days }, (_, i) => {
      const date = format(subDays(new Date(), days - 1 - i), 'MMM dd')
      return {
        date,
        accuracy: 92 + Math.random() * 6,
        processingTime: 1000 + Math.random() * 500,
        requests: Math.floor(Math.random() * 200) + 100,
      }
    })
  }

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

  const MetricCard: React.FC<MetricCardProps> = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    color = 'purple' 
  }) => (
    <Card className="bg-black/20 backdrop-blur-xl border-white/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-${color}-600/20`}>
            <Icon className={`w-6 h-6 text-${color}-400`} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center mt-4">
            <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
            <span className="text-sm text-green-400">+{trend}% from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Analytics</h2>
          <p className="text-gray-400">Monitor system performance, user activity, and AI metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={fetchAnalytics}
            variant="outline" 
            size="sm"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Total Users"
          value={analytics.overview.totalUsers.toLocaleString()}
          icon={Users}
          trend={analytics.overview.monthlyGrowth}
          color="blue"
        />
        <MetricCard
          title="Active Users"
          value={analytics.overview.activeUsers.toLocaleString()}
          subtitle={`${Math.round((analytics.overview.activeUsers / analytics.overview.totalUsers) * 100)}% of total`}
          icon={Activity}
          color="green"
        />
        <MetricCard
          title="Total Searches"
          value={analytics.overview.totalSearches.toLocaleString()}
          icon={Eye}
          color="purple"
        />
        <MetricCard
          title="AI Accuracy"
          value={`${analytics.overview.averageAccuracy}%`}
          icon={Brain}
          color="orange"
        />
        <MetricCard
          title="Revenue"
          value={`$${analytics.overview.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={18.2}
          color="emerald"
        />
        <MetricCard
          title="System Health"
          value="99.9%"
          subtitle="Uptime"
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Main Charts */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-6">
        <TabsList className="bg-black/20 backdrop-blur-xl border-white/10">
          <TabsTrigger value="users" className="text-white data-[state=active]:bg-white/20">
            User Activity
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-white data-[state=active]:bg-white/20">
            AI Performance
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-white data-[state=active]:bg-white/20">
            Search Categories
          </TabsTrigger>
          <TabsTrigger value="models" className="text-white data-[state=active]:bg-white/20">
            Model Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">User Growth</CardTitle>
                <CardDescription className="text-gray-400">New users and activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.userActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px' 
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="newUsers" 
                      stackId="1" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.6} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="activeUsers" 
                      stackId="1" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Search Volume</CardTitle>
                <CardDescription className="text-gray-400">Daily search requests</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.userActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px' 
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="searches" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">AI Accuracy Trend</CardTitle>
                <CardDescription className="text-gray-400">Model accuracy over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.aiPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis domain={[90, 100]} stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px' 
                      }} 
                    />
                    <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="3 3" />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Processing Time</CardTitle>
                <CardDescription className="text-gray-400">Average response time (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.aiPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px' 
                      }} 
                    />
                    <Bar dataKey="processingTime" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Search Categories</CardTitle>
                <CardDescription className="text-gray-400">Distribution of part categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.searchCategories}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="count"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {analytics.searchCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px' 
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Category Details</CardTitle>
                <CardDescription className="text-gray-400">Detailed breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.searchCategories.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-white font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">{category.count}</div>
                        <div className="text-gray-400 text-sm">{category.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <Card className="bg-black/20 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Model Performance Comparison</CardTitle>
              <CardDescription className="text-gray-400">Accuracy, speed, and usage statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analytics.modelPerformance.map((model, index) => (
                  <motion.div
                    key={model.model}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-semibold">{model.model}</h4>
                      <Badge variant="outline" className="bg-purple-600/20 text-purple-300 border-purple-500/30">
                        {model.usage}% usage
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Accuracy</p>
                        <p className="text-white font-bold text-lg">{model.accuracy}%</p>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${model.accuracy}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Speed</p>
                        <p className="text-white font-bold text-lg">{model.speed}s</p>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${Math.max(0, 100 - (model.speed * 30))}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Usage</p>
                        <p className="text-white font-bold text-lg">{model.usage}%</p>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                          <div 
                            className="bg-purple-500 h-2 rounded-full" 
                            style={{ width: `${model.usage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SystemAnalytics 