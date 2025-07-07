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
  Menu,
  Plus,
  ChevronDown
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileSidebar from '@/components/MobileSidebar';
import { apiClient } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useFileUpload } from '@/hooks/useFileUpload';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { AxiosProgressEvent } from 'axios';
import { PartDetailsAnalysis } from '@/components/PartDetailsAnalysis';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

// Image component with fallback handling
const ImageWithFallback = ({ src, alt, className, onError }: { 
  src: string; 
  alt: string; 
  className: string; 
  onError?: () => void;
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
    onError?.();
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  if (imageError) {
    return (
      <div className={`${className} bg-gray-700 flex items-center justify-center text-gray-400`}>
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-1 opacity-50">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          </div>
          <div className="text-xs">Image unavailable</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
    </div>
  );
};

// Types for analysis functionality
interface AnalysisProgress {
  status: string;
  message: string;
  progress: number;
  identifiedPart?: string;
  confidence?: number;
  currentStep?: string;
  totalSteps?: number;
  currentStepIndex?: number;
  details?: string;
}

interface PartPrediction {
  class_name: string;
  confidence: number;
  description: string;
  category: string;
  manufacturer: string;
  estimated_price: string;
  part_number?: string | null;
  compatibility?: string[];
}

interface SimilarImage {
  url: string;
  title: string;
  price: string;
  metadata?: {
    link?: string;
    isEbay?: boolean;
    similarity_score?: number;
    source?: string;
  };
}

interface AnalysisMetadata {
  imageSize?: number;
  imageFormat?: string;
  modelVersion?: string;
  confidence: number;
  processingTime: number;
}

interface AnalysisResponse {
  success: boolean;
  predictions: PartPrediction[];
  similar_images?: any[];
  model_version: string;
  processing_time: number;
  image_metadata: {
    content_type: string;
    size_bytes: number;
  };
  additional_details?: {
    full_analysis?: string;
    technical_specifications?: string;
    market_information?: string;
    confidence_reasoning?: string;
    replacement_frequency?: string;
    typical_vehicle_models?: string[];
    [key: string]: any;
  };
  error?: string;
}

// Add new animation variants
const fadeInScale = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 }
};

const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3 }
};

const pulseAnimation = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.02, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

// Define interface for OpenAI image upload response
interface OpenAIImageUploadResponse {
  success: boolean;
  predictions: Array<{
    class_name: string;
    confidence: number;
    description: string;
    category: string;
    manufacturer: string;
    estimated_price: string;
    part_number?: string;
    compatibility?: string[];
  }>;
  processing_time: number;
  model_version: string;
  image_metadata: {
    content_type: string;
    size_bytes: number;
  };
}

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
  const [partInfo, setPartInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // New state for keywords
  const [keywords, setKeywords] = useState<string>('');
  const [savedKeywords, setSavedKeywords] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keywordsInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { uploadFile } = useFileUpload();

  const getProgressStageColor = (stage: string) => {
    switch (stage) {
      case 'uploading':
        return 'from-blue-500 to-cyan-500';
      case 'validating':
        return 'from-cyan-500 to-teal-500';
      case 'ai_analysis':
        return 'from-purple-500 to-pink-500';
      case 'part_matching':
        return 'from-red-500 to-rose-500';
      case 'finalizing':
        return 'from-indigo-500 to-purple-500';
      case 'complete':
        return 'from-green-400 to-emerald-400';
      case 'error':
        return 'from-red-500 to-pink-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  const getProgressStageIcon = (stage: string) => {
    switch (stage) {
      case 'uploading':
        return <UploadIcon className="w-4 h-4" />;
      case 'validating':
        return <CheckCircle className="w-4 h-4" />;
      case 'ai_analysis':
        return <Brain className="w-4 h-4" />;
      case 'part_matching':
        return <Zap className="w-4 h-4" />;
      case 'finalizing':
        return <RefreshCw className="w-4 h-4" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Loader2 className="w-4 h-4" />;
    }
  };

  const formatPrice = (price?: { min: number; max: number; currency: string } | null) => {
    if (!price || typeof price.min === 'undefined' || typeof price.max === 'undefined') {
      return 'Price not available';
    }
    const symbol = price.currency === 'GBP' ? '£' : '$';
    return `${symbol}${price.min} - ${symbol}${price.max}`;
  };

  const extractCategory = (text: string): string => {
    const categoryMatches = text.match(/Category:\s*([^.\n]+)/i);
    return categoryMatches ? categoryMatches[1].trim() : 'Automotive Component';
  };

  const extractManufacturer = (text: string): string => {
    const manufacturerMatches = text.match(/Manufacturer:\s*([^.\n]+)/i);
    return manufacturerMatches ? manufacturerMatches[1].trim() : 'Unknown';
  };

  const extractPrice = (text: string): string => {
    const priceMatches = text.match(/Price\s*Range:\s*([^.\n]+)/i);
    return priceMatches ? priceMatches[1].trim() : 'Price not available';
  };

  // Add keyword functionality
  const handleAddKeyword = () => {
    const trimmedKeyword = keywords.trim();
    if (trimmedKeyword && !savedKeywords.includes(trimmedKeyword)) {
      setSavedKeywords(prev => [...prev, trimmedKeyword]);
      setKeywords(''); // Clear input after adding
      keywordsInputRef.current?.focus();
    }
  };

  // Remove a specific keyword
  const handleRemoveKeyword = (keywordToRemove: string) => {
    setSavedKeywords(prev => prev.filter(keyword => keyword !== keywordToRemove));
  };

  const analyzeImage = async (
    file: File,
    options: any = {},
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResponse | null> => {
    try {
      // Step 1: Upload and validate
      onProgress?.({
        status: 'uploading',
        message: 'Uploading image to secure server...',
        progress: 5,
        currentStep: 'Upload & Validation',
        currentStepIndex: 1,
        totalSteps: 6,
        details: 'Transferring image data and performing security checks'
      });

      // Combine keywords from options and saved keywords
      const combinedKeywords = [
        ...(options.keywords || []),
        ...savedKeywords,
        'engine components',
        'automotive parts'
      ].join(', ');

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('keywords', combinedKeywords);
      formData.append('confidence_threshold', '0.3');
      formData.append('max_predictions', '3');

      // Track upload progress
      const config = {
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 50) / (progressEvent.total || 1));
          onProgress?.({
            status: 'uploading',
            message: 'Uploading image...',
            progress: percentCompleted,
            currentStep: 'Upload & Validation',
            currentStepIndex: 1,
            totalSteps: 6,
            details: 'Transferring image data'
          });
        }
      };

      // Step 2: AI Analysis Progress
      onProgress?.({
        status: 'ai_analysis',
        message: 'Initializing AI analysis...',
        progress: 30,
        currentStep: 'AI Analysis',
        currentStepIndex: 2,
        totalSteps: 6,
        details: 'Analyzing image with AI services'
      });

      // Call image analysis endpoint
      const response = await apiClient.post<OpenAIImageUploadResponse>('/openai/upload/image', formData, config);

      // Check for successful response
      if (!response.data.success || !response.data.predictions || response.data.predictions.length === 0) {
        throw new Error('No predictions found in the image analysis');
      }

      // Transform response to match existing interface
      const analysisResults: AnalysisResponse = {
        success: response.data.success,
        predictions: response.data.predictions.map(prediction => ({
          class_name: prediction.class_name || 'Automotive Component',
          confidence: prediction.confidence || 75,
          description: prediction.description,
          category: prediction.category || 'Unspecified',
          manufacturer: prediction.manufacturer || 'Unknown',
          estimated_price: prediction.estimated_price || 'Price not available',
          part_number: prediction.part_number,
          compatibility: prediction.compatibility
        })),
        similar_images: [], // Remove similar images
        model_version: response.data.model_version || 'SpareFinder AI v2',
        processing_time: response.data.processing_time,
        image_metadata: response.data.image_metadata,
        additional_details: {
          full_analysis: ''
        }
      };

      // Final progress update
      onProgress?.({
        status: 'complete',
        message: `Found ${analysisResults.predictions.length} potential matches`,
        progress: 100,
        currentStep: 'Analysis Complete',
        currentStepIndex: 6,
        totalSteps: 6,
        details: 'Comprehensive part analysis finished',
        identifiedPart: analysisResults.predictions[0]?.class_name,
        confidence: analysisResults.predictions[0]?.confidence
      });

      return analysisResults;
    } catch (error) {
      // Detailed error handling
      console.error('Image analysis error:', error);
      
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.message || error.message
        : error instanceof Error 
        ? error.message 
        : 'Unknown error occurred during image analysis';

      onProgress?.({
        status: 'error',
        message: errorMessage,
        progress: 0,
        currentStep: 'Analysis Failed',
        currentStepIndex: 0,
        totalSteps: 6,
        details: 'Unable to complete image analysis'
      });

      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive'
      });

      return null;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive"
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 10MB.",
          variant: "destructive"
        });
        return;
      }

      setUploadedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setSelectedPrediction(null);
      setAnalysisProgress(null);
      setPartInfo(null);
    }
  };

  const resetForm = () => {
    setUploadedFile(null);
    setImagePreview(null);
    setSelectedPrediction(null);
    setAnalysisProgress(null);
    setPartInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please select an image file first.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await uploadFile(uploadedFile);
      if (result.success && result.part_info) {
        setPartInfo(result.part_info);
        toast({
          title: "Success",
          description: "Part information retrieved successfully.",
        });
      } else {
        throw new Error(result.error || 'Failed to process image');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process image",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      handleFileSelect({ target: { files: files } } as React.ChangeEvent<HTMLInputElement>);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(e);
    }
  }, []);

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
          description: `Found ${result.predictions.length} potential matches`,
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
    setPartInfo(null);
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
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
                  <span className="text-purple-300 text-sm font-semibold">SpareFinder AI-Powered</span>
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
                            <ImageWithFallback
                              src={imagePreview}
                              alt="Uploaded part"
                              className="w-full h-full object-cover"
                              onError={() => {
                                const target = document.createElement('img');
                                target.src = '/images/placeholder.png';
                                target.alt = 'Placeholder image';
                                target.className = 'w-full h-full object-cover';
                                target.style.display = 'block';
                                target.onerror = () => {
                                  const placeholder = document.createElement('div');
                                  placeholder.className = 'w-full h-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs';
                                  placeholder.innerHTML = '<div class="text-center"><div class="w-8 h-8 mx-auto mb-1 opacity-50"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>Image unavailable</div>';
                                  target.parentNode?.appendChild(placeholder);
                                };
                              }}
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

                  {/* Keyword Input Section */}
                  <div className="mb-4 space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        ref={keywordsInputRef}
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddKeyword();
                          }
                        }}
                        placeholder="Add keywords to refine analysis (e.g., brake, suspension)"
                        className="flex-grow"
                      />
                      <Button 
                        onClick={handleAddKeyword}
                        variant="outline"
                        className="px-4"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add
                      </Button>
                    </div>
                    
                    {/* Saved Keywords Display */}
                    {savedKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {savedKeywords.map((keyword, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full text-sm"
                          >
                            {keyword}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="ml-2 p-0 h-4 w-4 hover:bg-purple-700/30"
                              onClick={() => handleRemoveKeyword(keyword)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modern Progress Bar */}
                  <AnimatePresence>
                    {isAnalyzing && analysisProgress && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                        {/* Progress Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <motion.div
                              animate={{ rotate: analysisProgress.status === 'complete' ? 0 : 360 }}
                              transition={{ 
                                duration: analysisProgress.status === 'complete' ? 0 : 2, 
                                repeat: analysisProgress.status === 'complete' ? 0 : Infinity, 
                                ease: "linear" 
                              }}
                              className={`p-2 rounded-full bg-gradient-to-r ${getProgressStageColor(analysisProgress.status)} shadow-lg`}
                            >
                              {getProgressStageIcon(analysisProgress.status)}
                            </motion.div>
                            <div>
                              <div className="text-white font-medium text-lg">
                                {analysisProgress.currentStep || analysisProgress.message}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {analysisProgress.details || 'Processing your request...'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white text-lg font-bold">
                              {analysisProgress.progress}%
                            </div>
                            {analysisProgress.currentStepIndex && analysisProgress.totalSteps && (
                              <div className="text-gray-400 text-xs">
                                Step {analysisProgress.currentStepIndex} of {analysisProgress.totalSteps}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Modern Progress Bar */}
                        <div className="relative">
                          <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden backdrop-blur-sm border border-gray-700/50">
                            <motion.div
                              className={`h-full bg-gradient-to-r ${getProgressStageColor(analysisProgress.status)} rounded-full relative overflow-hidden`}
                              initial={{ width: 0 }}
                              animate={{ width: `${analysisProgress.progress}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            >
                              {/* Animated shine effect */}
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ 
                                  duration: 2, 
                                  repeat: analysisProgress.status !== 'complete' ? Infinity : 0,
                                  ease: "easeInOut" 
                                }}
                              />
                            </motion.div>
                          </div>
                          {/* Progress markers */}
                          {analysisProgress.totalSteps && (
                            <div className="flex justify-between mt-2">
                              {Array.from({ length: analysisProgress.totalSteps }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                                    (analysisProgress.currentStepIndex || 0) > i
                                      ? 'bg-green-400'
                                      : (analysisProgress.currentStepIndex || 0) === i + 1
                                      ? `bg-gradient-to-r ${getProgressStageColor(analysisProgress.status)}`
                                      : 'bg-gray-600'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Identified Part Display */}
                        {analysisProgress.identifiedPart && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 rounded-lg bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 backdrop-blur-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-green-600/30 rounded-full">
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                  <div className="text-green-300 font-medium text-lg">
                                    Part Identified!
                                  </div>
                                  <div className="text-green-200 font-semibold">
                                    {analysisProgress.identifiedPart}
                                  </div>
                                </div>
                              </div>
                              {analysisProgress.confidence && (
                                <div className="text-right">
                                  <div className="text-green-400 text-xl font-bold">
                                    {analysisProgress.confidence}%
                                  </div>
                                  <div className="text-green-300 text-xs">Confidence</div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {/* Real-time Status Messages */}
                        <motion.div
                          key={analysisProgress.status}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-center"
                        >
                          <p className="text-gray-300 text-sm">
                            {analysisProgress.message}
                          </p>
                        </motion.div>
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
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      >
                        <Badge className="bg-green-600/20 text-green-300 border-green-500/30 ml-auto">
                          {analysisResults.predictions.length} match{analysisResults.predictions.length !== 1 ? 'es' : ''}
                        </Badge>
                      </motion.div>
                    )}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    AI-powered part identification and details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {analysisResults && analysisResults.predictions && analysisResults.predictions.length > 0 ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6"
                      >
                        {/* Part Identification Section */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-white flex items-center">
                              <Target className="w-6 h-6 mr-3 text-blue-400" />
                              {analysisResults.predictions[0].class_name}
                            </h2>
                            <Badge 
                              className={`
                                ${analysisResults.predictions[0].confidence > 0.8 ? 'bg-green-600/20 text-green-300 border-green-500/30' : 
                                  analysisResults.predictions[0].confidence > 0.5 ? 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30' : 
                                  'bg-red-600/20 text-red-300 border-red-500/30'}
                              `}
                            >
                              Confidence: {(analysisResults.predictions[0].confidence * 100).toFixed(1)}%
                            </Badge>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Dynamically generate sections based on available data */}
                            {[
                              {
                                title: "Part Details",
                                icon: <Info className="w-5 h-5 mr-2 text-blue-400" />,
                                content: [
                                  { label: "Category", value: analysisResults.predictions[0].category },
                                  { label: "Manufacturers", value: analysisResults.predictions[0].manufacturer },
                                  { label: "Estimated Price", value: analysisResults.predictions[0].estimated_price },
                                  { label: "Part Number", value: analysisResults.predictions[0].part_number || "Not Available" }
                                ]
                              },
                              {
                                title: "Description",
                                icon: <FileText className="w-5 h-5 mr-2 text-blue-400" />,
                                content: analysisResults.predictions[0].description
                              }
                            ].map((section, index) => (
                              <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <h3 className="text-lg font-semibold text-blue-300 mb-2 flex items-center">
                                  {section.icon}
                                  {section.title}
                                </h3>
                                {Array.isArray(section.content) ? (
                                  <div className="space-y-2 text-gray-300 text-sm">
                                    {section.content.map((item, idx) => (
                                      <p key={idx}>
                                        <strong>{item.label}:</strong> {item.value}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-300 text-sm">{section.content}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Compatibility Section */}
                        {analysisResults.predictions[0].compatibility && analysisResults.predictions[0].compatibility.length > 0 && (
                          <div className="bg-white/5 rounded-xl p-4 border border-white/10 mt-6">
                            <h3 className="text-lg font-semibold text-blue-300 mb-2 flex items-center">
                              <Target className="w-5 h-5 mr-2 text-blue-400" />
                              Compatibility
                            </h3>
                            <div className="text-gray-300 text-sm">
                              {analysisResults.predictions[0].compatibility.map((model, index) => (
                                <p key={index}>• {model}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dynamically generate additional sections from additional_details */}
                        {[
                          {
                            key: 'technical_specifications',
                            title: 'Technical Specifications',
                            icon: <Zap className="w-5 h-5 mr-2 text-blue-400" />
                          },
                          {
                            key: 'market_information',
                            title: 'Market Information',
                            icon: <Info className="w-5 h-5 mr-2 text-blue-400" />
                          },
                          {
                            key: 'confidence_reasoning',
                            title: 'Confidence Assessment',
                            icon: <CheckCircle className="w-5 h-5 mr-2 text-blue-400" />
                          },
                          {
                            key: 'replacement_frequency',
                            title: 'Maintenance Insights',
                            icon: <RefreshCw className="w-5 h-5 mr-2 text-blue-400" />
                          }
                        ].map((section, index) => {
                          const sectionContent = analysisResults.additional_details?.[section.key];
                          
                          return sectionContent ? (
                            <div 
                              key={index} 
                              className="bg-white/5 rounded-xl p-4 border border-white/10 mt-6"
                            >
                              <h3 className="text-lg font-semibold text-blue-300 mb-2 flex items-center">
                                {section.icon}
                                {section.title}
                              </h3>
                              <div className="text-gray-300 text-sm">
                                <p>{sectionContent}</p>
                              </div>
                            </div>
                          ) : null;
                        })}

                        {/* Metadata Section */}
                        <div className="text-xs text-gray-500 text-right mt-6 space-y-1">
                          <p><strong>Model:</strong> {analysisResults.model_version}</p>
                          <p><strong>Processing Time:</strong> {analysisResults.processing_time.toFixed(2)} seconds</p>
                          <p><strong>Image Size:</strong> {analysisResults.image_metadata.size_bytes} bytes</p>
                          <p><strong>Image Type:</strong> {analysisResults.image_metadata.content_type}</p>
                        </div>

                        {/* Full Analysis Expandable Section */}
                        {analysisResults.additional_details?.full_analysis && (
                          <div className="mt-6 bg-white/5 rounded-xl border border-white/10">
                            <Collapsible>
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between p-4 hover:bg-white/10 transition-colors">
                                  <div className="flex items-center">
                                    <FileText className="w-5 h-5 mr-2 text-blue-400" />
                                    <span className="text-blue-300 font-semibold">Full AI Analysis</span>
                                  </div>
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="p-4 border-t border-white/10">
                                  <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">
                                    {analysisResults.additional_details.full_analysis}
                                  </pre>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <div className="text-center text-gray-400 p-8 bg-black/20 rounded-2xl border border-white/10">
                        <Info className="w-16 h-16 mx-auto mb-4 text-blue-400 opacity-50" />
                        <p>No analysis results available</p>
                        <p className="text-sm mt-2">Please upload a clear image of an automotive part</p>
                      </div>
                    )}
                  </div>
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

