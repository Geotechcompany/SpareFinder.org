
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload as UploadIcon, Image, Loader2, Check, AlertTriangle } from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';

const Upload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const processImage = async () => {
    if (!uploadedFile) return;
    
    setIsProcessing(true);
    
    // Simulate API processing - will be replaced with actual OpenAI and scraping logic
    setTimeout(() => {
      setResults({
        partName: "Brake Pad Set - Front",
        manufacturer: "Bosch",
        partNumber: "BP1542",
        description: "High-performance ceramic brake pads designed for front disc brakes. Compatible with various vehicle models from 2015-2023.",
        confidence: 94,
        prices: [
          { store: "Amazon", price: "$89.99", url: "#", availability: "In Stock" },
          { store: "eBay", price: "$76.50", url: "#", availability: "2 Available" },
          { store: "AutoZone", price: "$92.49", url: "#", availability: "In Stock" }
        ]
      });
      setIsProcessing(false);
    }, 3000);
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setResults(null);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      <DashboardSidebar />
      
      <div className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Upload Part Image</h1>
            <p className="text-gray-400">Upload an image of your spare part and let our AI identify it for you.</p>
          </div>

          {!results ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upload Area */}
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Upload Image</CardTitle>
                  <CardDescription className="text-gray-400">
                    Drag and drop or click to select an image
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                      dragActive
                        ? 'border-purple-400 bg-purple-500/10'
                        : uploadedFile
                        ? 'border-green-400 bg-green-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                    
                    {uploadedFile ? (
                      <div className="space-y-4">
                        <Check className="w-12 h-12 text-green-400 mx-auto" />
                        <div>
                          <p className="text-white font-medium">{uploadedFile.name}</p>
                          <p className="text-gray-400 text-sm">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          onClick={resetUpload}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          Choose Different File
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <UploadIcon className="w-12 h-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-white font-medium">Drop your image here</p>
                          <p className="text-gray-400 text-sm">
                            or click to browse files
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          Supports: JPG, PNG, WebP (max 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {uploadedFile && (
                    <div className="mt-6">
                      <Button
                        onClick={processImage}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing with AI...
                          </>
                        ) : (
                          <>
                            <Image className="w-4 h-4 mr-2" />
                            Identify Part
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Preview/Tips */}
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Tips for Best Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                    <div>
                      <p className="text-white text-sm font-medium">Clear, well-lit photos</p>
                      <p className="text-gray-400 text-xs">Ensure the part is clearly visible with good lighting</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                    <div>
                      <p className="text-white text-sm font-medium">Include part numbers</p>
                      <p className="text-gray-400 text-xs">Visible part numbers or labels improve accuracy</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                    <div>
                      <p className="text-white text-sm font-medium">Multiple angles</p>
                      <p className="text-gray-400 text-xs">Upload additional photos for complex parts</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                    <div>
                      <p className="text-white text-sm font-medium">Clean the part</p>
                      <p className="text-gray-400 text-xs">Remove dirt and debris for better identification</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Results Display */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Check className="w-5 h-5 text-green-400" />
                        <span>Part Identified Successfully</span>
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        AI Confidence: {results.confidence}%
                      </CardDescription>
                    </div>
                    <Button
                      onClick={resetUpload}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Upload Another
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-white font-semibold mb-2">Part Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Name:</span>
                          <span className="text-white">{results.partName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Manufacturer:</span>
                          <span className="text-white">{results.manufacturer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Part Number:</span>
                          <span className="text-white">{results.partNumber}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">Description</h3>
                      <p className="text-gray-300 text-sm">{results.description}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-white font-semibold mb-4">Price Comparison</h3>
                    <div className="space-y-3">
                      {results.prices.map((price: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {price.store[0]}
                            </div>
                            <div>
                              <p className="text-white font-medium">{price.store}</p>
                              <p className="text-gray-400 text-xs">{price.availability}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">{price.price}</p>
                            <Button size="sm" className="mt-1 bg-purple-600 hover:bg-purple-700">
                              View Deal
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Upload;
