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
import { apiClient, api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useFileUpload } from '@/hooks/useFileUpload';
import { cn } from '@/lib/utils';

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
  searchResults?: {
    sitesSearched: number;
    partsFound: number;
    databasesQueried: string[];
  };
}

interface PartPrediction {
  name: string;
  confidence: number;
  details: string;
  partNumber?: string;
  category?: string;
  manufacturer?: string;
  estimatedPrice?: string;
  compatibility?: string[];
}

interface AIServiceResponse {
  request_id: string;
  predictions: Array<{
    class_name: string;
    confidence: number;
    part_number?: string;
    description: string;
    category: string;
    manufacturer: string;
    compatibility: string[];
    estimated_price: string;
  }>;
  processing_time: number;
  model_version: string;
  image_metadata?: {
    web_scraping_used: boolean;
  };
  similar_images?: Array<{
    url: string;
    metadata: Record<string, any>;
    similarity_score: number;
    source: string;
    title: string;
    price: string;
  }>;
}

interface AnalysisResponse {
  success: boolean;
  analysisId: string;
  predictions: PartPrediction[];
  processingTime: number;
  metadata: {
    imageSize: number;
    imageFormat: string;
    modelVersion: string;
    confidence: number;
    webScrapingUsed?: boolean;
    sitesSearched?: number;
  };
  similarImages?: Array<{
    url: string;
    metadata: Record<string, any>;
    similarity_score: number;
    source: string;
    title: string;
    price: string;
  }>;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      case 'database_search':
        return 'from-orange-500 to-red-500';
      case 'part_matching':
        return 'from-red-500 to-rose-500';
      case 'supplier_search':
        return 'from-green-500 to-emerald-500';
      case 'data_enrichment':
        return 'from-emerald-500 to-teal-500';
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
      case 'database_search':
        return <Target className="w-4 h-4" />;
      case 'part_matching':
        return <Zap className="w-4 h-4" />;
      case 'supplier_search':
        return <ExternalLink className="w-4 h-4" />;
      case 'data_enrichment':
        return <Sparkles className="w-4 h-4" />;
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

      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 2: Image validation
      onProgress?.({
        status: 'validating',
        message: 'Validating image quality and format...',
        progress: 15,
        currentStep: 'Image Analysis',
        currentStepIndex: 2,
        totalSteps: 6,
        details: 'Checking resolution, format compatibility, and image clarity'
      });

      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 3: AI Analysis
      onProgress?.({
        status: 'ai_analysis',
        message: 'Running AI analysis...',
        progress: 35,
        currentStep: 'SpareFinder AI',
        currentStepIndex: 3,
        totalSteps: 6,
        details: 'SpareFinder AI analyzing automotive components and features'
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 4: Web Scraping
      onProgress?.({
        status: 'database_search',
        message: 'Searching automotive parts online...',
        progress: 60,
        currentStep: 'Web Scraping',
        currentStepIndex: 4,
        totalSteps: 6,
        details: 'Searching  automotive websites for similar parts and pricing data',
        searchResults: {
          sitesSearched: 1,
          partsFound: 0,
          databasesQueried: ['Automotive Parts Database']
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 5: Data Processing
      onProgress?.({
        status: 'data_enrichment',
        message: 'Processing scraped data...',
        progress: 80,
        currentStep: 'Data Processing',
        currentStepIndex: 5,
        totalSteps: 6,
        details: 'Analyzing results and matching with SpareFinder AI identification'
      });

      // Make the actual API call to SpareFinder AI + Web Scraper integration
      const response = await api.upload.image(file) as unknown as AIServiceResponse;
      console.log('🤖 SpareFinder AI Response:', response);

      if (response && response.predictions && response.predictions.length > 0) {
        const prediction = response.predictions[0];
        const identifiedPart = prediction.class_name;
        
        // Fix confidence score calculation - ensure it's properly converted to percentage
        let confidence = prediction.confidence;
        if (confidence <= 1.0) {
          confidence = Math.round(confidence * 100); // Convert decimal to percentage
        } else {
          confidence = Math.round(confidence); // Already in percentage
        }
        
        console.log(`✅ SpareFinder AI identified: "${identifiedPart}" with ${confidence}% confidence`);
        
        // Enhanced similar images logging
        if (response.similar_images && response.similar_images.length > 0) {
          console.log(`🖼️ Found ${response.similar_images.length} similar images from web scraping`);
          console.log('Similar images sources:', response.similar_images.map(img => img.source));
          
          // Log eBay specific results
          const ebayImages = response.similar_images.filter(img => 
            img.source && img.source.toLowerCase().includes('ebay')
          );
          if (ebayImages.length > 0) {
            console.log(`🛒 Found ${ebayImages.length} eBay listings with prices`);
          }
        }

        // Step 6: Finalizing
        onProgress?.({
          status: 'finalizing',
          message: 'Finalizing analysis and generating report...',
          progress: 95,
          currentStep: 'Report Generation',
          currentStepIndex: 6,
          totalSteps: 6,
          identifiedPart: identifiedPart,
          confidence: confidence,
          details: 'Compiling SpareFinder AI analysis with eBay and market data',
          searchResults: {
            sitesSearched: 1,
            partsFound: response.similar_images?.length || 0,
            databasesQueried: ['eBay UK - Live Results', 'Automotive Parts Database']
          }
        });

        await new Promise(resolve => setTimeout(resolve, 600));

        // Complete
        onProgress?.({
          status: 'complete',
          message: 'Analysis complete! Part identified successfully.',
          progress: 100,
          currentStep: 'Complete',
          currentStepIndex: 6,
          totalSteps: 6,
          identifiedPart: identifiedPart,
          confidence: confidence,
          details: `SpareFinder AI found ${response.similar_images?.length || 0} similar parts with pricing and availability`,
          searchResults: {
            sitesSearched: 1,
            partsFound: response.similar_images?.length || 0,
            databasesQueried: ['eBay UK - Live Results', 'Automotive Parts Database']
          }
        });

        // Enhanced price formatting
        const formatEstimatedPrice = (priceStr?: string) => {
          if (!priceStr) return 'Price not available';
          
          // Handle various price formats from AI service
          if (priceStr.includes('£') || priceStr.includes('$')) {
            return priceStr; // Already formatted
          }
          
          // Try to extract price range or single price
          const priceMatch = priceStr.match(/(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?/);
          if (priceMatch) {
            const minPrice = parseFloat(priceMatch[1]);
            const maxPrice = priceMatch[2] ? parseFloat(priceMatch[2]) : null;
            
            if (maxPrice && maxPrice > minPrice) {
              return `£${minPrice.toFixed(2)} - £${maxPrice.toFixed(2)}`;
            } else {
              return `£${minPrice.toFixed(2)}`;
            }
          }
          
          return priceStr; // Return as-is if can't parse
        };

        return {
          success: true,
          analysisId: response.request_id || 'temp-id',
          predictions: [{
            name: prediction.class_name,
            confidence: confidence, // Use the corrected confidence value
            details: prediction.description || '',
            partNumber: prediction.part_number,
            category: prediction.category,
            manufacturer: prediction.manufacturer,
            estimatedPrice: formatEstimatedPrice(prediction.estimated_price),
            compatibility: prediction.compatibility || []
          }],
          processingTime: response.processing_time || 0,
          metadata: {
            imageSize: file.size,
            imageFormat: file.type,
            modelVersion: 'SpareFinder AI v1',
            confidence: confidence, // Use the corrected confidence value
            webScrapingUsed: response.image_metadata?.web_scraping_used || false,
            sitesSearched: 1
          },
          // Enhanced similar images with better validation
          similarImages: response.similar_images?.map(img => ({
            ...img,
            // Ensure image URL is valid and accessible
            url: img.url || '',
            // Enhanced price formatting for similar images
            price: img.price || 'Price not available',
            // Ensure source is properly formatted
            source: img.source || 'Unknown source',
            // Add eBay-specific enhancements
            isEbay: img.source && img.source.toLowerCase().includes('ebay'),
            // Extract part number from metadata if available
            partNumber: img.metadata?.part_number || img.metadata?.partNumber || null,
            // Extract condition from metadata
            condition: img.metadata?.condition || null,
            // Extract shipping info
            shipping: img.metadata?.shipping || null
          })) || []
        };
      } else {
        throw new Error('No predictions found');
      }
    } catch (error) {
      onProgress?.({
        status: 'error',
        message: 'Analysis failed - please try again',
        progress: 0,
        currentStep: 'Error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      
      console.error('Image analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze image',
        variant: 'destructive',
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

                        {/* Database Search Results */}
                        {analysisProgress.searchResults && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="grid grid-cols-3 gap-3"
                          >
                            <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-3 text-center">
                              <div className="text-blue-400 text-lg font-bold">
                                {analysisProgress.searchResults.sitesSearched}
                              </div>
                              <div className="text-blue-300 text-xs">Sites Searched</div>
                            </div>
                            <div className="bg-green-600/10 border border-green-500/20 rounded-lg p-3 text-center">
                              <div className="text-green-400 text-lg font-bold">
                                {analysisProgress.searchResults.partsFound}
                              </div>
                              <div className="text-green-300 text-xs">Parts Found</div>
                            </div>
                            <div className="bg-purple-600/10 border border-purple-500/20 rounded-lg p-3 text-center">
                              <div className="text-purple-400 text-lg font-bold">
                                {analysisProgress.searchResults.databasesQueried.length}
                              </div>
                              <div className="text-purple-300 text-xs">Databases</div>
                            </div>
                          </motion.div>
                        )}

                        {/* Active Databases List */}
                        {analysisProgress.searchResults?.databasesQueried && analysisProgress.searchResults.databasesQueried.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3"
                          >
                            <div className="text-gray-400 text-xs mb-2 flex items-center">
                              <Target className="w-3 h-3 mr-1" />
                              Currently Searching:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {analysisProgress.searchResults.databasesQueried.map((db, index) => (
                                <motion.span
                                  key={index}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="inline-flex items-center px-2 py-1 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-blue-300 text-xs"
                                >
                                  <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: index * 0.2 }}
                                    className="w-1 h-1 bg-blue-400 rounded-full mr-1"
                                  />
                                  {db}
                                </motion.span>
                              ))}
                            </div>
                          </motion.div>
                        )}

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
                  <AnimatePresence mode="wait">
                    {isAnalyzing ? (
                      <motion.div
                        key="analyzing"
                        {...fadeInScale}
                        className="flex flex-col items-center justify-center py-12 space-y-6"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="relative w-20 h-20"
                        >
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 blur-lg opacity-50" />
                          <div className="relative w-full h-full border-4 border-purple-600/30 border-t-purple-600 rounded-full" />
                        </motion.div>
                        <motion.div
                          {...pulseAnimation}
                          className="text-center"
                        >
                          <p className="text-white font-medium text-lg">Analyzing your part...</p>
                          <p className="text-gray-400 text-sm mt-1">Our AI is processing the image</p>
                        </motion.div>
                      </motion.div>
                    ) : selectedPrediction ? (
                      <motion.div
                        key="results"
                        {...slideInRight}
                        className="space-y-6"
                      >
                        {/* Confidence Score with Radial Progress */}
                        <motion.div
                          className="relative w-32 h-32 mx-auto"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        >
                          <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="rgba(74, 222, 128, 0.1)"
                              strokeWidth="10"
                            />
                            <motion.circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="rgba(74, 222, 128, 0.5)"
                              strokeWidth="10"
                              strokeLinecap="round"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: selectedPrediction.confidence / 100 }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              transform="rotate(-90 50 50)"
                              strokeDasharray="283"
                              strokeDashoffset="0"
                            />
                            <text
                              x="50"
                              y="50"
                              textAnchor="middle"
                              dy="0.3em"
                              className="text-2xl font-bold fill-green-400"
                            >
                              {selectedPrediction.confidence.toFixed(1)}%
                            </text>
                          </svg>
                          <div className="text-green-300 text-sm text-center mt-2">Confidence Score</div>
                        </motion.div>

                        {/* Part Details */}
                        <motion.div
                          variants={{
                            initial: { opacity: 0 },
                            animate: { opacity: 1, transition: { staggerChildren: 0.1 } }
                          }}
                          initial="initial"
                          animate="animate"
                          className="space-y-4"
                        >
                          {/* Part Name */}
                          <motion.div
                            variants={fadeInScale}
                            className="p-4 rounded-xl bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-white/10 hover:border-white/20 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="text-gray-400 text-sm mb-1">Part Name</div>
                                <div className="text-white font-medium text-lg">{selectedPrediction.name}</div>
                              </div>
                            </div>
                          </motion.div>

                          {/* Part Number with Copy */}
                          {selectedPrediction.partNumber && (
                            <motion.div
                              variants={fadeInScale}
                              className="p-4 rounded-xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-white/10 hover:border-white/20 transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="text-gray-400 text-sm mb-1">Part Number</div>
                                  <div className="text-white font-medium font-mono">{selectedPrediction.partNumber}</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyPartNumber(selectedPrediction.partNumber || '')}
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 transition-colors h-8 w-8 p-0"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </motion.div>
                          )}

                          {/* Category and Manufacturer */}
                          <div className="grid grid-cols-2 gap-4">
                            <motion.div
                              variants={fadeInScale}
                              className="p-4 rounded-xl bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-white/10 hover:border-white/20 transition-colors"
                            >
                              <div className="text-gray-400 text-sm mb-1">Category</div>
                              <div className="text-white font-medium">{selectedPrediction.category || 'Unknown'}</div>
                            </motion.div>
                            <motion.div
                              variants={fadeInScale}
                              className="p-4 rounded-xl bg-gradient-to-r from-emerald-600/10 to-green-600/10 border border-white/10 hover:border-white/20 transition-colors"
                            >
                              <div className="text-gray-400 text-sm mb-1">Manufacturer</div>
                              <div className="text-white font-medium">{selectedPrediction.manufacturer || 'Unknown'}</div>
                            </motion.div>
                          </div>

                          {/* Estimated Price */}
                          <motion.div
                            variants={fadeInScale}
                            className="p-4 rounded-xl bg-gradient-to-r from-yellow-600/10 to-orange-600/10 border border-white/10 hover:border-white/20 transition-colors"
                          >
                            <div className="text-gray-400 text-sm mb-1">Estimated Price</div>
                            <div className="text-white font-medium text-lg">{selectedPrediction.estimatedPrice || 'Price not available'}</div>
                          </motion.div>

                          {/* Analysis Stats */}
                          {analysisResults?.metadata && (
                            <motion.div
                              variants={fadeInScale}
                              className="p-4 rounded-xl bg-gradient-to-r from-gray-600/10 to-slate-600/10 border border-white/10 hover:border-white/20 transition-colors"
                            >
                              <div className="text-gray-400 text-sm mb-2">Analysis Information</div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-400">Processing Time:</span>
                                  <span className="text-white ml-2">{analysisResults.processingTime.toFixed(1)}s</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Model:</span>
                                  <span className="text-white ml-2">{analysisResults.metadata.modelVersion}</span>
                                </div>
                                {analysisResults.metadata.webScrapingUsed && (
                                  <div>
                                    <span className="text-gray-400">Sites Searched:</span>
                                    <span className="text-white ml-2">{analysisResults.metadata.sitesSearched || 'Multiple'}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-400">Confidence:</span>
                                  <span className="text-green-300 ml-2">{analysisResults.metadata.confidence.toFixed(1)}%</span>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* Description */}
                          {selectedPrediction.details && (
                            <motion.div
                              variants={fadeInScale}
                              className="p-4 rounded-xl bg-gradient-to-r from-indigo-600/10 to-violet-600/10 border border-white/10 hover:border-white/20 transition-colors"
                            >
                              <div className="text-gray-400 text-sm mb-2">Description</div>
                              <div className="text-white text-sm leading-relaxed">{selectedPrediction.details}</div>
                            </motion.div>
                          )}

                          {/* Enhanced Similar Images Section with eBay Focus */}
                          {analysisResults?.similarImages && analysisResults.similarImages.length > 0 && (
                            <motion.div
                              variants={fadeInScale}
                              className="p-4 rounded-xl bg-gradient-to-r from-emerald-600/10 to-teal-600/10 border border-white/10 hover:border-white/20 transition-colors"
                            >
                              <div className="text-gray-400 text-sm mb-3 flex items-center justify-between">
                                <div className="flex items-center">
                                  <ImagePlus className="w-4 h-4 mr-2" />
                                  Similar Parts Found ({analysisResults.similarImages.length})
                                </div>
                                <div className="flex items-center space-x-2">
                                  {analysisResults.similarImages.some((img: any) => img.isEbay) && (
                                    <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded-full border border-blue-500/30">
                                      eBay Results
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {analysisResults.similarImages.slice(0, 6).map((image: any, index) => (
                                  <div key={index} className="relative group">
                                    <div className="aspect-square rounded-lg overflow-hidden border border-white/10 bg-gray-800 relative">
                                      <ImageWithFallback
                                        src={image.url}
                                        alt={image.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                      />
                                      {/* eBay Badge */}
                                      {image.isEbay && (
                                        <div className="absolute top-2 left-2 bg-blue-600/90 text-white text-xs px-2 py-1 rounded-full font-medium">
                                          eBay
                                        </div>
                                      )}
                                      {/* Condition Badge */}
                                      {image.condition && (
                                        <div className="absolute top-2 right-2 bg-green-600/90 text-white text-xs px-2 py-1 rounded-full">
                                          {image.condition}
                                        </div>
                                      )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex flex-col justify-between p-2">
                                      <div className="flex justify-end">
                                        {image.metadata?.link && (
                                          <motion.a
                                            href={image.metadata.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            className="bg-blue-600/80 hover:bg-blue-500/90 text-white p-1.5 rounded-full transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                          </motion.a>
                                        )}
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-white text-xs font-medium line-clamp-2" title={image.title}>
                                          {image.title}
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                          <span className="text-green-300 font-semibold">{image.price}</span>
                                          <span className="text-blue-300">
                                            {Math.round((image.similarity_score || 0) * 100)}% match
                                          </span>
                                        </div>
                                        {image.partNumber && (
                                          <div className="text-xs text-yellow-300 truncate">
                                            Part #: {image.partNumber}
                                          </div>
                                        )}
                                        {image.shipping && (
                                          <div className="text-xs text-gray-300 truncate">
                                            {image.shipping}
                                          </div>
                                        )}
                                        <div className="flex justify-between items-center text-xs">
                                          <span className="text-gray-300 truncate">{image.source}</span>
                                          {image.metadata?.link && (
                                            <span className="text-blue-400 cursor-pointer hover:text-blue-300">
                                              View →
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {analysisResults.similarImages.length > 6 && (
                                <div className="text-center mt-3">
                                  <span className="text-gray-400 text-xs">
                                    +{analysisResults.similarImages.length - 6} more similar parts found
                                  </span>
                                </div>
                              )}
                            </motion.div>
                          )}

                          {/* Enhanced Detailed Similar Parts List with eBay Focus */}
                          {analysisResults?.similarImages && analysisResults.similarImages.length > 0 && (
                            <motion.div
                              variants={fadeInScale}
                              className="p-4 rounded-xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-white/10 hover:border-white/20 transition-colors"
                            >
                              <div className="text-gray-400 text-sm mb-3 flex items-center justify-between">
                                <div className="flex items-center">
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Available from Suppliers
                                  {analysisResults.similarImages.some((img: any) => img.isEbay) && (
                                    <span className="ml-2 text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded-full border border-blue-500/30">
                                      eBay Live
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs">Click to view details</span>
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {analysisResults.similarImages.slice(0, 10).map((image: any, index) => (
                                  <motion.div
                                    key={index}
                                    whileHover={{ scale: 1.02 }}
                                    className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 hover:border-white/10"
                                    onClick={() => {
                                      if (image.metadata?.link) {
                                        window.open(image.metadata.link, '_blank', 'noopener,noreferrer');
                                      }
                                    }}
                                  >
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 relative">
                                      <ImageWithFallback
                                        src={image.url}
                                        alt={image.title}
                                        className="w-full h-full object-cover"
                                      />
                                      {image.isEbay && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-blue-600/90 text-white text-xs px-1 py-0.5 text-center">
                                          eBay
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-white text-sm font-medium line-clamp-2 mb-1" title={image.title}>
                                        {image.title}
                                      </div>
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-gray-400 truncate">{image.source}</span>
                                        <span className="text-green-300 font-semibold">{image.price}</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1 text-xs">
                                        {image.partNumber && (
                                          <span className="text-yellow-300 bg-yellow-600/20 px-2 py-0.5 rounded">
                                            #{image.partNumber}
                                          </span>
                                        )}
                                        {image.condition && (
                                          <span className="text-green-300 bg-green-600/20 px-2 py-0.5 rounded">
                                            {image.condition}
                                          </span>
                                        )}
                                        {image.shipping && (
                                          <span className="text-blue-300 bg-blue-600/20 px-2 py-0.5 rounded truncate">
                                            {image.shipping}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                                      <span className="text-xs text-blue-300 font-medium">
                                        {Math.round((image.similarity_score || 0) * 100)}% match
                                      </span>
                                      {image.metadata?.link && (
                                        <div className="flex items-center text-xs text-blue-400 hover:text-blue-300">
                                          <ExternalLink className="w-3 h-3 mr-1" />
                                          View
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                              {analysisResults.similarImages.length > 10 && (
                                <div className="text-center mt-3 pt-3 border-t border-white/10">
                                  <span className="text-gray-400 text-xs">
                                    +{analysisResults.similarImages.length - 10} more results available
                                  </span>
                                </div>
                              )}
                            </motion.div>
                          )}

                          {/* Actions */}
                          <motion.div
                            variants={fadeInScale}
                            className="flex flex-col sm:flex-row gap-3 pt-4"
                          >
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex-1"
                            >
                              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-12 shadow-lg shadow-purple-500/25">
                                <Download className="w-4 h-4 mr-2" />
                                Save Results
                              </Button>
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex-1"
                            >
                              <Button 
                                variant="outline" 
                                className="w-full border-gray-600 text-gray-300 hover:bg-white/10 h-12"
                                onClick={() => {
                                  if (analysisResults?.similarImages && analysisResults.similarImages.length > 0) {
                                    const firstLink = analysisResults.similarImages.find(img => img.metadata?.link)?.metadata?.link;
                                    if (firstLink) {
                                      window.open(firstLink, '_blank', 'noopener,noreferrer');
                                    }
                                  }
                                }}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Find Suppliers
                              </Button>
                            </motion.div>
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        {...fadeInScale}
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        <motion.div
                          animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{ 
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <FileText className="w-16 h-16 text-gray-400 mb-4" />
                        </motion.div>
                        <p className="text-gray-400 text-lg">Upload an image to get started</p>
                        <p className="text-gray-500 text-sm">AI analysis will appear here</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
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

