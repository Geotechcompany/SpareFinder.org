import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Upload as UploadIcon, 
  Image, 
  FileText, 
  Zap, 
  CheckCircle, 
  Camera, 
  Sparkles, 
  Brain, 
  Target,
  AlertTriangle,
  Star,
  ExternalLink,
  Copy,
  Download,
  Share,
  RefreshCw,
  X,
  ImagePlus,
  Loader2,
  Info,
  Menu
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileSidebar from '@/components/MobileSidebar';
import { useAIAnalysis, type AnalysisProgress, type AnalysisResponse, type PartPrediction } from '@/services/aiService';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/supabase/client';

const Upload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResponse | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<PartPrediction | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { analyzeImage, validateFile } = useAIAnalysis();

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
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: 'Invalid File',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setUploadedFile(file);
    setAnalysisResults(null);
    setSelectedPrediction(null);
    setAnalysisProgress(null);

    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, [validateFile]);

  const handleAnalyze = useCallback(async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    setAnalysisResults(null);
    setSelectedPrediction(null);

    try {
      const result = await analyzeImage(
        uploadedFile,
        {
          analysisType: 'detailed',
          includeSuppliers: true,
          includeCompatibility: true,
        },
        (progress) => {
          setAnalysisProgress(progress);
        }
      );

      if (result) {
        setAnalysisResults(result);
        if (result.predictions.length > 0) {
          setSelectedPrediction(result.predictions[0]);
        }
        toast({
          title: 'Analysis Complete',
          description: `Found ${result.predictions.length} potential matches with ${result.metadata.confidence.toFixed(1)}% confidence`,
        });
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  }, [uploadedFile, analyzeImage]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setImagePreview(null);
    setAnalysisResults(null);
    setSelectedPrediction(null);
    setAnalysisProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleCopyPartNumber = useCallback((partNumber: string) => {
    navigator.clipboard.writeText(partNumber);
    toast({
      title: 'Copied!',
      description: 'Part number copied to clipboard',
    });
  }, []);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getProgressStageColor = (stage: string) => {
    switch (stage) {
      case 'uploading':
        return 'from-blue-600 to-blue-700';
      case 'processing':
        return 'from-purple-600 to-purple-700';
      case 'analyzing':
        return 'from-orange-600 to-orange-700';
      case 'enriching':
        return 'from-green-600 to-green-700';
      case 'complete':
        return 'from-emerald-600 to-emerald-700';
      case 'error':
        return 'from-red-600 to-red-700';
      default:
        return 'from-gray-600 to-gray-700';
    }
  };

  const formatPrice = (price: { min: number; max: number; currency: string }) => {
    const symbol = price.currency === 'GBP' ? '£' : '$';
    return `${symbol}${price.min} - ${symbol}${price.max}`;
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl opacity-60"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl opacity-50"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
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
          className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="text-center">
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
                  <span className="text-purple-300 text-sm font-semibold">AI-Powered Recognition</span>
                </motion.div>
                <motion.h1 
                  className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Upload Part Image
                </motion.h1>
                <motion.p 
                  className="text-gray-400 text-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Upload an image of your automotive part for instant AI identification
                </motion.p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Upload Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 h-full">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <UploadIcon className="w-5 h-5 text-purple-400" />
                      <span>Upload Part Image</span>
                    </div>
                    {uploadedFile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        className="text-gray-400 hover:text-white h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Upload an image for AI-powered part identification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Upload Area */}
                  <div
                    className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-8 lg:p-12 text-center transition-all duration-300 ${
                      dragActive
                        ? 'border-purple-500 bg-purple-600/10'
                        : uploadedFile
                        ? 'border-green-500/50 bg-green-600/5'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    
                    {uploadedFile && imagePreview ? (
                      <motion.div 
                        className="space-y-4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        {/* Image Preview */}
                        <div className="relative mx-auto w-full max-w-md">
                          <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
                            <img
                              src={imagePreview}
                              alt="Uploaded part"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ready
                            </Badge>
                          </div>
                        </div>

                        {/* File Info */}
                        <div className="text-center">
                          <p className="text-white font-medium text-lg">{uploadedFile.name}</p>
                          <p className="text-gray-400 text-sm">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {uploadedFile.type}
                          </p>
                        </div>

                        {/* Analyze Button */}
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 h-12 px-6"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-5 h-5 mr-2" />
                                Analyze Part
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        className="space-y-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <ImagePlus className="w-16 h-16 text-gray-400 mx-auto" />
                        </motion.div>
                        <div>
                          <p className="text-white font-medium text-lg mb-2">Drop your image here</p>
                          <p className="text-gray-400 text-sm">
                            Supports JPG, PNG, WebP up to 10MB
                          </p>
                        </div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-full sm:w-auto inline-block"
                        >
                          <Button 
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline" 
                            className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/30 h-12 px-6"
                          >
                            <Camera className="w-5 h-5 mr-2" />
                            Choose File
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <AnimatePresence>
                    {isAnalyzing && analysisProgress && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-white text-sm font-medium">
                            {analysisProgress.message}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {analysisProgress.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700/30 rounded-full h-3 overflow-hidden">
                          <motion.div
                            className={`h-full bg-gradient-to-r ${getProgressStageColor(analysisProgress.stage)} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${analysisProgress.progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                        {analysisProgress.details && (
                          <p className="text-gray-500 text-xs">{analysisProgress.details}</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Upload Tips */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h4 className="text-white font-medium mb-3 flex items-center">
                      <Target className="w-4 h-4 mr-2 text-blue-400" />
                      Tips for Better Results
                    </h4>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Use clear, well-lit images</li>
                      <li>• Capture the part from multiple angles</li>
                      <li>• Ensure the part number is visible if possible</li>
                      <li>• Remove any packaging or covers</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Results Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 h-full">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-blue-400" />
                    <span>Analysis Results</span>
                    {analysisResults && (
                      <Badge className="bg-green-600/20 text-green-300 border-green-500/30 ml-auto">
                        {analysisResults.predictions.length} match{analysisResults.predictions.length !== 1 ? 'es' : ''}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    AI-powered part identification and details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-purple-600/30 border-t-purple-600 rounded-full"
                      />
                      <div className="text-center">
                        <p className="text-white font-medium text-lg">Analyzing your part...</p>
                        <p className="text-gray-400 text-sm mt-1">Our AI is processing the image</p>
                      </div>
                    </div>
                  ) : selectedPrediction ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Confidence Score */}
                      <div className="text-center p-4 rounded-xl bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30">
                        <div className="text-3xl font-bold text-green-400">{selectedPrediction.confidence.toFixed(1)}%</div>
                        <div className="text-green-300 text-sm">Confidence Score</div>
                      </div>

                      {/* Part Details */}
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-gray-400 text-sm mb-1">Part Name</div>
                              <div className="text-white font-medium text-lg">{selectedPrediction.partName}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="text-gray-400 text-sm mb-1">Part Number</div>
                              <div className="text-white font-medium font-mono">{selectedPrediction.partNumber}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyPartNumber(selectedPrediction.partNumber)}
                              className="text-blue-400 hover:text-blue-300 h-8 w-8 p-0"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="text-gray-400 text-sm mb-1">Category</div>
                            <div className="text-white font-medium">{selectedPrediction.category}</div>
                          </div>
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="text-gray-400 text-sm mb-1">Manufacturer</div>
                            <div className="text-white font-medium">{selectedPrediction.manufacturer}</div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <div className="text-gray-400 text-sm mb-1">Estimated Price</div>
                          <div className="text-white font-medium text-lg">{formatPrice(selectedPrediction.estimatedPrice)}</div>
                        </div>
                      </div>

                      {/* Description */}
                      {selectedPrediction.description && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <div className="text-gray-400 text-sm mb-2">Description</div>
                          <div className="text-white text-sm leading-relaxed">{selectedPrediction.description}</div>
                        </div>
                      )}

                      {/* Compatibility */}
                      {selectedPrediction.compatibility.length > 0 && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <div className="text-gray-400 text-sm mb-3">Compatible Vehicles</div>
                          <div className="space-y-2">
                            {selectedPrediction.compatibility.slice(0, 3).map((vehicle, index) => (
                              <div key={index} className="text-white text-sm bg-white/5 rounded-lg px-3 py-2 flex justify-between items-center">
                                <span>{vehicle.make} {vehicle.model}</span>
                                <span className="text-gray-400 text-xs">{vehicle.years}</span>
                              </div>
                            ))}
                            {selectedPrediction.compatibility.length > 3 && (
                              <div className="text-center">
                                <Badge variant="outline" className="border-gray-600 text-gray-400">
                                  +{selectedPrediction.compatibility.length - 3} more
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Suppliers */}
                      {selectedPrediction.suppliers.length > 0 && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <div className="text-gray-400 text-sm mb-3">Available Suppliers</div>
                          <div className="space-y-3">
                            {selectedPrediction.suppliers.slice(0, 2).map((supplier, index) => (
                              <div key={supplier.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <div className="flex-1">
                                  <div className="text-white font-medium">{supplier.name}</div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <div className="flex items-center">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`w-3 h-3 ${
                                            i < Math.floor(supplier.rating)
                                              ? 'text-yellow-400 fill-current'
                                              : 'text-gray-500'
                                          }`}
                                        />
                                      ))}
                                      <span className="text-gray-400 text-xs ml-1">({supplier.reviewCount})</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-white font-bold">£{supplier.price.toFixed(2)}</div>
                                  <div className="text-gray-400 text-xs">{supplier.shippingTime}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex-1"
                        >
                          <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-12">
                            <Download className="w-4 h-4 mr-2" />
                            Save Results
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex-1"
                        >
                          <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-white/10 h-12">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Find Suppliers
                          </Button>
                        </motion.div>
                      </div>

                      {/* Multiple Predictions */}
                      {analysisResults && analysisResults.predictions.length > 1 && (
                        <div className="border-t border-white/10 pt-4">
                          <div className="text-gray-400 text-sm mb-3">Other Possible Matches</div>
                          <div className="space-y-2">
                            {analysisResults.predictions.slice(1, 3).map((prediction, index) => (
                              <button
                                key={prediction.id}
                                onClick={() => setSelectedPrediction(prediction)}
                                className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="text-white font-medium">{prediction.partName}</div>
                                    <div className="text-gray-400 text-sm">{prediction.partNumber}</div>
                                  </div>
                                  <div className="text-gray-400 text-sm">
                                    {prediction.confidence.toFixed(1)}%
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <FileText className="w-16 h-16 text-gray-400 mb-4" />
                      </motion.div>
                      <p className="text-gray-400 text-lg">Upload an image to get started</p>
                      <p className="text-gray-500 text-sm">AI analysis will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Upload;

