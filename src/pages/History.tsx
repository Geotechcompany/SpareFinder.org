import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { apiClient } from '@/lib/api';
import { 
  History as HistoryIcon, 
  Search, 
  Download, 
  Eye, 
  Calendar, 
  Filter, 
  Clock, 
  TrendingUp, 
  Database, 
  Sparkles,
  Cog,
  Building,
  Tag,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Upload,
  Menu,
  Loader2,
  Trash2
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileSidebar from '@/components/MobileSidebar';

const History = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const { toast } = useToast();

  const tabs = [
    { id: 'all', label: 'All', icon: HistoryIcon, count: pagination.total },
    { id: 'completed', label: 'Completed', icon: CheckCircle, count: uploadHistory.filter(item => item.status === 'completed').length },
    { id: 'processing', label: 'Processing', icon: Clock, count: uploadHistory.filter(item => item.status === 'processing').length },
    { id: 'failed', label: 'Failed', icon: XCircle, count: uploadHistory.filter(item => item.status === 'failed').length }
  ];

  useEffect(() => {
    fetchUploadHistory();
  }, [pagination.page, activeTab, searchTerm]);

  const fetchUploadHistory = async () => {
    try {
      setIsLoading(true);
      const filters = {
        search: searchTerm || undefined,
        status: activeTab !== 'all' ? activeTab : undefined
      };

      const response = await apiClient.history.getUploads(pagination.page, pagination.limit, filters);
      
      if (response.success && response.data) {
        const mappedHistory = response.data.uploads.map(upload => ({
          id: upload.id,
          partName: upload.image_name || 'Unknown Part',
          partNumber: `PN-${upload.id.slice(-8)}`,
          uploadDate: upload.created_at,
          date: upload.created_at,
          status: upload.confidence_score > 0.5 ? 'completed' : 'failed',
          confidence: upload.confidence_score ? Math.round(upload.confidence_score * 100) : 0,
          category: upload.predictions?.[0]?.category || 'Unknown',
          manufacturer: upload.predictions?.[0]?.manufacturer || 'Unknown',
          processingTime: upload.processing_time ? `${upload.processing_time}s` : '--',
          image: upload.image_url || '/placeholder.svg'
        }));
        
        setUploadHistory(mappedHistory);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        }));
      }
    } catch (error) {
      console.error('Error fetching upload history:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load upload history. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportHistory = async () => {
    try {
      const response = await apiClient.history.exportHistory('csv');
      if (response.success) {
        toast({
          title: "Success",
          description: "History exported successfully!"
        });
      }
    } catch (error) {
      console.error('Error exporting history:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export history. Please try again."
      });
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    try {
      const response = await apiClient.history.deleteUpload(uploadId);
      if (response.success) {
        toast({
          title: "Success",
          description: "Upload deleted successfully!"
        });
        fetchUploadHistory(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting upload:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete upload. Please try again."
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600/20 text-green-400 border-green-500/30';
      case 'processing':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30';
      case 'failed':
        return 'bg-red-600/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const filteredHistory = uploadHistory.filter(item => {
    const matchesSearch = item.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || item.status === selectedFilter;
    const matchesTab = activeTab === 'all' || item.status === activeTab;
    return matchesSearch && matchesFilter && matchesTab;
  });

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const [stats, setStats] = useState({
    totalUploads: 0,
    completed: 0,
    avgConfidence: '0.0',
    avgProcessingTime: '0.0s'
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await apiClient.getDashboardStats();
      if (response.success && response.data) {
        const data = response.data;
        setStats({
          totalUploads: data.totalUploads || 0,
          completed: data.successfulUploads || 0,
          avgConfidence: (data.avgConfidence || 0).toFixed(1),
          avgProcessingTime: `${data.avgProcessTime || 0}s`
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -left-40 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl opacity-60"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-40 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl opacity-40"
          animate={{
            scale: [1.1, 1, 1.1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <DashboardSidebar isCollapsed={isCollapsed} onToggle={handleToggleSidebar} />
      
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
          marginLeft: isCollapsed 
            ? 'var(--collapsed-sidebar-width, 80px)' 
            : 'var(--expanded-sidebar-width, 320px)',
          width: isCollapsed
            ? 'calc(100% - var(--collapsed-sidebar-width, 80px))'
            : 'calc(100% - var(--expanded-sidebar-width, 320px))'
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 lg:space-y-8"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full border border-purple-500/30 backdrop-blur-xl mb-4"
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </motion.div>
                    <span className="text-purple-300 text-sm font-semibold">Upload History</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Part Identification History
                  </motion.h1>
                  <motion.p 
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    View and manage your part identification history
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={handleExportHistory}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 h-12 px-6"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export History
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
          >
            {[
              { label: 'Total Uploads', value: stats.totalUploads.toString(), icon: Database, color: 'from-blue-600 to-cyan-600' },
              { label: 'Completed', value: stats.completed.toString(), icon: HistoryIcon, color: 'from-green-600 to-emerald-600' },
              { label: 'Avg Confidence', value: `${stats.avgConfidence}%`, icon: TrendingUp, color: 'from-purple-600 to-violet-600' },
              { label: 'Avg Time', value: stats.avgProcessingTime, icon: Clock, color: 'from-orange-600 to-red-600' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-10 rounded-2xl blur-xl`} />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-xs lg:text-sm">{stat.label}</p>
                        <p className="text-xl lg:text-2xl font-bold text-white">{stat.value}</p>
                      </div>
                      <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-purple-400" />
                  <span>Search & Filter</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-4 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by part name, number, or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20"
                    />
                  </div>
                  
                  {/* Filter Tabs */}
                  <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                      <motion.button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative px-4 py-3 rounded-xl transition-all duration-300 whitespace-nowrap text-sm ${
                          activeTab === tab.id
                            ? 'text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {activeTab === tab.id && (
                          <motion.div
                            layoutId="activeHistoryTab"
                            className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-blue-600/20 rounded-xl border border-purple-500/30 backdrop-blur-xl"
                            initial={false}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        <div className="relative z-10 flex items-center space-x-2">
                          <tab.icon className="w-4 h-4" />
                          <span className="font-medium">{tab.label}</span>
                          <Badge className="bg-white/10 text-gray-300 text-xs px-2 py-0.5">
                            {tab.count}
                          </Badge>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* History List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-600/5 to-slate-600/5 rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <HistoryIcon className="w-5 h-5 text-blue-400" />
                    <span>Upload History</span>
                  </div>
                  <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                    {filteredHistory.length} entries
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-400 text-lg">Loading upload history...</p>
                  </div>
                ) : filteredHistory.length > 0 ? (
                  <div className="space-y-4">
                    {filteredHistory.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1 + index * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                        className="p-4 lg:p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          {/* Part Icon and Basic Info */}
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25 flex-shrink-0">
                              <Cog className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white text-lg mb-1 truncate">{item.partName}</h3>
                              <div className="flex flex-wrap gap-2 lg:gap-4 text-sm text-gray-400">
                                <span className="flex items-center">
                                  <Building className="w-3 h-3 mr-1" />
                                  {item.manufacturer}
                                </span>
                                <span className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {item.processingTime}
                                </span>
                                <span className="flex items-center">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {item.category}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status and Confidence */}
                          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
                              {/* Confidence Score */}
                              <div className="text-center lg:text-right">
                                <div className="text-2xl font-bold text-green-400">{item.confidence}%</div>
                                <div className="text-gray-400 text-xs">Confidence</div>
                              </div>
                              
                              {/* Status Badge */}
                              <Badge className={`${getStatusColor(item.status)} font-medium whitespace-nowrap`}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(item.status)}
                                  <span className="capitalize">{item.status}</span>
                                </div>
                              </Badge>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 lg:p-3 hover:bg-white/10 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4 text-blue-400" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 lg:p-3 hover:bg-white/10 rounded-lg transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4 text-green-400" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteUpload(item.id)}
                                className="p-2 lg:p-3 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </motion.button>
                            </div>
                          </div>
                        </div>

                        {/* Mobile-specific additional info */}
                        <div className="lg:hidden mt-4 pt-4 border-t border-white/10">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Uploaded:</span>
                              <p className="text-white font-medium">{item.date}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Part Number:</span>
                              <p className="text-white font-medium">{item.partNumber}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    </motion.div>
                    <p className="text-gray-400 text-lg">No upload history found</p>
                    <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
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
