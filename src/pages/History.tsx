import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Menu
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileSidebar from '@/components/MobileSidebar';

const History = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'all', label: 'All', icon: HistoryIcon, count: 247 },
    { id: 'completed', label: 'Completed', icon: CheckCircle, count: 239 },
    { id: 'processing', label: 'Processing', icon: Clock, count: 3 },
    { id: 'failed', label: 'Failed', icon: XCircle, count: 5 }
  ];

  const uploadHistory = [
    {
      id: 1,
      partName: 'Brake Pad Set - Front',
      partNumber: 'BP-2134-F',
      uploadDate: '2024-01-15',
      date: '2024-01-15',
      status: 'completed',
      confidence: 96.5,
      category: 'Braking System',
      manufacturer: 'Bosch',
      processingTime: '0.2s',
      image: '/placeholder.svg'
    },
    {
      id: 2,
      partName: 'Air Filter Element',
      partNumber: 'AF-8901-STD',
      uploadDate: '2024-01-14',
      date: '2024-01-14',
      status: 'completed',
      confidence: 94.2,
      category: 'Engine',
      manufacturer: 'OEM',
      processingTime: '0.3s',
      image: '/placeholder.svg'
    },
    {
      id: 3,
      partName: 'Spark Plug Set',
      partNumber: 'SP-4567-V6',
      uploadDate: '2024-01-13',
      date: '2024-01-13',
      status: 'processing',
      confidence: 85.0,
      category: 'Ignition',
      manufacturer: 'NGK',
      processingTime: '--',
      image: '/placeholder.svg'
    },
    {
      id: 4,
      partName: 'Oil Filter',
      partNumber: 'OF-3456-HD',
      uploadDate: '2024-01-12',
      date: '2024-01-12',
      status: 'completed',
      confidence: 98.1,
      category: 'Engine',
      manufacturer: 'Fram',
      processingTime: '0.1s',
      image: '/placeholder.svg'
    },
    {
      id: 5,
      partName: 'Transmission Filter',
      partNumber: 'TF-7890-AT',
      uploadDate: '2024-01-11',
      date: '2024-01-11',
      status: 'failed',
      confidence: 45.0,
      category: 'Transmission',
      manufacturer: 'Unknown',
      processingTime: '0.5s',
      image: '/placeholder.svg'
    },
    {
      id: 6,
      partName: 'Fuel Pump Assembly',
      partNumber: 'FP-9876-EFI',
      uploadDate: '2024-01-10',
      date: '2024-01-10',
      status: 'completed',
      confidence: 95.7,
      category: 'Fuel System',
      manufacturer: 'Delphi',
      processingTime: '0.4s',
      image: '/placeholder.svg'
    }
  ];

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

  const stats = {
    totalUploads: uploadHistory.length,
    completed: uploadHistory.filter(item => item.status === 'completed').length,
    avgConfidence: (uploadHistory.filter(item => item.confidence).reduce((sum, item) => sum + (item.confidence || 0), 0) / uploadHistory.filter(item => item.confidence).length).toFixed(1),
    avgProcessingTime: '0.3s'
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
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 h-12 px-6">
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
              { label: 'Total Uploads', value: '247', icon: Database, color: 'from-blue-600 to-cyan-600' },
              { label: 'Completed', value: '239', icon: HistoryIcon, color: 'from-green-600 to-emerald-600' },
              { label: 'Avg Confidence', value: '94.8%', icon: TrendingUp, color: 'from-purple-600 to-violet-600' },
              { label: 'Avg Time', value: '2.3s', icon: Clock, color: 'from-orange-600 to-red-600' }
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
                {filteredHistory.length > 0 ? (
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
                              >
                                <Eye className="w-4 h-4 text-blue-400" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 lg:p-3 hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <Download className="w-4 h-4 text-green-400" />
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
