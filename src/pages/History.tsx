import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
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
  Menu,
  Trash2
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileSidebar from '@/components/MobileSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { dashboardApi, tokenStorage } from '@/lib/api';

const History = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState({
    totalUploads: 0,
    completed: 0,
    avgConfidence: '0.0',
    avgProcessingTime: '0s'
  });

  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to prevent multiple simultaneous requests
  const isInitializedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stable token validation function
  const hasValidToken = useCallback(() => {
    const token = tokenStorage.getToken();
    return !!token && isAuthenticated && !!user?.id;
  }, [isAuthenticated, user?.id]);

  // Single comprehensive data fetch function
  const fetchAllData = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isFetchingRef.current || !hasValidToken()) {
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      console.log('🔄 Starting comprehensive data fetch for user:', user?.id);

      // Fetch uploads and stats in parallel (but controlled)
      const [uploadsResponse, statsResponse] = await Promise.allSettled([
        dashboardApi.getRecentUploads().catch(err => {
          if (signal.aborted) throw new Error('Request aborted');
          throw err;
        }),
        dashboardApi.getStats().catch(err => {
          if (signal.aborted) throw new Error('Request aborted');
          throw err;
        })
      ]);

      // Handle uploads response
      if (uploadsResponse.status === 'fulfilled' && uploadsResponse.value.success) {
        const uploadsData = uploadsResponse.value.data?.uploads || [];
        setUploads(uploadsData.map(upload => ({
          id: upload.id,
          name: upload.image_name,
          date: format(new Date(upload.created_at), 'PPp'),
          confidence: Math.round(upload.confidence_score * 100)
        })));
      } else {
        console.warn('❌ Failed to fetch uploads:', uploadsResponse);
        setUploads([]);
      }

      // Handle stats response
      if (statsResponse.status === 'fulfilled' && statsResponse.value.success) {
        const data = statsResponse.value.data;
        setStats({
          totalUploads: data.totalUploads || 0,
          completed: data.successfulUploads || 0,
          avgConfidence: (data.avgConfidence || 0).toFixed(1),
          avgProcessingTime: `${data.avgProcessTime || 0}s`
        });
      } else {
        console.warn('❌ Failed to fetch dashboard stats:', statsResponse);
        setStats({
          totalUploads: 0,
          completed: 0,
          avgConfidence: '0.0',
          avgProcessingTime: '0s'
        });
      }

      // Check if any request failed with auth error
      const authErrors = [uploadsResponse, statsResponse].filter(
        response => response.status === 'rejected' && 
        response.reason?.response?.status === 401
      );

      if (authErrors.length > 0) {
        console.log('🔒 Authentication errors detected, logging out...');
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive'
        });
        await logout();
        return;
      }

      console.log('✅ Data fetch completed successfully');

    } catch (error: any) {
      if (error.message === 'Request aborted') {
        console.log('🔄 Request was aborted');
        return;
      }

      console.error('❌ Error in fetchAllData:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        console.log('🔒 Authentication error, logging out...');
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive'
        });
        await logout();
        return;
      }

      // Handle other errors
      setError(error.message || 'Failed to load data');
      toast({
        title: 'Error',
        description: error.message || 'Failed to load history data',
        variant: 'destructive'
      });
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [hasValidToken, user?.id, toast, logout]);

  // Export history function
  const handleExportHistory = async () => {
    try {
      if (!hasValidToken()) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to export history',
          variant: 'destructive'
        });
        return;
      }

      const response = await dashboardApi.exportHistory('csv');
      if (response.success) {
        toast({
          title: 'Export Successful',
          description: 'History exported successfully',
        });
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Unable to export history',
        variant: 'destructive'
      });
    }
  };

  // Delete upload function
  const handleDeleteUpload = async (uploadId: string) => {
    try {
      if (!hasValidToken()) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to delete uploads',
          variant: 'destructive'
        });
        return;
      }

      const response = await dashboardApi.deleteUpload(uploadId);
      if (response.success) {
        toast({
          title: 'Upload Deleted',
          description: 'Upload successfully removed',
        });
        // Refresh data
        fetchAllData();
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Deletion Failed',
        description: 'Unable to delete upload',
        variant: 'destructive'
      });
    }
  };

  // Initialize data fetch - only run once when component mounts and user is authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.id && !isInitializedRef.current) {
      console.log('📊 Initializing History data fetch for user:', user.id);
      isInitializedRef.current = true;
      fetchAllData();
    }

    // Reset initialization flag when user changes
    if (!isAuthenticated || !user?.id) {
      isInitializedRef.current = false;
      setUploads([]);
      setStats({
        totalUploads: 0,
        completed: 0,
        avgConfidence: '0.0',
        avgProcessingTime: '0s'
      });
      setError(null);
    }
  }, [isAuthenticated, user?.id, authLoading, fetchAllData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <DashboardSidebar isCollapsed={isCollapsed} onToggle={handleToggleSidebar} />
        </div>
        
        {/* Mobile Sidebar */}
        <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        
        <motion.div
          initial={false}
          animate={{ marginLeft: window.innerWidth >= 768 ? (isCollapsed ? 80 : 320) : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-1 p-3 md:p-4 lg:p-8 relative z-10"
        >
          <div className="space-y-4 md:space-y-6">
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-white text-sm md:text-base">Loading history...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show error state
  if (error && !isLoading) {
    return (
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <DashboardSidebar isCollapsed={isCollapsed} onToggle={handleToggleSidebar} />
        </div>
        
        {/* Mobile Sidebar */}
        <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        
        <motion.div
          initial={false}
          animate={{ marginLeft: window.innerWidth >= 768 ? (isCollapsed ? 80 : 320) : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-1 p-3 md:p-4 lg:p-8 relative z-10"
        >
          <div className="space-y-4 md:space-y-6">
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardContent className="p-4 md:p-6">
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 md:w-12 md:h-12 text-red-500 mx-auto mb-3 md:mb-4" />
                  <h3 className="text-white text-base md:text-lg font-semibold mb-2">Error Loading History</h3>
                  <p className="text-gray-400 text-sm md:text-base mb-3 md:mb-4">{error}</p>
                  <Button onClick={fetchAllData} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-20 md:-top-40 -left-20 md:-left-40 w-40 h-40 md:w-80 md:h-80 bg-purple-600/30 rounded-full blur-3xl opacity-70"
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
          className="absolute top-1/2 -right-20 md:-right-40 w-48 h-48 md:w-96 md:h-96 bg-blue-600/20 rounded-full blur-3xl opacity-60"
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

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <DashboardSidebar isCollapsed={isCollapsed} onToggle={handleToggleSidebar} />
      </div>
      
      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Mobile Menu Button */}
      <button 
        onClick={handleToggleMobileMenu}
        className="fixed top-3 right-3 z-50 p-2 md:p-3 rounded-lg bg-black/20 backdrop-blur-xl border border-white/10 md:hidden"
      >
        <Menu className="w-4 h-4 md:w-5 md:h-5 text-white" />
      </button>

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={{ marginLeft: window.innerWidth >= 768 ? (isCollapsed ? 80 : 320) : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-3 md:p-4 lg:p-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 md:space-y-6 lg:space-y-8"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-2xl md:rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-6 border border-white/10">
              <div className="flex flex-col gap-3 md:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <motion.h1 
                      className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-2 md:mb-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Upload History
                    </motion.h1>
                    <motion.p 
                      className="text-gray-400 text-sm md:text-base lg:text-lg"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Track your part identification results and performance
                    </motion.p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex-shrink-0"
                  >
                    <Button 
                      onClick={handleExportHistory}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 text-sm md:text-base"
                      size="sm"
                    >
                      <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      Export History
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
            {[
              { 
                title: 'Total Uploads', 
                value: stats.totalUploads.toString(), 
                icon: FileText, 
                color: 'from-purple-600 to-blue-600',
                bgColor: 'from-purple-600/20 to-blue-600/20'
              },
              { 
                title: 'Completed', 
                value: stats.completed.toString(), 
                icon: CheckCircle, 
                color: 'from-green-600 to-emerald-600',
                bgColor: 'from-green-600/20 to-emerald-600/20'
              },
              { 
                title: 'Avg Confidence', 
                value: `${stats.avgConfidence}%`, 
                icon: TrendingUp, 
                color: 'from-blue-600 to-cyan-600',
                bgColor: 'from-blue-600/20 to-cyan-600/20'
              },
              { 
                title: 'Avg Processing', 
                value: stats.avgProcessingTime, 
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
                whileHover={{ y: -2, scale: 1.02 }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.bgColor} rounded-xl md:rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity`} />
                <Card className="relative bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardContent className="p-3 md:p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-400 text-xs md:text-sm font-medium truncate">{stat.title}</p>
                        <p className="text-lg md:text-xl lg:text-2xl font-bold text-white mt-1 truncate">{stat.value}</p>
                      </div>
                      <div className={`p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-r ${stat.color} shadow-lg flex-shrink-0`}>
                        <stat.icon className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Recent Uploads */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-2xl md:rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-white flex items-center space-x-2 text-base md:text-lg">
                  <Activity className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                  <span>Recent Uploads</span>
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs md:text-sm">
                  Your latest part identification results
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {uploads.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <FileText className="w-8 h-8 md:w-12 md:h-12 text-gray-600 mx-auto mb-3 md:mb-4" />
                    <p className="text-gray-400 text-sm md:text-base">No uploads found</p>
                    <p className="text-gray-500 text-xs md:text-sm mt-2">Start by uploading your first part image</p>
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    {uploads.map((upload, index) => (
                      <motion.div
                        key={upload.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        className="flex items-center justify-between p-3 md:p-4 rounded-lg md:rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                      >
                        <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                          <div className="p-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg flex-shrink-0">
                            <FileText className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm md:text-base truncate">{upload.name}</p>
                            <p className="text-gray-400 text-xs md:text-sm truncate">{upload.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
                          <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-500/30 text-xs md:text-sm">
                            {upload.confidence}%
                          </Badge>
                          <div className="flex space-x-1 md:space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-400 hover:text-blue-300 p-1 md:p-2"
                            >
                              <Eye className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUpload(upload.id)}
                              className="text-red-400 hover:text-red-300 p-1 md:p-2"
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default History;
