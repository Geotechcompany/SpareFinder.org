
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { History as HistoryIcon, Search, Download, Eye, Calendar, Filter } from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

const History = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const uploadHistory = [
    {
      id: 1,
      partName: 'Brake Pad Set - Front',
      partNumber: 'BP-2134-F',
      uploadDate: '2024-01-15',
      status: 'completed',
      confidence: 96.5,
      category: 'Braking System',
      image: '/placeholder.svg'
    },
    {
      id: 2,
      partName: 'Air Filter Element',
      partNumber: 'AF-8901-STD',
      uploadDate: '2024-01-14',
      status: 'completed',
      confidence: 94.2,
      category: 'Engine',
      image: '/placeholder.svg'
    },
    {
      id: 3,
      partName: 'Spark Plug Set',
      partNumber: 'SP-4567-V6',
      uploadDate: '2024-01-13',
      status: 'processing',
      confidence: null,
      category: 'Ignition',
      image: '/placeholder.svg'
    },
    {
      id: 4,
      partName: 'Oil Filter',
      partNumber: 'OF-3456-HD',
      uploadDate: '2024-01-12',
      status: 'completed',
      confidence: 98.1,
      category: 'Engine',
      image: '/placeholder.svg'
    },
    {
      id: 5,
      partName: 'Transmission Filter',
      partNumber: 'TF-7890-AT',
      uploadDate: '2024-01-11',
      status: 'failed',
      confidence: null,
      category: 'Transmission',
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

  const filteredHistory = uploadHistory.filter(item => {
    const matchesSearch = item.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || item.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <DashboardSidebar />
        
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-800 px-4">
            <SidebarTrigger className="-ml-1 text-gray-300 hover:text-white hover:bg-gray-800" />
            <div className="ml-auto">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
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
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center space-x-3">
                  <HistoryIcon className="w-8 h-8" />
                  <span>Upload History</span>
                </h1>
                <p className="text-gray-400">View and manage your part identification history</p>
              </div>

              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="text-white">Search & Filter</CardTitle>
                      <CardDescription className="text-gray-400">
                        Find specific uploads quickly
                      </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search parts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 bg-gray-700/50 border-gray-600 text-white w-full sm:w-64"
                        />
                      </div>
                      <select
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white text-sm"
                      >
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="processing">Processing</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="space-y-4">
                {filteredHistory.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-colors">
                      <CardContent className="p-4 lg:p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                              <img
                                src={item.image}
                                alt={item.partName}
                                className="w-12 h-12 object-cover rounded"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-semibold truncate">{item.partName}</h3>
                              <p className="text-gray-400 text-sm">{item.partNumber}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Calendar className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-500 text-xs">{item.uploadDate}</span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-500 text-xs">{item.category}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="flex items-center space-x-3">
                              <Badge className={getStatusColor(item.status)}>
                                {item.status}
                              </Badge>
                              {item.confidence && (
                                <div className="text-right">
                                  <div className="text-white text-sm font-medium">{item.confidence}%</div>
                                  <div className="text-gray-400 text-xs">Confidence</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Export
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {filteredHistory.length === 0 && (
                <div className="text-center py-12">
                  <HistoryIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No uploads found</h3>
                  <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
                </div>
              )}
            </motion.div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default History;
