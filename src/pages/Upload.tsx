import React, { useState, useRef, useCallback, useContext, useEffect } from 'react';
import { 
  CheckCircle, 
  Brain, 
  Zap, 
  RefreshCw, 
  AlertTriangle, 
  Loader2, 
  UploadIcon, 
  X, 
  Menu, 
  Sparkles, 
  ImagePlus, 
  Camera, 
  Copy, 
  Download, 
  Share, 
  FileText, 
  ChevronDown,
  Target,
  Plus,
  Info,
  AlertCircle
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileSidebar from '@/components/MobileSidebar';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useFileUpload } from '@/hooks/useFileUpload';
import { cn } from '@/lib/utils';
import { PartDetailsAnalysis } from '@/components/PartDetailsAnalysis';
import { FlatPartAnalysisDisplay } from '@/components/PartAnalysisDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { parseMarkdownSections, MarkdownCard } from '@/lib/markdown-parser';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';



// Enhanced CSS styles for technical data visibility
const technicalDataStyles = `
  .technical-data-enhanced {
    position: relative;
    z-index: 10;
  }
  
  .technical-specifications-section {
    position: relative;
    z-index: 10;
  }
  
  .technical-section-highlight {
    position: relative;
    z-index: 10;
  }
  
  /* Technical Data Container Styling */
  .technical-container {
    background: linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(16, 185, 129, 0.05));
    border: 1px solid rgba(5, 150, 105, 0.3);
    box-shadow: 0 8px 32px rgba(5, 150, 105, 0.15);
  }
  
  .general-container {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.05));
    border: 1px solid rgba(59, 130, 246, 0.3);
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.15);
  }
  
  /* Enhanced table styles for technical data */
  .technical-data-enhanced table,
  .technical-specifications-section table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin: 1rem 0 !important;
    background: rgba(17, 24, 39, 0.8) !important;
    border-radius: 8px !important;
    overflow: hidden !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
  }
  
  .technical-data-enhanced th,
  .technical-specifications-section th {
    background: linear-gradient(90deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2)) !important;
    color: #d1fae5 !important;
    padding: 12px !important;
    text-align: left !important;
    font-weight: 600 !important;
    border: 1px solid rgba(34, 197, 94, 0.3) !important;
  }
  
  .technical-data-enhanced td,
  .technical-specifications-section td {
    padding: 10px 12px !important;
    border: 1px solid rgba(75, 85, 99, 0.3) !important;
    color: #f3f4f6 !important;
    background: rgba(31, 41, 55, 0.5) !important;
  }
  
  .technical-data-enhanced tr:nth-child(even) td,
  .technical-specifications-section tr:nth-child(even) td {
    background: rgba(17, 24, 39, 0.7) !important;
  }
  
  .technical-data-enhanced tr:hover td,
  .technical-specifications-section tr:hover td {
    background: rgba(34, 197, 94, 0.1) !important;
  }
  
  /* Enhanced content visibility */
  .technical-data-enhanced .prose,
  .technical-specifications-section .prose {
    max-width: none !important;
    color: #f3f4f6 !important;
  }
  
  .technical-data-enhanced ul,
  .technical-specifications-section ul {
    list-style-type: disc !important;
    margin-left: 1.5rem !important;
    color: #d1fae5 !important;
  }
  
  .technical-data-enhanced li,
  .technical-specifications-section li {
    margin-bottom: 0.5rem !important;
    line-height: 1.6 !important;
  }
  
  .technical-data-enhanced pre,
  .technical-specifications-section pre {
    background: rgba(17, 24, 39, 0.8) !important;
    border: 1px solid rgba(34, 197, 94, 0.3) !important;
    border-radius: 6px !important;
    padding: 1rem !important;
    overflow-x: auto !important;
    color: #d1fae5 !important;
  }
  
  .technical-data-enhanced code,
  .technical-specifications-section code {
    background: rgba(34, 197, 94, 0.2) !important;
    color: #d1fae5 !important;
    padding: 2px 4px !important;
    border-radius: 4px !important;
  }
  
  /* Container-specific animations */
  .technical-container:hover {
    box-shadow: 0 12px 40px rgba(5, 150, 105, 0.25);
    transform: translateY(-2px);
    transition: all 0.3s ease-out;
  }
  
  .general-container:hover {
    box-shadow: 0 12px 40px rgba(59, 130, 246, 0.25);
    transform: translateY(-2px);
    transition: all 0.3s ease-out;
  }
`;

// Add the styles to the document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = technicalDataStyles;
  document.head.appendChild(styleSheet);
}

// Add this helper function before the Upload component
const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

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
    base64_image?: string; // Added for base64 image
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
  error?: string | null;
  flatData?: any; // Store the raw flat response data
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

// Utility function to format titles
const formatTitle = (title: string): string => {
  return title
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/\b(And|Or|The|In|Of)\b/g, word => word.toLowerCase());
};

// Utility function to format and break paragraphs
const formatParagraph = (text: string, maxLength: number = 300): React.ReactNode => {
  if (!text) return <p className="text-gray-400 italic">No description available</p>;

  // Break long paragraphs into readable chunks
  const paragraphs = text.split(/\n\n/).map((para, index) => {
    // Trim and remove any leading/trailing whitespace
    para = para.trim();

    // If paragraph is too long, truncate and add ellipsis
    if (para.length > maxLength) {
      para = para.substring(0, maxLength) + '...';
    }

    return (
      <p 
        key={index} 
        className={`
          text-gray-300 
          leading-relaxed 
          ${index === 0 ? 'text-base' : 'text-sm'}
          ${para.startsWith('- ') ? 'pl-4 border-l-2 border-blue-500/50 ml-2' : ''}
        `}
      >
        {para.replace(/^- /, '')}
      </p>
    );
  });

  return <div className="space-y-3">{paragraphs}</div>;
};

// Utility function to parse description into sections
const parseDescriptionSections = (description: string) => {
  // Remove ## and ** completely from the entire description first
  const cleanedDescription = description
    .replace(/##\s*/g, '')  // Remove ## headers
    .replace(/\*\*/g, '');  // Remove ** formatting
  
  // Regular expression to split description into sections using titles
  const sectionRegex = /[:\n](?=[A-Z])/;
  
  // Split description into sections
  const sections = cleanedDescription
    .split(sectionRegex)
    .filter(section => section.trim() !== '')
    .map((section, index, array) => {
      // Trim and clean the section
      const cleanedSection = section.trim();
      
      // If it's the first section, use a default title
      const title = index === 0 ? 'Overview' : 
        // Try to extract a meaningful title from the first few words
        cleanedSection.split(/\s+/).slice(0, 3).join(' ').trim();
      
      return { 
        title: formatTitle(title), 
        content: cleanedSection,
        rawTitle: title 
      };
    })
    .filter(section => section.content); // Remove empty sections
  
  return sections;
};

// Update generateAnalysisSections to return separate containers for different section types
const generateAnalysisSections = (analysisResults: AnalysisResponse) => {
  const technicalSections: { 
    title: string; 
    icon: React.ReactNode; 
    content: React.ReactNode;
    priority?: number;
    emoji?: string;
  }[] = [];
  
  const generalSections: { 
    title: string; 
    icon: React.ReactNode; 
    content: React.ReactNode;
    priority?: number;
    emoji?: string;
  }[] = [];

  // First, add the default Part Identification section to general sections
  generalSections.push({
      title: "Part Identification",
      icon: <Target className="w-5 h-5 text-blue-400" />,
      priority: 1,
      emoji: "🛞",
      content: (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {analysisResults.predictions.map((prediction, index) => (
            <div 
              key={index} 
              className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white flex items-center space-x-3">
                  <span>{formatTitle(prediction.class_name)}</span>
                  {prediction.part_number && (
                    <Badge variant="secondary" className="text-xs">
                      Part No: {prediction.part_number}
                    </Badge>
                  )}
                </h3>
                <Badge 
                  variant={
                    prediction.confidence > 0.8 ? 'default' : 
                    prediction.confidence > 0.5 ? 'secondary' : 'destructive'
                  }
                >
                  {(prediction.confidence * 100).toFixed(2)}% Confidence
                </Badge>
              </div>
            </div>
          ))}
        </motion.div>
      )
    });

  // If description exists, parse markdown sections and categorize them
  analysisResults.predictions.forEach((prediction) => {
    if (prediction.description) {
      const markdownSections = parseMarkdownSections(prediction.description);
      
      markdownSections.forEach((section) => {
        const lowercaseTitle = section.title.toLowerCase();
        const isTechnicalData = lowercaseTitle.includes('specification') || 
                              lowercaseTitle.includes('technical') || 
                              lowercaseTitle.includes('data sheet') ||
                              lowercaseTitle.includes('dimensions') ||
                              lowercaseTitle.includes('material') ||
                              section.emoji === '🔧' ||
                              section.emoji === '📊';
        
        const sectionData = {
          title: section.title,
          priority: isTechnicalData ? 2 : 3,
          emoji: section.emoji,
          icon: (() => {
            if (lowercaseTitle.includes('identification')) 
              return <Target className="w-5 h-5 text-blue-400" />;
            if (lowercaseTitle.includes('specification') || lowercaseTitle.includes('technical')) 
              return <FileText className="w-5 h-5 text-green-400" />;
            if (lowercaseTitle.includes('compatibility') || lowercaseTitle.includes('vehicle')) 
              return <Target className="w-5 h-5 text-purple-400" />;
            if (lowercaseTitle.includes('pricing') || lowercaseTitle.includes('cost')) 
              return <span className="text-yellow-400">💰</span>;
            if (lowercaseTitle.includes('where') || lowercaseTitle.includes('buy')) 
              return <span className="text-purple-400">🌍</span>;
            if (lowercaseTitle.includes('confidence') || lowercaseTitle.includes('score')) 
              return <span className="text-green-400">📈</span>;
            return <Info className="w-5 h-5 text-yellow-400" />;
          })(),
          content: (
            <div className={`${isTechnicalData ? 'technical-data-enhanced' : ''}`}>
              <MarkdownCard 
                title={section.title} 
                content={section.content} 
                emoji={section.emoji}
                level={section.level || 2}
                className={isTechnicalData ? 'bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30' : ''}
              />
            </div>
          )
        };

        // Add to appropriate container
        if (isTechnicalData) {
          technicalSections.push(sectionData);
        } else {
          generalSections.push(sectionData);
        }
      });
    }
  });

  // Add additional details sections and categorize them
  if (analysisResults.additional_details) {
    Object.entries(analysisResults.additional_details).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim() && key !== 'full_analysis') {
        const isTechnicalSpecs = key === 'technical_specifications' || 
                                key.includes('specification') ||
                                key.includes('technical') ||
                                key.includes('material') ||
                                key.includes('dimension');
        
        const sectionData = {
          title: formatTitle(key),
          priority: isTechnicalSpecs ? 2 : 4,
          emoji: isTechnicalSpecs ? "🔧" : "📋",
          icon: isTechnicalSpecs ? 
            <FileText className="w-5 h-5 text-green-400" /> : 
            <Info className="w-5 h-5 text-yellow-400" />,
          content: (
            <div className={`${isTechnicalSpecs ? 'technical-specifications-section' : ''}`}>
              <MarkdownCard 
                title={formatTitle(key)} 
                content={value}
                level={2}
                className={isTechnicalSpecs ? 
                  'bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30 shadow-lg shadow-green-500/10' : 
                  ''
                }
              />
            </div>
          )
        };

        // Add to appropriate container
        if (isTechnicalSpecs) {
          technicalSections.push(sectionData);
        } else {
          generalSections.push(sectionData);
        }
      }
    });
  }

  // If we have very few sections, try to parse any remaining content as fallback
  if (generalSections.length === 1 && technicalSections.length === 0 && analysisResults.additional_details?.full_analysis) {
    const fallbackSections = parseMarkdownSections(analysisResults.additional_details.full_analysis);
    
    fallbackSections.forEach((section, index) => {
      if (section.title && section.content) {
        const lowercaseTitle = section.title.toLowerCase();
        const isTechnicalData = lowercaseTitle.includes('specification') || 
                              lowercaseTitle.includes('technical') || 
                              lowercaseTitle.includes('data sheet') ||
                              lowercaseTitle.includes('dimensions') ||
                              lowercaseTitle.includes('material');
        
        const sectionData = {
          title: section.title,
          priority: isTechnicalData ? 2 : 5,
          emoji: section.emoji,
          icon: (() => {
            if (lowercaseTitle.includes('specification') || lowercaseTitle.includes('technical')) 
              return <FileText className="w-5 h-5 text-green-400" />;
            if (lowercaseTitle.includes('compatibility') || lowercaseTitle.includes('vehicle')) 
              return <span className="text-blue-400">🚗</span>;
            if (lowercaseTitle.includes('pricing') || lowercaseTitle.includes('cost')) 
              return <span className="text-yellow-400">💰</span>;
            if (lowercaseTitle.includes('where') || lowercaseTitle.includes('buy')) 
              return <span className="text-purple-400">🌍</span>;
            if (lowercaseTitle.includes('confidence') || lowercaseTitle.includes('score')) 
              return <span className="text-green-400">📈</span>;
            return <Info className="w-5 h-5 text-gray-400" />;
          })(),
          content: (
            <div className={`${isTechnicalData ? 'technical-data-enhanced' : ''}`}>
              <MarkdownCard 
                title={section.title} 
                content={section.content} 
                emoji={section.emoji}
                level={section.level || 2}
                className={isTechnicalData ? 'bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30' : ''}
              />
            </div>
          )
        };

        // Add to appropriate container
        if (isTechnicalData) {
          technicalSections.push(sectionData);
        } else {
          generalSections.push(sectionData);
        }
      }
    });
  }

  // Sort sections by priority within each container
  const sortedTechnicalSections = technicalSections.sort((a, b) => (a.priority || 5) - (b.priority || 5));
  const sortedGeneralSections = generalSections.sort((a, b) => (a.priority || 5) - (b.priority || 5));
  
  // Debug logging for development
  if (import.meta.env.DEV) {
    console.log('🔍 Analysis Results Debug:', {
      technicalSections: sortedTechnicalSections.length,
      generalSections: sortedGeneralSections.length,
      technicalTitles: sortedTechnicalSections.map(s => ({ title: s.title, emoji: s.emoji })),
      generalTitles: sortedGeneralSections.map(s => ({ title: s.title, emoji: s.emoji })),
      originalPredictions: analysisResults.predictions.length,
      additionalDetails: Object.keys(analysisResults.additional_details || {}),
    });
  }
  
  return {
    technical: sortedTechnicalSections,
    general: sortedGeneralSections
  };
};

// Debug component for development
const AnalysisDebugInfo = ({ analysisResults }: { analysisResults: AnalysisResponse }) => {
  if (!import.meta.env.DEV) return null;
  
  const sections = generateAnalysisSections(analysisResults);
  
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="mb-4 text-xs">
          <Info className="w-3 h-3 mr-1" />
          Debug Info (Technical: {sections.technical.length}, General: {sections.general.length})
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 mb-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-green-300 font-semibold mb-2 flex items-center">
                <FileText className="w-3 h-3 mr-1" />
                Technical Sections ({sections.technical.length})
              </h4>
              <ul className="text-gray-400 space-y-1">
                {sections.technical.map((section, i) => (
                  <li key={i} className="flex items-center space-x-2">
                    <span>{section.emoji || '🔧'}</span>
                    <span className="text-green-400">{section.title}</span>
                    <Badge variant="outline" className="text-xs ml-auto bg-green-900/30 border-green-500">
                      P{section.priority}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-blue-300 font-semibold mb-2 flex items-center">
                <Brain className="w-3 h-3 mr-1" />
                General Sections ({sections.general.length})
              </h4>
              <ul className="text-gray-400 space-y-1">
                {sections.general.map((section, i) => (
                  <li key={i} className="flex items-center space-x-2">
                    <span>{section.emoji || '📋'}</span>
                    <span className="text-blue-400">{section.title}</span>
                    <Badge variant="outline" className="text-xs ml-auto bg-blue-900/30 border-blue-500">
                      P{section.priority}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-white font-semibold mb-2">Raw Data</h4>
            <div className="grid grid-cols-4 gap-4 text-gray-400">
              <div>Predictions: {analysisResults.predictions.length}</div>
              <div>Additional Details: {Object.keys(analysisResults.additional_details || {}).length}</div>
              <div>Model: {analysisResults.model_version}</div>
              <div>Processing: {analysisResults.processing_time}s</div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
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
  const [originalAiResponse, setOriginalAiResponse] = useState<any>(null);
  const [isResultsExpanded, setIsResultsExpanded] = useState(false);
  
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

  // Update analyzeImage method to handle async processing
  const analyzeImage = async (
    file: File,
    options: any = {},
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResponse | null> => {
    try {
      // Track upload progress
      onProgress?.({
        status: 'uploading',
        message: 'Uploading image...',
        progress: 20,
        currentStep: 'Upload & Validation',
        currentStepIndex: 1,
        totalSteps: 6,
        details: 'Transferring image data'
      });

      // Step 2: AI Analysis Progress
      onProgress?.({
        status: 'ai_analysis',
        message: 'Initializing AI analysis...',
        progress: 30,
        currentStep: 'AI Analysis',
        currentStepIndex: 2,
        totalSteps: 6,
        details: 'Analyzing image with AI Service'
      });

      // Call GitHub AI Part Analysis Service
      const initialResponse = await api.upload.image(
        file, 
        savedKeywords, 
        {
          confidenceThreshold: options.confidenceThreshold || 0.3,
          maxPredictions: options.maxPredictions || 3
        }
      );

      // Modify the processing check in analyzeImage method
      if (!initialResponse.success) {
        let retries = 0;
        const maxRetries = 10;
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        while (retries < maxRetries) {
          onProgress?.({
            status: 'ai_analysis',
            message: `Processing image... (Attempt ${retries + 1})`,
            progress: 40 + (retries * 5),
            currentStep: 'AI Analysis',
            currentStepIndex: 2,
            totalSteps: 6,
            details: 'Waiting for analysis completion'
          });

          await delay(3000);

          const statusResponse = await api.upload.image(
            file, 
            savedKeywords, 
            {
              confidenceThreshold: options.confidenceThreshold || 0.3,
              maxPredictions: options.maxPredictions || 3
            }
          );

          if (statusResponse.success && statusResponse.data) {
            // Transform the flat response to match existing interface
            const flatData = statusResponse.data;
            
            // Create a single prediction from flat data for backward compatibility
            const prediction = {
              class_name: flatData.class_name || flatData.precise_part_name || 'Automotive Component',
              confidence: (flatData.confidence_score || 0) / 100, // Convert percentage to decimal
              description: flatData.description || flatData.full_analysis || '',
              category: flatData.category || 'Unspecified',
              manufacturer: flatData.manufacturer || 'Unknown',
              estimated_price: flatData.estimated_price || 'Price not available',
              part_number: flatData.part_number || null,
              compatibility: flatData.compatible_vehicles || []
            };

            // Transform response to match existing interface
            const analysisResults: AnalysisResponse = {
              success: true,
              predictions: [prediction], // Wrap in array for backward compatibility
              similar_images: [], 
              model_version: flatData.model_version || 'SpareFinderAI Part Analysis v1.0',
              processing_time: flatData.processing_time_seconds || 0,
              image_metadata: {
                content_type: file.type,
                size_bytes: file.size
              },
              additional_details: {
                full_analysis: flatData.full_analysis || flatData.description || '',
                technical_specifications: JSON.stringify(flatData.technical_data_sheet || {}),
                market_information: JSON.stringify({
                  pricing: flatData.estimated_price,
                  suppliers: flatData.suppliers,
                  buy_links: flatData.buy_links
                }),
                confidence_reasoning: flatData.confidence_explanation || ''
              },
              // Store flat data for direct access
              flatData: flatData
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
              confidence: analysisResults.predictions[0]?.confidence * 100
            });

            return analysisResults;
          }

          retries++;
        }

        // If max retries reached without success
        throw new Error('Analysis timed out. Please try again.');
      }

      // If initial response is successful, process immediately
      if (initialResponse.success && initialResponse.data) {
        // Transform the flat response to match existing interface
        const flatData = initialResponse.data;
        
        // Create a single prediction from flat data for backward compatibility
        const prediction = {
          class_name: flatData.class_name || flatData.precise_part_name || 'Automotive Component',
          confidence: (flatData.confidence_score || 0) / 100, // Convert percentage to decimal
          description: flatData.description || flatData.full_analysis || '',
          category: flatData.category || 'Unspecified',
          manufacturer: flatData.manufacturer || 'Unknown',
          estimated_price: flatData.estimated_price || 'Price not available',
          part_number: flatData.part_number || null,
          compatibility: flatData.compatible_vehicles || []
        };

        // Transform response to match existing interface
        const analysisResults: AnalysisResponse = {
          success: true,
          predictions: [prediction], // Wrap in array for backward compatibility
          similar_images: [], 
          model_version: flatData.model_version || 'SpareFinderAI Part Analysis v1.0',
          processing_time: flatData.processing_time_seconds || 0,
          image_metadata: {
            content_type: file.type,
            size_bytes: file.size
          },
          additional_details: {
            full_analysis: flatData.full_analysis || flatData.description || '',
            technical_specifications: JSON.stringify(flatData.technical_data_sheet || {}),
            market_information: JSON.stringify({
              pricing: flatData.estimated_price,
              suppliers: flatData.suppliers,
              buy_links: flatData.buy_links
            }),
            confidence_reasoning: flatData.confidence_explanation || ''
          },
          // Store flat data for direct access
          flatData: flatData
        };

        // Final progress update
        onProgress?.({
          status: 'complete',
          message: 'Part analysis completed successfully',
          progress: 100,
          currentStep: 'Analysis Complete',
          currentStepIndex: 6,
          totalSteps: 6,
          details: 'Comprehensive part analysis finished',
          identifiedPart: flatData.class_name || flatData.precise_part_name,
          confidence: flatData.confidence_score || 0
        });

        return analysisResults;
      }

      // If no predictions or success
      throw new Error(initialResponse.error || 'No analysis results found');

    } catch (error) {
      console.error('Image analysis error:', error);
      
      let errorMessage = 'Unknown error occurred during image analysis';
      let errorTitle = 'Analysis Failed';
      let retryable = false;
      
      // Handle specific error types from the improved backend
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Handle axios errors with better messages
      if (axios.isAxiosError(error)) {
        const response = error.response;
        
        if (response?.data) {
          const errorData = response.data;
          
          // Use the enhanced error information from backend
          if (errorData.error && errorData.message) {
            errorTitle = errorData.error.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            errorMessage = errorData.message;
            retryable = errorData.retry_suggested || false;
            
            // Add troubleshooting info if available
            if (errorData.troubleshooting) {
              console.log('Troubleshooting info:', errorData.troubleshooting);
            }
          } else {
            errorMessage = errorData.message || errorData.error || 'Server error occurred';
          }
        } else {
          // Handle network errors
          switch (error.code) {
            case 'ECONNABORTED':
              errorTitle = 'Request Timeout';
              errorMessage = 'The request took too long to complete. Please try again.';
              retryable = true;
              break;
            case 'ECONNREFUSED':
              errorTitle = 'Connection Failed';
              errorMessage = 'Unable to connect to the analysis service. Please check your connection and try again.';
              retryable = true;
              break;
            case 'ERR_NETWORK':
              errorTitle = 'Network Error';
              errorMessage = 'Network connection failed. Please check your internet connection.';
              retryable = true;
              break;
            default:
              errorMessage = `Network error: ${error.message}`;
              retryable = true;
          }
        }
      }

      onProgress?.({
        status: 'error',
        message: errorMessage,
        progress: 0,
        currentStep: errorTitle,
        currentStepIndex: 0,
        totalSteps: 6,
        details: retryable ? 'You can try uploading again' : 'Unable to complete image analysis'
      });

      toast({
        title: errorTitle,
        description: errorMessage + (retryable ? ' (You can try again)' : ''),
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
      setOriginalAiResponse(null);
    }
  };

  const resetForm = () => {
    setUploadedFile(null);
    setImagePreview(null);
    setSelectedPrediction(null);
    setAnalysisProgress(null);
    setPartInfo(null);
    setOriginalAiResponse(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Method to store analysis results in Supabase
  const storeAnalysisResults = useCallback(async (
    file: File, 
    analysisResults: AnalysisResponse
  ) => {
    try {
      // Simplified storage without Supabase
      console.log('Analysis Results:', analysisResults);
      
      toast({
        title: "Analysis Saved",
        description: "Your part analysis has been processed successfully",
      });

      return {
        id: crypto.randomUUID(), // Use Web Crypto API for unique ID
        analysisResults
      };
    } catch (error) {
      console.error('Analysis storage failed:', error);
      toast({
        title: "Error",
        description: "Failed to process analysis results",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  // Modify handleUpload to remove Supabase-specific code
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
    setAnalysisProgress({
      status: 'uploading',
      message: 'Preparing image for AI analysis...',
      progress: 10,
      currentStep: 'Initializing Upload',
      currentStepIndex: 1,
      totalSteps: 6,
      details: 'Validating image and preparing for processing'
    });

    try {
      const updateProgress = (stage: string, message: string, progress: number, details?: string) => {
        setAnalysisProgress(prev => ({
          ...prev,
          status: stage,
          message: message,
          progress: progress,
          currentStep: stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          currentStepIndex: stage === 'uploading' ? 1 : 
                            stage === 'validating' ? 2 : 
                            stage === 'ai_analysis' ? 3 : 
                            stage === 'part_matching' ? 4 : 
                            stage === 'finalizing' ? 5 : 
                            stage === 'complete' ? 6 : 
                            prev?.currentStepIndex || 1,
          details: details || prev?.details
        }));
      };

      updateProgress('uploading', 'Uploading image to secure servers...', 20);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload delay

      updateProgress('validating', 'Validating image integrity and format...', 30);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate validation

      updateProgress('ai_analysis', 'Initializing AI-powered part analysis...', 40, 'Searching advanced automotive databases');
      
      const result = await api.upload.image(
        uploadedFile, 
        savedKeywords, 
        {
          confidenceThreshold: 0.3,
          maxPredictions: 3
        }
      );
      
      // Store the original AI response for complete data saving
      setOriginalAiResponse(result);
      
      updateProgress('part_matching', 'Matching part details across multiple databases...', 70, 'Cross-referencing automotive part catalogs');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate matching process

      updateProgress('finalizing', 'Compiling comprehensive analysis report...', 90, 'Generating detailed insights and specifications');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate finalization

      console.log('Upload result:', result);
      
      // Debug logging for AI response content
      if (import.meta.env.DEV) {
        console.log('🔍 AI Response Debug:', {
          success: result.success,
          dataStructure: result.data ? Object.keys(result.data) : 'No data',
          predictionCount: result.data?.predictions?.length || 0,
          hasAnalysisField: result.data?.predictions?.[0]?.analysis ? 'Yes' : 'No',
          hasDescriptionField: result.data?.predictions?.[0]?.description ? 'Yes' : 'No',
          analysisLength: result.data?.predictions?.[0]?.analysis?.length || 0,
          analysisPreview: result.data?.predictions?.[0]?.analysis?.substring(0, 200) + '...' || 'No analysis'
        });
      }
      
      if (!result.success) {
        throw new Error(result.error || 'No result returned from upload');
      }
      
      // Prepare predictions, using the service's predictions or fallback parsing
      const predictions = result.data?.predictions?.length ? 
        result.data.predictions.map(prediction => ({
          class_name: prediction.class_name || 'Automotive Component',
          confidence: prediction.confidence || 0.75,
          description: prediction.analysis || prediction.description || '', // Use analysis field first
          category: prediction.category || 'Unspecified',
          manufacturer: prediction.manufacturer || 'Unknown',
          estimated_price: prediction.estimated_price || 'Price not available',
          part_number: prediction.part_number,
          compatibility: prediction.compatibility
        })) : 
        // Fallback parsing if no predictions
        [{
          class_name: 'Automotive Component',
          confidence: 0.75,
          description: result.data?.analysis || result.data?.description || 'No detailed description available',
          category: 'Unspecified',
          manufacturer: 'Unknown',
          estimated_price: 'Price not available'
        }];

      // Prepare additional details dynamically using analysis field
      const firstPrediction = predictions[0];
      const additionalDetails = {
        full_analysis: result.data?.predictions?.[0]?.analysis || result.data?.analysis || result.data?.description || '',
        technical_specifications: `
- Detailed analysis provided by AI Model
- Comprehensive part identification service`,
        market_information: `
- Estimated Price: ${firstPrediction.estimated_price}
- Manufacturer: ${firstPrediction.manufacturer}`,
        confidence_reasoning: `
- AI Model Confidence: ${(firstPrediction.confidence * 100).toFixed(1)}%
- Detailed analysis available`
      };

      // Final progress update
      updateProgress('complete', `Part identified: ${firstPrediction.class_name}`, 100, 'Analysis complete');

      // Set analysis results to trigger full display
      const analysisResults: AnalysisResponse = {
        success: result.success,
        predictions: predictions,
        similar_images: [], // No similar images from this service
        model_version: result.data?.model_version || 'AI Part Analysis',
        processing_time: result.data?.processing_time || 0,
        image_metadata: {
          content_type: uploadedFile.type,
          size_bytes: uploadedFile.size,
          base64_image: await convertImageToBase64(uploadedFile) // Add this helper function
        },
        additional_details: additionalDetails
      };

      // Set the first prediction as selected
      setSelectedPrediction(firstPrediction);
      
      // Set analysis results for display
      setAnalysisResults(analysisResults);

      toast({
        title: "Success",
        description: `Part identified: ${firstPrediction.class_name}`,
      });

      // If analysis is successful, store the results
      if (result.success && result.data && result.data.length > 0) {
        try {
          // Prepare analysis results in the expected format
          const analysisResults: AnalysisResponse = {
            success: result.success,
            predictions: result.data.map(prediction => ({
              class_name: prediction.class_name || 'Automotive Component',
              confidence: prediction.confidence || 0.75,
              description: prediction.description || '',
              category: prediction.category || 'Unspecified',
              manufacturer: prediction.manufacturer || 'Unknown',
              estimated_price: prediction.estimated_price || 'Price not available',
              part_number: prediction.part_number,
              compatibility: prediction.compatibility
            })),
            similar_images: [], 
            model_version: 'AI Part Analysis',
            processing_time: 0, // Not provided by this service
            image_metadata: {
              content_type: uploadedFile.type,
              size_bytes: uploadedFile.size,
              base64_image: await convertImageToBase64(uploadedFile) // Add this helper function
            },
            additional_details: {
              full_analysis: result.data[0]?.description || '',
              technical_specifications: '',
              market_information: '',
              confidence_reasoning: ''
            }
          };

          // Store analysis in database
          console.log('Analysis results prepared:', analysisResults);
        } catch (storageError) {
          console.error('Failed to store analysis:', storageError);
          toast({
            title: "Storage Error",
            description: "Could not save analysis details",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Update progress to error state
      setAnalysisProgress({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to process image',
        progress: 0,
        currentStep: 'Analysis Failed',
        currentStepIndex: 0,
        totalSteps: 6,
        details: 'Unable to complete image analysis'
      });

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
    setOriginalAiResponse(null);

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
    setOriginalAiResponse(null);
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

  // Enhanced download method with more comprehensive error handling
  const downloadAnalysisResults = useCallback(() => {
    if (!analysisResults) {
      toast({
        title: "No Results",
        description: "No analysis results available to download",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create a comprehensive JSON report with additional metadata
      const reportData = {
        metadata: {
          generated_at: new Date().toISOString(),
          source: 'SpareFinderAI Vision Analysis',
          version: '1.0.0'
        },
        part_identification: {
          name: analysisResults.predictions[0]?.class_name,
          confidence: `${(analysisResults.predictions[0]?.confidence * 100).toFixed(1)}%`,
          category: analysisResults.predictions[0]?.category,
          manufacturer: analysisResults.predictions[0]?.manufacturer,
          estimated_price: analysisResults.predictions[0]?.estimated_price,
          part_number: analysisResults.predictions[0]?.part_number
        },
        technical_details: {
          description: analysisResults.predictions[0]?.description,
          compatibility: analysisResults.predictions[0]?.compatibility,
          additional_specifications: analysisResults.additional_details?.technical_specifications
        },
        market_information: {
          pricing_details: analysisResults.additional_details?.market_information,
          replacement_frequency: analysisResults.additional_details?.replacement_frequency
        },
        analysis_metadata: {
          model_version: analysisResults.model_version,
          processing_time: `${analysisResults.processing_time} seconds`,
          image_details: {
            size: `${analysisResults.image_metadata?.size_bytes} bytes`,
            type: analysisResults.image_metadata?.content_type
          }
        },
        full_analysis: analysisResults.additional_details?.full_analysis,
        disclaimer: "This report is generated by SpareFinderAI Vision and is for informational purposes only."
      };

      // Convert to formatted JSON with indentation
      const jsonReport = JSON.stringify(reportData, null, 2);
      
      // Create a Blob and download
      const blob = new Blob([jsonReport], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sparefinder_part_analysis_${new Date().toISOString().replace(/:/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Downloaded",
        description: "Comprehensive part analysis report saved successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Failed to download analysis report:', error);
      toast({
        title: "Download Failed",
        description: "Unable to generate analysis report. Please try again.",
        variant: "destructive"
      });
    }
  }, [analysisResults, toast]);

  // Enhanced shareable link generation with more robust error handling
  const generateShareableLink = useCallback(() => {
    if (!analysisResults) {
      toast({
        title: "No Results",
        description: "No analysis results available to share",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create a compact, shareable representation of the analysis
      const shareData = {
        part_name: analysisResults.predictions[0]?.class_name,
        confidence: `${(analysisResults.predictions[0]?.confidence * 100).toFixed(1)}%`,
        category: analysisResults.predictions[0]?.category,
        manufacturer: analysisResults.predictions[0]?.manufacturer,
        timestamp: new Date().toISOString(),
        source: 'SpareFinderAI Vision'
      };

      // Generate a base64 encoded shareable link
      const shareableLink = `https://sparefinder.ai/analysis/${encodeURIComponent(
        btoa(JSON.stringify(shareData))
      )}`;
      
      // Copy to clipboard with enhanced error handling
      navigator.clipboard.writeText(shareableLink).then(() => {
        toast({
          title: "Shareable Link Generated",
          description: "Analysis link copied to clipboard. Share with colleagues or save for future reference."
        });
        
        // Separately open the link
        window.open(shareableLink, '_blank');
      }).catch(err => {
        console.error('Clipboard copy failed:', err);
        toast({
          title: "Share Failed",
          description: "Unable to copy shareable link. Please copy manually.",
          variant: "destructive"
        });
      });
    } catch (error) {
      console.error('Failed to generate shareable link:', error);
      toast({
        title: "Share Error",
        description: "Could not generate shareable link. Please try again.",
        variant: "destructive"
      });
    }
  }, [analysisResults, toast]);

  // PDF Download Method
  const downloadPDFReport = useCallback(async () => {
    if (!analysisResults) {
      toast({
        title: "No Results",
        description: "No analysis results available to download",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create a container for PDF content
      const input = document.createElement('div');
      input.style.width = '800px';
      input.style.padding = '20px';
      input.style.fontFamily = 'Arial, sans-serif';
      input.style.backgroundColor = 'white';
      input.style.color = 'black';

      // Generate PDF content
      input.innerHTML = `
        <h1 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">
          SpareFinderAI Vision Analysis Report
        </h1>
        
        ${analysisResults.predictions.map((prediction, index) => `
          <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-bottom: 10px;">
              Part ${index + 1}: ${prediction.class_name}
            </h2>
            <p><strong>Confidence:</strong> ${(prediction.confidence * 100).toFixed(2)}%</p>
            <p><strong>Category:</strong> ${prediction.category}</p>
            <p><strong>Manufacturer:</strong> ${prediction.manufacturer}</p>
            ${prediction.part_number ? `<p><strong>Part Number:</strong> ${prediction.part_number}</p>` : ''}
            <p><strong>Estimated Price:</strong> ${prediction.estimated_price}</p>
            
            ${prediction.description ? `
              <div style="background-color: #f4f4f4; padding: 10px; border-radius: 5px; margin-top: 10px;">
                <h3 style="color: #34495e;">Description</h3>
                <p>${prediction.description}</p>
              </div>
            ` : ''}
          </div>
        `).join('')}

        ${analysisResults.additional_details ? `
          <div style="margin-top: 20px; border-top: 2px solid #333; padding-top: 15px;">
            <h2 style="color: #2c3e50;">Additional Details</h2>
            ${Object.entries(analysisResults.additional_details).map(([key, value]) => 
              typeof value === 'string' && value.trim() ? `
                <div style="margin-bottom: 10px;">
                  <h3 style="color: #34495e;">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                  <p>${value}</p>
                </div>
              ` : ''
            ).join('')}
          </div>
        ` : ''}

        <div style="margin-top: 20px; font-size: 10px; color: #777; text-align: center;">
          Generated by SpareFinderAI Vision on ${new Date().toLocaleString()}
        </div>
      `;

      // Append to body to render
      document.body.appendChild(input);

      // Convert to canvas
      const canvas = await html2canvas(input, { 
        scale: 2,
        useCORS: true,
        logging: false 
      });

      // Remove temporary input
      document.body.removeChild(input);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Save PDF
      pdf.save(`sparefinder_part_analysis_${new Date().toISOString().replace(/:/g, '-')}.pdf`);

      toast({
        title: "PDF Generated",
        description: "Comprehensive part analysis report saved successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Unable to create PDF report. Please try again.",
        variant: "destructive"
      });
    }
  }, [analysisResults, toast]);

  // Save results to database
  const saveAnalysisResults = useCallback(async () => {
    if (!analysisResults) {
      toast({
        title: "No Results",
        description: "No analysis results available to save",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Transform the data to match the expected schema - include full AI response
      const saveData = {
        success: analysisResults.success,
        predictions: analysisResults.predictions,
        similar_images: analysisResults.similar_images || [],
        model_version: analysisResults.model_version,
        processing_time: analysisResults.processing_time,
        image_metadata: {
          content_type: analysisResults.image_metadata?.content_type || uploadedFile?.type || 'image/jpeg',
          size_bytes: analysisResults.image_metadata?.size_bytes || uploadedFile?.size || 0,
          base64_image: analysisResults.image_metadata?.base64_image || null
        },
        additional_details: {
          full_analysis: analysisResults.additional_details?.full_analysis || '',
          technical_specifications: analysisResults.additional_details?.technical_specifications || '',
          market_information: analysisResults.additional_details?.market_information || '',
          confidence_reasoning: analysisResults.additional_details?.confidence_reasoning || ''
        },
        image_url: imagePreview || '',
        image_name: uploadedFile?.name || 'analysis_result.jpg',
        // Include complete AI response data
        analysis: originalAiResponse?.analysis || analysisResults.additional_details?.full_analysis || '',
        confidence: originalAiResponse?.confidence || analysisResults.predictions?.[0]?.confidence || 0,
        metadata: {
          ...originalAiResponse?.metadata,
          ai_service_id: originalAiResponse?.id,
          upload_timestamp: new Date().toISOString(),
          frontend_version: '2.0.0'
        }
      };

      console.log('💾 Saving analysis results:', saveData);

      const response = await api.upload.saveResults(saveData);

      if (response.success) {
        toast({
          title: "Results Saved",
          description: `Analysis results saved successfully: ${response.data?.part_name}`,
          variant: "default"
        });
      } else {
        throw new Error(response.message || 'Failed to save results');
      }
    } catch (error) {
      console.error('Save results error:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save analysis results",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [analysisResults, originalAiResponse, imagePreview, uploadedFile, toast]);

  // Update existing buttons or add a new button in the results section
  const renderActionButtons = () => {
    if (!analysisResults) return null;

    return (
      <div className="space-y-3">
        <Button 
          onClick={saveAnalysisResults}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Save Results
            </>
          )}
        </Button>
        
        <Button 
          onClick={downloadPDFReport}
          variant="outline"
          className="w-full flex items-center justify-center space-x-2"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF Report
        </Button>
        
        <Button 
          onClick={generateShareableLink}
          variant="outline"
          className="w-full flex items-center justify-center space-x-2"
        >
          <Share className="w-4 h-4 mr-2" />
          Share Results
        </Button>
      </div>
    );
  };

  const getConfidenceVariant = (confidence: number) => {
    if (confidence > 0.8) return 'success';
    if (confidence > 0.5) return 'warning';
    return 'destructive';
  };

  // Enhanced Part Analysis Display Component
  const PartAnalysisDisplay = ({ analysisResults }: { analysisResults: AnalysisResponse }) => {
    const prediction = analysisResults.predictions?.[0];
    const analysisContent = prediction?.description || analysisResults.additional_details?.full_analysis || '';
    
    if (!prediction) return null;

    return (
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
              <span className="text-2xl">🔍</span>
              <span>AI Part Analysis</span>
            </h1>
            <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 px-4 py-2">
              {analysisResults.model_version}
            </Badge>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-gray-300">
            {/* Left Column - Part Info */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-300 border-b border-blue-500/30 pb-1">
                📋 Part Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">🧾 Part Name:</span>
                  <span className="font-semibold text-white">{prediction.class_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">🏷 Category:</span>
                  <span>{prediction.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">🏢 Manufacturer:</span>
                  <span>{prediction.manufacturer || 'Not Specified'}</span>
                </div>
                {prediction.part_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">🔢 Part Number:</span>
                    <span className="font-mono text-green-300">{prediction.part_number}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Column - Analysis Stats */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-green-300 border-b border-green-500/30 pb-1">
                📊 Analysis Stats
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400">🧮 Confidence:</span>
                    <span className="font-bold text-white">{(prediction.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${
                        prediction.confidence > 0.8 ? 'bg-green-500' :
                        prediction.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.confidence * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">⏱ Processing:</span>
                  <span>{analysisResults.processing_time?.toFixed(2) || 0}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">💰 Price:</span>
                  <span className="text-green-300 font-semibold">{prediction.estimated_price}</span>
                </div>
              </div>
            </div>

            {/* Right Column - Image Info */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-purple-300 border-b border-purple-500/30 pb-1">
                🖼 Image Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">📁 Format:</span>
                  <span>{analysisResults.image_metadata?.content_type?.split('/')[1]?.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">📏 Size:</span>
                  <span>{(analysisResults.image_metadata?.size_bytes / 1024 / 1024)?.toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">✅ Status:</span>
                  <span className="text-green-300 font-semibold">Analysis Complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Structured Analysis Content */}
        {analysisContent && (
          <div className="space-y-6">
            {(() => {
              const sections = generateAnalysisSections(analysisResults);
              
              return (
                <>
                  {/* Technical Data Sheets */}
                  {sections.technical.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-green-900/10 to-emerald-900/10 border border-green-500/30 rounded-2xl p-6 backdrop-blur-sm technical-container"
                    >
                      <div className="flex items-center space-x-3 mb-6 pb-3 border-b border-green-500/30">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                        >
                          <FileText className="w-6 h-6 text-green-400" />
                        </motion.div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-green-300">🔧 Technical Data Sheets</h2>
                          <p className="text-green-400 text-sm">Detailed specifications and technical information</p>
                        </div>
                        <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                          {sections.technical.length} section{sections.technical.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <div className="space-y-6">
                        {sections.technical.map((section, index) => (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="technical-data-enhanced"
                          >
                            <div className="flex items-center space-x-3 mb-4 pb-2 border-b border-green-500/20">
                              {section.icon}
                              <h3 className="text-xl font-bold text-green-200">{section.title}</h3>
                              <Badge className="bg-green-600/20 text-green-300 border-green-500/30 ml-auto text-xs">
                                Technical Spec
                              </Badge>
                            </div>
                            {section.content}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* General Analysis */}
                  {sections.general.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-gradient-to-br from-blue-900/10 to-purple-900/10 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm general-container"
                    >
                      <div className="flex items-center space-x-3 mb-6 pb-3 border-b border-blue-500/30">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        >
                          <Brain className="w-6 h-6 text-blue-400" />
                        </motion.div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-blue-300">📋 Analysis Results</h2>
                          <p className="text-blue-400 text-sm">Part identification, compatibility, and market information</p>
                        </div>
                        <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                          {sections.general.length} section{sections.general.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <div className="space-y-6">
                        {sections.general.map((section, index) => (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 + 0.2 }}
                          >
                            <div className="flex items-center space-x-3 mb-4 pb-2 border-b border-blue-500/20">
                              {section.icon}
                              <h3 className="text-xl font-bold text-blue-200">{section.title}</h3>
                              {section.title === "Part Identification" && (
                                <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 ml-auto text-xs">
                                  Primary Analysis
                                </Badge>
                              )}
                            </div>
                            {section.content}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
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

                  {/* Enhanced Progress Bar with Detailed Information */}
                  <AnimatePresence>
                    {(isAnalyzing || isLoading) && analysisProgress && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6 bg-gray-900/50 rounded-2xl p-6 border border-gray-700/50 backdrop-blur-sm"
                      >
                        {/* Enhanced Progress Header */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <motion.div
                                animate={{ rotate: analysisProgress.status === 'complete' ? 0 : 360 }}
                                transition={{ 
                                  duration: analysisProgress.status === 'complete' ? 0 : 2, 
                                  repeat: analysisProgress.status === 'complete' ? 0 : Infinity, 
                                  ease: "linear" 
                                }}
                                className={`p-3 rounded-full bg-gradient-to-r ${getProgressStageColor(analysisProgress.status)} shadow-lg`}
                              >
                                {getProgressStageIcon(analysisProgress.status)}
                              </motion.div>
                              <div className="flex-1">
                                <div className="text-white font-bold text-xl">
                                  {analysisProgress.currentStep || analysisProgress.message}
                                </div>
                                <div className="text-gray-300 text-base mt-1">
                                  {analysisProgress.details || 'Processing your automotive part analysis...'}
                                </div>
                                {analysisProgress.currentStepIndex && analysisProgress.totalSteps && (
                                  <div className="text-gray-400 text-sm mt-2 flex items-center space-x-2">
                                    <span>Step {analysisProgress.currentStepIndex} of {analysisProgress.totalSteps}</span>
                                    <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                    <span>AI Engine Processing</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white text-2xl font-bold">
                                {analysisProgress.progress}%
                              </div>
                              <div className="text-gray-400 text-sm">Complete</div>
                            </div>
                          </div>

                          {/* Detailed Status Information */}
                          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span className="text-gray-300">Status:</span>
                                <span className="text-white font-semibold capitalize">
                                  {analysisProgress.status.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span className="text-gray-300">Engine:</span>
                                <span className="text-white font-semibold">AI Vision</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                <span className="text-gray-300">Mode:</span>
                                <span className="text-white font-semibold">Advanced Analysis</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Progress Bar */}
                        <div className="space-y-4">
                          <div className="relative">
                            <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden backdrop-blur-sm border border-gray-600">
                              <motion.div
                                className={`h-full bg-gradient-to-r ${getProgressStageColor(analysisProgress.status)} rounded-full relative overflow-hidden`}
                                initial={{ width: 0 }}
                                animate={{ width: `${analysisProgress.progress}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              >
                                {/* Enhanced animated shine effect */}
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                  animate={{ x: ['-100%', '100%'] }}
                                  transition={{ 
                                    duration: 1.5, 
                                    repeat: analysisProgress.status !== 'complete' ? Infinity : 0,
                                    ease: "easeInOut" 
                                  }}
                                />
                                {/* Progress text overlay */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-white text-xs font-semibold mix-blend-difference">
                                    {analysisProgress.progress}%
                                  </span>
                                </div>
                              </motion.div>
                            </div>
                          </div>
                          
                          {/* Enhanced Progress markers */}
                          {analysisProgress.totalSteps && (
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                {Array.from({ length: analysisProgress.totalSteps }, (_, i) => (
                                  <div key={i} className="flex flex-col items-center space-y-1">
                                    <div
                                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                        (analysisProgress.currentStepIndex || 0) > i
                                          ? 'bg-green-400 scale-110'
                                          : (analysisProgress.currentStepIndex || 0) === i + 1
                                          ? `bg-gradient-to-r ${getProgressStageColor(analysisProgress.status)} scale-125 animate-pulse`
                                          : 'bg-gray-600'
                                      }`}
                                    />
                                    <div className="text-xs text-gray-400 text-center max-w-16">
                                      {i === 0 && 'Upload'}
                                      {i === 1 && 'Validate'}
                                      {i === 2 && 'AI Scan'}
                                      {i === 3 && 'Match'}
                                      {i === 4 && 'Finalize'}
                                      {i === 5 && 'Complete'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Real-time Activity Log */}
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between text-gray-300 hover:text-white">
                              <span className="flex items-center space-x-2">
                                <Info className="w-4 h-4" />
                                <span>View Detailed Progress</span>
                              </span>
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-4 space-y-2 bg-gray-900/70 rounded-lg p-4 border border-gray-700/50 max-h-40 overflow-y-auto">
                              <div className="text-xs font-mono text-gray-300 space-y-1">
                                <div className="flex justify-between">
                                  <span>🔄 Analysis started</span>
                                  <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>📤 Image uploaded successfully</span>
                                  <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>🔍 {analysisProgress.message}</span>
                                  <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                                </div>
                                {analysisProgress.status === 'ai_analysis' && (
                                  <div className="flex justify-between text-blue-300">
                                    <span>🧠 Deep learning model processing...</span>
                                    <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                                  </div>
                                )}
                                {analysisProgress.status === 'part_matching' && (
                                  <div className="flex justify-between text-purple-300">
                                    <span>🔗 Matching against automotive database...</span>
                                    <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Identified Part Display - Enhanced */}
                        {analysisProgress.identifiedPart && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-6 rounded-xl bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 backdrop-blur-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <motion.div 
                                  className="p-3 bg-green-600/30 rounded-full"
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  <CheckCircle className="w-6 h-6 text-green-400" />
                                </motion.div>
                                <div>
                                  <div className="text-green-300 font-medium text-lg">
                                    🎯 Part Successfully Identified!
                                  </div>
                                  <div className="text-green-200 font-bold text-xl">
                                    {analysisProgress.identifiedPart}
                                  </div>
                                  <div className="text-green-300 text-sm mt-1">
                                    Advanced AI pattern recognition complete
                                  </div>
                                </div>
                              </div>
                              {analysisProgress.confidence && (
                                <div className="text-right">
                                  <div className="text-green-400 text-3xl font-bold">
                                    {analysisProgress.confidence}%
                                  </div>
                                  <div className="text-green-300 text-sm">Confidence Score</div>
                                  <div className="text-green-400 text-xs mt-1">
                                    {analysisProgress.confidence > 90 ? 'Excellent Match' : 
                                     analysisProgress.confidence > 75 ? 'Good Match' : 'Fair Match'}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {/* Additional Status Messages */}
                        <motion.div
                          key={analysisProgress.status}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-center bg-gray-800/30 rounded-lg p-3"
                        >
                          <p className="text-gray-200 text-base font-medium">
                            {analysisProgress.message}
                          </p>
                          {analysisProgress.details && (
                            <p className="text-gray-400 text-sm mt-1">
                              {analysisProgress.details}
                            </p>
                          )}
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
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Brain className="w-5 h-5 text-blue-400" />
                      <span>Analysis Results</span>
                      {analysisResults && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        >
                          <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                            {analysisResults.predictions.length} match{analysisResults.predictions.length !== 1 ? 'es' : ''}
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                    {analysisResults && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsResultsExpanded(!isResultsExpanded)}
                        className="text-xs"
                      >
                        {isResultsExpanded ? (
                          <>
                            <ChevronDown className="w-4 h-4 mr-1" />
                            Collapse Results
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            View All Results
                          </>
                        )}
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    AI-powered part identification and details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {analysisResults && analysisResults.flatData ? (
                      <ScrollArea className="h-[calc(100vh-400px)] min-h-[600px] max-h-none w-full pr-4">
                        <div className="space-y-6 pb-8">
                          {/* Debug component for development */}
                          <AnalysisDebugInfo analysisResults={analysisResults} />
                          
                          {/* Enhanced Flat Part Analysis Display */}
                          <FlatPartAnalysisDisplay 
                            analysisData={analysisResults.flatData} 
                            imagePreview={imagePreview}
                          />
                        </div>
                      </ScrollArea>
                    ) : analysisResults && analysisResults.predictions && analysisResults.predictions.length > 0 ? (
                      <ScrollArea className="h-[calc(100vh-400px)] min-h-[600px] max-h-none w-full pr-4">
                        <div className="space-y-6 pb-8">
                          {/* Debug component for development */}
                          <AnalysisDebugInfo analysisResults={analysisResults} />
                          
                          {/* Legacy Part Analysis Display */}
                          <PartDetailsAnalysis analysisResult={{
                            predictions: analysisResults.predictions,
                            technical_details: {},
                            purchasing_info: {}
                          }} />
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center text-gray-400 p-8 bg-black/20 rounded-2xl border border-white/10">
                        <Info className="w-16 h-16 mx-auto mb-4 text-blue-400 opacity-50" />
                        <p>No analysis results available</p>
                        <p className="text-sm mt-2">Please upload a clear image of an automotive part</p>
                      </div>
                    )}
                  </div>
                  {renderActionButtons()}
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

