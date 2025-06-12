import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { Progress } from '@/components/ui/progress'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  CheckCircle,
  Activity,
  Cpu,
  Database,
  Globe,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  Server,
  Monitor,
  AlertCircle,
  RefreshCw,
  Download,
  Settings,
  Shield,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, subHours } from 'date-fns'

interface SystemMetrics {
  uptime: number
  responseTime: number
  errorRate: number
  throughput: number
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  activeConnections: number
}

interface PerformanceData {
  timestamp: string
  responseTime: number
  throughput: number
  errorRate: number
  cpuUsage: number
  memoryUsage: number
}

interface AlertData {
  id: string
  level: 'info' | 'warning' | 'critical'
  message: string
  timestamp: string
  component: string
  resolved: boolean
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('1h')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchPerformanceData()
    const interval = autoRefresh ? setInterval(fetchPerformanceData, 30000) : null
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timeRange, autoRefresh])

  const fetchPerformanceData = async () => {
    setLoading(true)
    try {
      // Mock real-time data - in production, this would come from monitoring services
      const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168
      
      const mockMetrics: SystemMetrics = {
        uptime: 99.97,
        responseTime: 156 + Math.random() * 50,
        errorRate: 0.12 + Math.random() * 0.1,
        throughput: 847 + Math.random() * 200,
        cpuUsage: 45 + Math.random() * 20,
        memoryUsage: 62 + Math.random() * 15,
        diskUsage: 34 + Math.random() * 10,
        activeConnections: 127 + Math.floor(Math.random() * 50),
      }

      const mockPerformanceData: PerformanceData[] = Array.from({ length: Math.min(hours * 6, 100) }, (_, i) => {
        const timestamp = subHours(new Date(), (hours * 6 - 1 - i) / 6)
        return {
          timestamp: format(timestamp, 'HH:mm'),
          responseTime: 150 + Math.sin(i * 0.1) * 30 + Math.random() * 20,
          throughput: 800 + Math.cos(i * 0.15) * 150 + Math.random() * 100,
          errorRate: Math.max(0, 0.1 + Math.sin(i * 0.2) * 0.05 + Math.random() * 0.05),
          cpuUsage: 50 + Math.sin(i * 0.12) * 15 + Math.random() * 10,
          memoryUsage: 60 + Math.cos(i * 0.08) * 10 + Math.random() * 8,
        }
      })

      const mockAlerts: AlertData[] = [
        {
          id: '1',
          level: 'warning',
          message: 'Response time increased by 15% in the last hour',
          timestamp: format(subHours(new Date(), 0.5), 'HH:mm'),
          component: 'API Gateway',
          resolved: false,
        },
        {
          id: '2',
          level: 'info',
          message: 'Scheduled maintenance completed successfully',
          timestamp: format(subHours(new Date(), 2), 'HH:mm'),
          component: 'Database',
          resolved: true,
        },
        {
          id: '3',
          level: 'critical',
          message: 'High memory usage detected on AI processing node',
          timestamp: format(subHours(new Date(), 4), 'HH:mm'),
          component: 'AI Service',
          resolved: true,
        },
      ]

      setMetrics(mockMetrics)
      setPerformanceData(mockPerformanceData)
      setAlerts(mockAlerts)
    } catch (error) {
      console.error('Error fetching performance data:', error)
      toast.error('Failed to fetch performance data')
    } finally {
      setLoading(false)
    }
  }

  const getHealthStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return { status: 'good', color: 'text-green-400' }
    if (value <= thresholds.warning) return { status: 'warning', color: 'text-orange-400' }
    return { status: 'critical', color: 'text-red-400' }
  }

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />
      default:
        return <CheckCircle className="w-4 h-4 text-blue-400" />
    }
  }

  const getAlertBadge = (level: string) => {
    const config = {
      critical: 'bg-red-600/20 text-red-300 border-red-500/30',
      warning: 'bg-orange-600/20 text-orange-300 border-orange-500/30',
      info: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
    }
    return <Badge variant="outline" className={config[level as keyof typeof config]}>{level}</Badge>
  }

  const MetricCard = ({ title, value, unit, icon: Icon, trend, status }: any) => (
    <Card className="bg-black/20 backdrop-blur-xl border-white/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 mb-1">{title}</p>
            <p className={`text-2xl font-bold ${status?.color || 'text-white'}`}>
              {typeof value === 'number' ? value.toFixed(unit === '%' ? 1 : 0) : value}{unit}
            </p>
            {trend && (
              <div className="flex items-center mt-2">
                {trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
                )}
                <span className={`text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Math.abs(trend)}% from last hour
                </span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg bg-purple-600/20">
            <Icon className="w-6 h-6 text-purple-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Performance Monitor</h2>
          <p className="text-gray-400">Real-time system health and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-600 hover:bg-green-700" : "bg-white/5 border-white/20 text-white hover:bg-white/10"}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button 
            onClick={fetchPerformanceData}
            variant="outline" 
            size="sm"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-black/20 backdrop-blur-xl border-white/10">
          <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20">
            System Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="text-white data-[state=active]:bg-white/20">
            Performance Metrics
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-white data-[state=active]:bg-white/20">
            Alerts & Notifications
          </TabsTrigger>
          <TabsTrigger value="optimization" className="text-white data-[state=active]:bg-white/20">
            Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Health Overview */}
          {metrics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="System Uptime"
                  value={metrics.uptime}
                  unit="%"
                  icon={CheckCircle}
                  status={getHealthStatus(100 - metrics.uptime, { good: 0.1, warning: 1 })}
                />
                <MetricCard
                  title="Response Time"
                  value={metrics.responseTime}
                  unit="ms"
                  icon={Clock}
                  trend={-5.2}
                  status={getHealthStatus(metrics.responseTime, { good: 200, warning: 500 })}
                />
                <MetricCard
                  title="Error Rate"
                  value={metrics.errorRate}
                  unit="%"
                  icon={AlertTriangle}
                  status={getHealthStatus(metrics.errorRate, { good: 0.5, warning: 2 })}
                />
                <MetricCard
                  title="Throughput"
                  value={metrics.throughput}
                  unit=" req/min"
                  icon={Activity}
                  trend={12.8}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="CPU Usage"
                  value={metrics.cpuUsage}
                  unit="%"
                  icon={Cpu}
                  status={getHealthStatus(metrics.cpuUsage, { good: 70, warning: 85 })}
                />
                <MetricCard
                  title="Memory Usage"
                  value={metrics.memoryUsage}
                  unit="%"
                  icon={Database}
                  status={getHealthStatus(metrics.memoryUsage, { good: 75, warning: 90 })}
                />
                <MetricCard
                  title="Disk Usage"
                  value={metrics.diskUsage}
                  unit="%"
                  icon={Server}
                  status={getHealthStatus(metrics.diskUsage, { good: 80, warning: 95 })}
                />
                <MetricCard
                  title="Active Connections"
                  value={metrics.activeConnections}
                  unit=""
                  icon={Globe}
                />
              </div>

              {/* System Health Status */}
              <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    System Health Status
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Overall system health and component status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">API Gateway</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">Healthy</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">AI Processing Service</span>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-400" />
                          <span className="text-orange-400">Warning</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Database Cluster</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">Healthy</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Load Balancer</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">Healthy</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">File Storage</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">Healthy</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Monitoring Stack</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">Healthy</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Response Time Trend</CardTitle>
                <CardDescription className="text-gray-400">API response time over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="timestamp" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px' 
                      }} 
                    />
                    <ReferenceLine y={200} stroke="#f59e0b" strokeDasharray="3 3" />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Throughput Analysis</CardTitle>
                <CardDescription className="text-gray-400">Requests per minute</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="timestamp" stroke="#9ca3af" />
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
                      dataKey="throughput" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.6} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Error Rate Monitoring</CardTitle>
                <CardDescription className="text-gray-400">Error percentage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="timestamp" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px' 
                      }} 
                    />
                    <ReferenceLine y={1} stroke="#ef4444" strokeDasharray="3 3" />
                    <Line 
                      type="monotone" 
                      dataKey="errorRate" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Resource Utilization</CardTitle>
                <CardDescription className="text-gray-400">CPU and Memory usage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="timestamp" stroke="#9ca3af" />
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
                      dataKey="cpuUsage" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="CPU Usage"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memoryUsage" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Memory Usage"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card className="bg-black/20 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                System Alerts & Notifications
              </CardTitle>
              <CardDescription className="text-gray-400">
                Recent alerts and system notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border ${
                      alert.resolved ? 'bg-white/5 border-white/10 opacity-60' : 'bg-white/10 border-white/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.level)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getAlertBadge(alert.level)}
                          <span className="text-gray-400 text-sm">{alert.component}</span>
                          <span className="text-gray-500 text-sm">{alert.timestamp}</span>
                          {alert.resolved && (
                            <Badge variant="outline" className="bg-green-600/20 text-green-300 border-green-500/30">
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-white font-medium">{alert.message}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Card className="bg-black/20 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Performance Optimization Recommendations
              </CardTitle>
              <CardDescription className="text-gray-400">
                AI-powered suggestions to improve system performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-blue-300 font-medium mb-1">Scale AI Processing Nodes</h4>
                      <p className="text-blue-200 text-sm mb-3">
                        Response times could be improved by 25% by adding 2 more AI processing nodes during peak hours (9 AM - 6 PM).
                      </p>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Implement Auto-scaling
                        </Button>
                        <span className="text-blue-300 text-sm">Est. cost: $180/month</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-600/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Database className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-green-300 font-medium mb-1">Optimize Database Queries</h4>
                      <p className="text-green-200 text-sm mb-3">
                        Several slow queries detected. Optimizing indexes could reduce database response time by 40%.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Run Query Optimizer
                        </Button>
                        <span className="text-green-300 text-sm">Est. improvement: 40ms average</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-600/10 border border-orange-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Monitor className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-orange-300 font-medium mb-1">Implement CDN Caching</h4>
                      <p className="text-orange-200 text-sm mb-3">
                        Static assets (images, CSS, JS) are not cached. Implementing CDN could reduce load times by 60%.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                          Configure CDN
                        </Button>
                        <span className="text-orange-300 text-sm">Est. cost: $50/month</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-600/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-purple-300 font-medium mb-1">Memory Usage Optimization</h4>
                      <p className="text-purple-200 text-sm mb-3">
                        AI model caching is consuming 78% of available memory. Consider implementing smart cache eviction.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          Optimize Memory Usage
                        </Button>
                        <span className="text-purple-300 text-sm">Est. memory reduction: 30%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PerformanceMonitor 