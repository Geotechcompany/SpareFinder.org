import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload as UploadIcon, Image, FileText, Zap, CheckCircle, Menu, X } from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';

const Upload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setUploadedFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setUploadedFile(files[0]);
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      console.log('Analysis complete');
    }, 3000);
  };

  const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-800/80 backdrop-blur-sm border border-gray-700"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.3 }}
            className="fixed lg:hidden z-40 h-full w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 flex flex-col"
          >
            {/* Close Button */}
            <div className="absolute top-4 right-4">
              <button
                onClick={toggleMobileMenu}
                className="p-1 rounded-full hover:bg-gray-800/50 transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <DashboardSidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.div
        className="hidden lg:flex h-screen w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 flex-col fixed left-0 top-0"
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <DashboardSidebar />
      </motion.div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          onClick={toggleMobileMenu}
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-800 px-4">
          {/* Add any header content if needed */}
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 lg:space-y-8 max-w-4xl mx-auto"
        >
          <div className="text-center">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center justify-center space-x-3">
              <UploadIcon className="w-8 h-8" />
              <span>Upload Part Image</span>
            </h1>
            <p className="text-gray-400">Upload an image of your automotive part for AI identification</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Upload Image</CardTitle>
                  <CardDescription className="text-gray-400">
                    Drag and drop or click to select an image
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? 'border-purple-400 bg-purple-400/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    {uploadedFile ? (
                      <div className="space-y-4">
                        <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
                        <div>
                          <p className="text-white font-medium">{uploadedFile.name}</p>
                          <p className="text-gray-400 text-sm">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          {isAnalyzing ? (
                            <>
                              <Zap className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Analyze Part
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Image className="w-12 h-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-white font-medium mb-2">Drop your image here</p>
                          <p className="text-gray-400 text-sm">
                            Supports JPG, PNG, WebP up to 10MB
                          </p>
                        </div>
                        <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                          Choose File
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Upload Tips</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                      <div>
                        <p className="text-white text-sm font-medium">Good Lighting</p>
                        <p className="text-gray-400 text-sm">Ensure the part is well-lit and clearly visible</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      <div>
                        <p className="text-white text-sm font-medium">Clear Focus</p>
                        <p className="text-gray-400 text-sm">Make sure the image is sharp and not blurry</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                      <div>
                        <p className="text-white text-sm font-medium">Full Part Visible</p>
                        <p className="text-gray-400 text-sm">Include the entire part in the frame</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                      <div>
                        <p className="text-white text-sm font-medium">Clean Background</p>
                        <p className="text-gray-400 text-sm">Remove clutter from around the part</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      <strong>Pro Tip:</strong> Multiple angles of the same part can improve identification accuracy.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Upload;
