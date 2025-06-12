import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  Calendar,
  Download,
  Filter,
  Eye,
  Star,
  Clock,
  TrendingUp,
  Target,
  Brain,
  Image as ImageIcon,
  MoreHorizontal,
  Share,
  Bookmark,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { db, supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format, subDays, isWithinInterval } from 'date-fns'

interface SearchRecord {
  id: string
  created_at: string
  image_url?: string
  image_name?: string
  predictions: any[]
  confidence_score: number
  processing_time: number
  ai_model_version?: string
  metadata?: any
}

interface SearchAnalytics {
  totalSearches: number
  averageAccuracy: number
  averageProcessingTime: number
  mostSearchedCategories: Array<{
    category: string
    count: number
    percentage: number
  }>
  dailyActivity: Array<{
    date: string
    searches: number
    avgAccuracy: number
  }>
  accuracyDistribution: Array<{
    range: string
    count: number
  }>
  modelUsage: Array<{
    model: string
    usage: number
    accuracy: number
  }>
}

const SearchHistoryAnalytics: React.FC = () => {
  const [searchHistory, setSearchHistory] = useState<SearchRecord[]>([])
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [confidenceFilter, setConfidenceFilter] = useState('all')
  const [selectedSearch, setSelectedSearch] = useState<SearchRecord | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('history')

  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchSearchHistory()
    }
  }, [user, dateFilter, confidenceFilter])

  const fetchSearchHistory = async () => {
    if (!user) return

    setLoading(true)
    try {
      let query = supabase
        .from('part_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Apply date filter
      if (dateFilter !== 'all') {
        const days = parseInt(dateFilter)
        const startDate = subDays(new Date(), days)
        query = query.gte('created_at', startDate.toISOString())
      }

      const { data: searches, error } = await query.limit(100)

      if (error) throw error

      let filteredSearches = searches || []

      // Apply confidence filter
      if (confidenceFilter !== 'all') {
        const [min, max] = confidenceFilter.split('-').map(Number)
        filteredSearches = filteredSearches.filter(search => {
          const confidence = search.confidence_score * 100
          return confidence >= min && confidence <= max
        })
      }

      setSearchHistory(filteredSearches)
      calculateAnalytics(filteredSearches)
    } catch (error) {
      console.error('Error fetching search history:', error)
      toast.error('Failed to fetch search history')
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = (searches: SearchRecord[]) => {
    if (searches.length === 0) {
      setAnalytics(null)
      return
    }

    const totalSearches = searches.length
    const averageAccuracy = searches.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / totalSearches * 100
    const averageProcessingTime = searches.reduce((sum, s) => sum + (s.processing_time || 0), 0) / totalSearches

    // Calculate daily activity
    const dailyActivity = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i)
      const daySearches = searches.filter(s => 
        format(new Date(s.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      )
      return {
        date: format(date, 'MMM dd'),
        searches: daySearches.length,
        avgAccuracy: daySearches.length > 0 
          ? daySearches.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / daySearches.length * 100
          : 0
      }
    })

    // Calculate category distribution (mock - would come from predictions analysis)
    const mostSearchedCategories = [
      { category: 'Engine Parts', count: Math.floor(totalSearches * 0.35), percentage: 35 },
      { category: 'Brake Components', count: Math.floor(totalSearches * 0.25), percentage: 25 },
      { category: 'Suspension', count: Math.floor(totalSearches * 0.20), percentage: 20 },
      { category: 'Electrical', count: Math.floor(totalSearches * 0.15), percentage: 15 },
      { category: 'Body Parts', count: Math.floor(totalSearches * 0.05), percentage: 5 },
    ]

    // Calculate accuracy distribution
    const accuracyDistribution = [
      { range: '90-100%', count: searches.filter(s => (s.confidence_score || 0) >= 0.9).length },
      { range: '80-89%', count: searches.filter(s => (s.confidence_score || 0) >= 0.8 && (s.confidence_score || 0) < 0.9).length },
      { range: '70-79%', count: searches.filter(s => (s.confidence_score || 0) >= 0.7 && (s.confidence_score || 0) < 0.8).length },
      { range: '60-69%', count: searches.filter(s => (s.confidence_score || 0) >= 0.6 && (s.confidence_score || 0) < 0.7).length },
      { range: '<60%', count: searches.filter(s => (s.confidence_score || 0) < 0.6).length },
    ]

    const modelUsage = [
      { model: 'PartNet-V3', usage: 78, accuracy: 94.2 },
      { model: 'VisionPart-Pro', usage: 15, accuracy: 91.8 },
      { model: 'AutoDetect-Advanced', usage: 7, accuracy: 88.5 },
    ]

    setAnalytics({
      totalSearches,
      averageAccuracy,
      averageProcessingTime,
      mostSearchedCategories,
      dailyActivity,
      accuracyDistribution,
      modelUsage,
    })
  }

  const filteredHistory = searchHistory.filter(search => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      search.image_name?.toLowerCase().includes(searchLower) ||
      search.predictions?.some((p: any) => 
        p.part_name?.toLowerCase().includes(searchLower) ||
        p.category?.toLowerCase().includes(searchLower)
      )
    )
  })

  const exportSearchHistory = () => {
    const csvContent = [
      ['Date', 'Image Name', 'Confidence', 'Processing Time', 'Top Prediction'].join(','),
      ...filteredHistory.map(search => [
        format(new Date(search.created_at), 'yyyy-MM-dd HH:mm:ss'),
        search.image_name || 'Unknown',
        `${((search.confidence_score || 0) * 100).toFixed(1)}%`,
        `${search.processing_time || 0}ms`,
        search.predictions?.[0]?.part_name || 'No prediction'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `search-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleSearchDetail = (search: SearchRecord) => {
    setSelectedSearch(search)
    setIsDetailDialogOpen(true)
  }

  const getConfidenceBadge = (confidence: number) => {
    const percentage = confidence * 100
    if (percentage >= 90) {
      return <Badge className="bg-green-600/20 text-green-300 border-green-500/30">Excellent</Badge>
    } else if (percentage >= 80) {
      return <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">Good</Badge>
    } else if (percentage >= 70) {
      return <Badge className="bg-orange-600/20 text-orange-300 border-orange-500/30">Fair</Badge>
    } else {
      return <Badge className="bg-red-600/20 text-red-300 border-red-500/30">Low</Badge>
    }
  }

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-black/20 backdrop-blur-xl border-white/10">
            <TabsTrigger value="history" className="text-white data-[state=active]:bg-white/20">
              Search History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-white/20">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-white data-[state=active]:bg-white/20">
              Insights
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <Button 
              onClick={exportSearchHistory}
              variant="outline" 
              size="sm"
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              onClick={fetchSearchHistory}
              variant="outline" 
              size="sm"
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="history" className="space-y-6">
          {/* Filters */}
          <Card className="bg-black/20 backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by image name or part type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                  />
                </div>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-40 bg-white/5 border-white/20 text-white">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                  <SelectTrigger className="w-40 bg-white/5 border-white/20 text-white">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Confidence</SelectItem>
                    <SelectItem value="90-100">90-100%</SelectItem>
                    <SelectItem value="80-89">80-89%</SelectItem>
                    <SelectItem value="70-79">70-79%</SelectItem>
                    <SelectItem value="0-69">Below 70%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Search History List */}
          <Card className="bg-black/20 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Search History ({filteredHistory.length})
              </CardTitle>
              <CardDescription className="text-gray-400">
                Your recent part identification searches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <AnimatePresence>
                  {filteredHistory.map((search, index) => (
                    <motion.div
                      key={search.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                      onClick={() => handleSearchDetail(search)}
                    >
                      <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                        {search.image_url ? (
                          <img 
                            src={search.image_url} 
                            alt={search.image_name || 'Search image'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium">
                            {search.image_name || 'Unnamed Image'}
                          </h4>
                          {getConfidenceBadge(search.confidence_score || 0)}
                        </div>
                        <p className="text-gray-400 text-sm mb-2">
                          {format(new Date(search.created_at), 'MMM dd, yyyy at HH:mm')}
                        </p>
                        {search.predictions?.[0] && (
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-purple-400" />
                            <span className="text-purple-300 text-sm">
                              {search.predictions[0].part_name || 'Unknown Part'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-white font-bold text-lg">
                          {((search.confidence_score || 0) * 100).toFixed(1)}%
                        </div>
                        <div className="text-gray-400 text-sm">
                          {search.processing_time || 0}ms
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-900/95 backdrop-blur-xl border-white/10" align="end">
                          <DropdownMenuItem className="text-gray-300 hover:text-white cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-gray-300 hover:text-white cursor-pointer">
                            <Bookmark className="mr-2 h-4 w-4" />
                            Bookmark
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-gray-300 hover:text-white cursor-pointer">
                            <Share className="mr-2 h-4 w-4" />
                            Share
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {filteredHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-2">No searches found</h3>
                    <p className="text-sm">Try adjusting your filters or upload some images to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Searches</p>
                        <p className="text-2xl font-bold text-white">{analytics.totalSearches}</p>
                      </div>
                      <Search className="w-8 h-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Avg. Accuracy</p>
                        <p className="text-2xl font-bold text-white">{analytics.averageAccuracy.toFixed(1)}%</p>
                      </div>
                      <Target className="w-8 h-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Avg. Speed</p>
                        <p className="text-2xl font-bold text-white">{analytics.averageProcessingTime.toFixed(0)}ms</p>
                      </div>
                      <Zap className="w-8 h-8 text-orange-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Success Rate</p>
                        <p className="text-2xl font-bold text-white">
                          {(analytics.accuracyDistribution.slice(0, 2).reduce((sum, item) => sum + item.count, 0) / analytics.totalSearches * 100).toFixed(1)}%
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Daily Activity</CardTitle>
                    <CardDescription className="text-gray-400">Searches over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analytics.dailyActivity}>
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
                          dataKey="searches" 
                          stroke="#8b5cf6" 
                          fill="#8b5cf6" 
                          fillOpacity={0.6} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Search Categories</CardTitle>
                    <CardDescription className="text-gray-400">Most searched part types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.mostSearchedCategories}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="count"
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                        >
                          {analytics.mostSearchedCategories.map((entry, index) => (
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
                    <CardTitle className="text-white">Accuracy Distribution</CardTitle>
                    <CardDescription className="text-gray-400">Search result quality</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.accuracyDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="range" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.8)', 
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px' 
                          }} 
                        />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">AI Model Performance</CardTitle>
                    <CardDescription className="text-gray-400">Model usage and accuracy</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.modelUsage.map((model, index) => (
                        <div key={model.model} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium">{model.model}</span>
                            <span className="text-gray-400">{model.accuracy}% accuracy</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full" 
                              style={{ width: `${model.usage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card className="bg-black/20 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription className="text-gray-400">
                Personalized recommendations based on your search patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Mock insights */}
                <div className="bg-purple-600/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-purple-300 font-medium mb-1">Search Pattern Trend</h4>
                      <p className="text-purple-200 text-sm">
                        You're searching for engine parts 35% more than average users. Consider upgrading to our Professional plan for better engine part recognition.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-blue-300 font-medium mb-1">Accuracy Improvement</h4>
                      <p className="text-blue-200 text-sm">
                        Your search accuracy has improved by 12% this month. Keep using high-quality, well-lit images for best results.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-600/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-green-300 font-medium mb-1">Speed Optimization</h4>
                      <p className="text-green-200 text-sm">
                        Your average processing time is 23% faster than last month. The new PartNet-V3 model is working well for your use case.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-600/10 border border-orange-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-orange-300 font-medium mb-1">Feature Recommendation</h4>
                      <p className="text-orange-200 text-sm">
                        Based on your search history, you might benefit from our batch processing feature for multiple similar parts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Search Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Detailed information about this part identification
            </DialogDescription>
          </DialogHeader>
          {selectedSearch && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="text-white font-medium mb-2">Search Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date:</span>
                      <span className="text-white">{format(new Date(selectedSearch.created_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Confidence:</span>
                      <span className="text-white">{((selectedSearch.confidence_score || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Processing Time:</span>
                      <span className="text-white">{selectedSearch.processing_time || 0}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">AI Model:</span>
                      <span className="text-white">{selectedSearch.ai_model_version || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="text-white font-medium mb-2">Predictions</h4>
                  <div className="space-y-2">
                    {selectedSearch.predictions?.slice(0, 3).map((prediction: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">{prediction.part_name || `Prediction ${index + 1}`}</span>
                        <span className="text-purple-400">{((prediction.confidence || 0) * 100).toFixed(1)}%</span>
                      </div>
                    )) || (
                      <p className="text-gray-400 text-sm">No predictions available</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedSearch.image_url && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="text-white font-medium mb-2">Image</h4>
                  <img 
                    src={selectedSearch.image_url} 
                    alt={selectedSearch.image_name || 'Search image'}
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SearchHistoryAnalytics 