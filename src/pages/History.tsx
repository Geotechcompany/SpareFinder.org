
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Calendar, Download, Eye, Trash2, Filter } from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';

const History = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data - will be replaced with real data from Supabase
  const uploads = [
    {
      id: 1,
      partName: "Brake Pad Set - Front",
      manufacturer: "Bosch",
      partNumber: "BP1542",
      uploadDate: "2024-01-15",
      confidence: 94,
      status: "completed",
      thumbnail: "/placeholder.svg"
    },
    {
      id: 2,
      partName: "Engine Air Filter",
      manufacturer: "K&N",
      partNumber: "33-2304",
      uploadDate: "2024-01-14",
      confidence: 87,
      status: "completed",
      thumbnail: "/placeholder.svg"
    },
    {
      id: 3,
      partName: "Transmission Oil Pan",
      manufacturer: "ACDelco",
      partNumber: "24208576",
      uploadDate: "2024-01-12",
      confidence: 91,
      status: "completed",
      thumbnail: "/placeholder.svg"
    },
    {
      id: 4,
      partName: "Spark Plug Set",
      manufacturer: "NGK",
      partNumber: "BKR6E-11",
      uploadDate: "2024-01-10",
      confidence: 96,
      status: "completed",
      thumbnail: "/placeholder.svg"
    }
  ];

  const filteredUploads = uploads.filter(upload =>
    upload.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    upload.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    upload.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    // Export functionality will be implemented
    console.log('Exporting upload history...');
  };

  const handleView = (uploadId: number) => {
    // View detailed results functionality
    console.log('Viewing upload:', uploadId);
  };

  const handleDelete = (uploadId: number) => {
    // Delete upload functionality
    console.log('Deleting upload:', uploadId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      <DashboardSidebar />
      
      <div className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Upload History</h1>
              <p className="text-gray-400">View and manage your part identification history.</p>
            </div>
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Search and Filters */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by part name, manufacturer, or part number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400"
                  />
                </div>
                <Button
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white whitespace-nowrap"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upload History List */}
          <div className="space-y-4">
            {filteredUploads.map((upload, index) => (
              <motion.div
                key={upload.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                          <img
                            src={upload.thumbnail}
                            alt="Part thumbnail"
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = '<div class="text-gray-400 text-xs">No Image</div>';
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-white font-semibold">{upload.partName}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span>{upload.manufacturer}</span>
                            <span>•</span>
                            <span>{upload.partNumber}</span>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(upload.uploadDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                              {upload.confidence}% confidence
                            </span>
                            <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
                              {upload.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleView(upload.id)}
                          size="sm"
                          className="bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          onClick={() => handleDelete(upload.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-600/50 text-red-400 hover:bg-red-600/20 hover:border-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredUploads.length === 0 && (
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <div className="text-gray-400 mb-4">
                  {searchTerm ? 'No uploads found matching your search.' : 'No uploads yet.'}
                </div>
                {!searchTerm && (
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    Upload Your First Part
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default History;
