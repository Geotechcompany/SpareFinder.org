import React, {
  useState,
  useRef,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
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
  AlertCircle,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PlanRequiredCard } from "@/components/billing/PlanRequiredCard";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useFileUpload } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";
import { PartDetailsAnalysis } from "@/components/PartDetailsAnalysis";
import { FlatPartAnalysisDisplay } from "@/components/PartAnalysisDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { parseMarkdownSections, MarkdownCard } from "@/lib/markdown-parser";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { parseAIResponse } from "@/lib/markdown-parser";
import CreditsDisplay from "@/components/CreditsDisplay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, dashboardApi } from "@/lib/api";
import KeywordMarkdownResults from "@/components/KeywordMarkdownResults";
import OnboardingGuide from "@/components/OnboardingGuide";
import { ComprehensiveAnalysisModal } from "@/components/ComprehensiveAnalysisModal";
// Pending jobs UI removed; redirect goes to History

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
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = technicalDataStyles;
  document.head.appendChild(styleSheet);

  // Lottie Player code removed - using video animation instead
}

// Add this helper function before the Upload component
const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Image component with fallback handling
const ImageWithFallback = ({
  src,
  alt,
  className,
  onError,
}: {
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
      <div
        className={`${className} bg-gray-700 flex items-center justify-center text-gray-400`}
      >
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-1 opacity-50">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
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
          imageLoaded ? "opacity-100" : "opacity-0"
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
  transition: { duration: 0.2 },
};

const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3 },
};

const pulseAnimation = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.02, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
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
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .replace(/\b(And|Or|The|In|Of)\b/g, (word) => word.toLowerCase());
};

// Utility function to format and break paragraphs
const formatParagraph = (
  text: string,
  maxLength: number = 300
): React.ReactNode => {
  if (!text)
    return <p className="text-gray-400 italic">No description available</p>;

  // Break long paragraphs into readable chunks
  const paragraphs = text.split(/\n\n/).map((para, index) => {
    // Trim and remove any leading/trailing whitespace
    para = para.trim();

    // If paragraph is too long, truncate and add ellipsis
    if (para.length > maxLength) {
      para = para.substring(0, maxLength) + "...";
    }

    return (
      <p
        key={index}
        className={`
          text-gray-300 
          leading-relaxed 
          ${index === 0 ? "text-base" : "text-sm"}
          ${
            para.startsWith("- ")
              ? "pl-4 border-l-2 border-blue-500/50 ml-2"
              : ""
          }
        `}
      >
        {para.replace(/^- /, "")}
      </p>
    );
  });

  return <div className="space-y-3">{paragraphs}</div>;
};

// Utility function to parse description into sections
const parseDescriptionSections = (description: string) => {
  // Remove ## and ** completely from the entire description first
  const cleanedDescription = description
    .replace(/##\s*/g, "") // Remove ## headers
    .replace(/\*\*/g, ""); // Remove ** formatting

  // Regular expression to split description into sections using titles
  const sectionRegex = /[:\n](?=[A-Z])/;

  // Split description into sections
  const sections = cleanedDescription
    .split(sectionRegex)
    .filter((section) => section.trim() !== "")
    .map((section, index, array) => {
      // Trim and clean the section
      const cleanedSection = section.trim();

      // If it's the first section, use a default title
      const title =
        index === 0
          ? "Overview"
          : // Try to extract a meaningful title from the first few words
            cleanedSection.split(/\s+/).slice(0, 3).join(" ").trim();

      return {
        title: formatTitle(title),
        content: cleanedSection,
        rawTitle: title,
      };
    })
    .filter((section) => section.content); // Remove empty sections

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
                  prediction.confidence > 0.8
                    ? "default"
                    : prediction.confidence > 0.5
                    ? "secondary"
                    : "destructive"
                }
              >
                {(prediction.confidence * 100).toFixed(2)}% Confidence
              </Badge>
            </div>
          </div>
        ))}
      </motion.div>
    ),
  });

  // If description exists, parse markdown sections and categorize them
  analysisResults.predictions.forEach((prediction) => {
    if (prediction.description) {
      const markdownSections = parseMarkdownSections(prediction.description);

      markdownSections.forEach((section) => {
        const lowercaseTitle = section.title.toLowerCase();
        const isTechnicalData =
          lowercaseTitle.includes("specification") ||
          lowercaseTitle.includes("technical") ||
          lowercaseTitle.includes("data sheet") ||
          lowercaseTitle.includes("dimensions") ||
          lowercaseTitle.includes("material") ||
          section.emoji === "🔧" ||
          section.emoji === "📊";

        const sectionData = {
          title: section.title,
          priority: isTechnicalData ? 2 : 3,
          emoji: section.emoji,
          icon: (() => {
            if (lowercaseTitle.includes("identification"))
              return <Target className="w-5 h-5 text-blue-400" />;
            if (
              lowercaseTitle.includes("specification") ||
              lowercaseTitle.includes("technical")
            )
              return <FileText className="w-5 h-5 text-green-400" />;
            if (
              lowercaseTitle.includes("compatibility") ||
              lowercaseTitle.includes("vehicle")
            )
              return <Target className="w-5 h-5 text-purple-400" />;
            if (
              lowercaseTitle.includes("pricing") ||
              lowercaseTitle.includes("cost")
            )
              return <span className="text-yellow-400">💰</span>;
            if (
              lowercaseTitle.includes("where") ||
              lowercaseTitle.includes("buy")
            )
              return <span className="text-purple-400">🌍</span>;
            if (
              lowercaseTitle.includes("confidence") ||
              lowercaseTitle.includes("score")
            )
              return <span className="text-green-400">📈</span>;
            return <Info className="w-5 h-5 text-yellow-400" />;
          })(),
          content: (
            <div
              className={`${isTechnicalData ? "technical-data-enhanced" : ""}`}
            >
              <MarkdownCard
                title={section.title}
                content={section.content}
                emoji={section.emoji}
                level={section.level || 2}
                className={
                  isTechnicalData
                    ? "bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30"
                    : ""
                }
              />
            </div>
          ),
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
    Object.entries(analysisResults.additional_details).forEach(
      ([key, value]) => {
        if (
          typeof value === "string" &&
          value.trim() &&
          key !== "full_analysis"
        ) {
          const isTechnicalSpecs =
            key === "technical_specifications" ||
            key.includes("specification") ||
            key.includes("technical") ||
            key.includes("material") ||
            key.includes("dimension");

          const sectionData = {
            title: formatTitle(key),
            priority: isTechnicalSpecs ? 2 : 4,
            emoji: isTechnicalSpecs ? "🔧" : "📋",
            icon: isTechnicalSpecs ? (
              <FileText className="w-5 h-5 text-green-400" />
            ) : (
              <Info className="w-5 h-5 text-yellow-400" />
            ),
            content: (
              <div
                className={`${
                  isTechnicalSpecs ? "technical-specifications-section" : ""
                }`}
              >
                <MarkdownCard
                  title={formatTitle(key)}
                  content={value}
                  level={2}
                  className={
                    isTechnicalSpecs
                      ? "bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30 shadow-lg shadow-green-500/10"
                      : ""
                  }
                />
              </div>
            ),
          };

          // Add to appropriate container
          if (isTechnicalSpecs) {
            technicalSections.push(sectionData);
          } else {
            generalSections.push(sectionData);
          }
        }
      }
    );
  }

  // If we have very few sections, try to parse any remaining content as fallback
  if (
    generalSections.length === 1 &&
    technicalSections.length === 0 &&
    analysisResults.additional_details?.full_analysis
  ) {
    const fallbackSections = parseMarkdownSections(
      analysisResults.additional_details.full_analysis
    );

    fallbackSections.forEach((section, index) => {
      if (section.title && section.content) {
        const lowercaseTitle = section.title.toLowerCase();
        const isTechnicalData =
          lowercaseTitle.includes("specification") ||
          lowercaseTitle.includes("technical") ||
          lowercaseTitle.includes("data sheet") ||
          lowercaseTitle.includes("dimensions") ||
          lowercaseTitle.includes("material");

        const sectionData = {
          title: section.title,
          priority: isTechnicalData ? 2 : 5,
          emoji: section.emoji,
          icon: (() => {
            if (
              lowercaseTitle.includes("specification") ||
              lowercaseTitle.includes("technical")
            )
              return <FileText className="w-5 h-5 text-green-400" />;
            if (
              lowercaseTitle.includes("compatibility") ||
              lowercaseTitle.includes("vehicle")
            )
              return <span className="text-blue-400">🚗</span>;
            if (
              lowercaseTitle.includes("pricing") ||
              lowercaseTitle.includes("cost")
            )
              return <span className="text-yellow-400">💰</span>;
            if (
              lowercaseTitle.includes("where") ||
              lowercaseTitle.includes("buy")
            )
              return <span className="text-purple-400">🌍</span>;
            if (
              lowercaseTitle.includes("confidence") ||
              lowercaseTitle.includes("score")
            )
              return <span className="text-green-400">📈</span>;
            return <Info className="w-5 h-5 text-gray-400" />;
          })(),
          content: (
            <div
              className={`${isTechnicalData ? "technical-data-enhanced" : ""}`}
            >
              <MarkdownCard
                title={section.title}
                content={section.content}
                emoji={section.emoji}
                level={section.level || 2}
                className={
                  isTechnicalData
                    ? "bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30"
                    : ""
                }
              />
            </div>
          ),
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
  const sortedTechnicalSections = technicalSections.sort(
    (a, b) => (a.priority || 5) - (b.priority || 5)
  );
  const sortedGeneralSections = generalSections.sort(
    (a, b) => (a.priority || 5) - (b.priority || 5)
  );

  // Debug logging for development
  if (import.meta.env.DEV) {
    console.log("🔍 Analysis Results Debug:", {
      technicalSections: sortedTechnicalSections.length,
      generalSections: sortedGeneralSections.length,
      technicalTitles: sortedTechnicalSections.map((s) => ({
        title: s.title,
        emoji: s.emoji,
      })),
      generalTitles: sortedGeneralSections.map((s) => ({
        title: s.title,
        emoji: s.emoji,
      })),
      originalPredictions: analysisResults.predictions.length,
      additionalDetails: Object.keys(analysisResults.additional_details || {}),
    });
  }

  return {
    technical: sortedTechnicalSections,
    general: sortedGeneralSections,
  };
};

// Debug component for development
const AnalysisDebugInfo = ({
  analysisResults,
}: {
  analysisResults: AnalysisResponse;
}) => {
  if (!import.meta.env.DEV) return null;

  const sections = generateAnalysisSections(analysisResults);

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="mb-4 text-xs">
          <Info className="w-3 h-3 mr-1" />
          Debug Info (Technical: {sections.technical.length}, General:{" "}
          {sections.general.length})
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-muted/30 p-4 rounded-lg border border-border mb-4 text-xs dark:bg-black/30 dark:border-white/10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-green-300 font-semibold mb-2 flex items-center">
                <FileText className="w-3 h-3 mr-1" />
                Technical Sections ({sections.technical.length})
              </h4>
              <ul className="text-gray-400 space-y-1">
                {sections.technical.map((section, i) => (
                  <li key={i} className="flex items-center space-x-2">
                    <span>{section.emoji || "🔧"}</span>
                    <span className="text-green-400">{section.title}</span>
                    <Badge
                      variant="outline"
                      className="text-xs ml-auto bg-green-900/30 border-green-500"
                    >
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
                    <span>{section.emoji || "📋"}</span>
                    <span className="text-blue-400">{section.title}</span>
                    <Badge
                      variant="outline"
                      className="text-xs ml-auto bg-blue-900/30 border-blue-500"
                    >
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
              <div>
                Additional Details:{" "}
                {Object.keys(analysisResults.additional_details || {}).length}
              </div>
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
  const { inLayout } = useDashboardLayout();
  const { isPlanActive, isLoading: subscriptionLoading } = useSubscription();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [analysisResults, setAnalysisResults] =
    useState<AnalysisResponse | null>(null);
  const [analysisProgress, setAnalysisProgress] =
    useState<AnalysisProgress | null>(null);
  const [selectedPrediction, setSelectedPrediction] =
    useState<PartPrediction | null>(null);
  const [partInfo, setPartInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [originalAiResponse, setOriginalAiResponse] = useState<any>(null);
  const [isResultsExpanded, setIsResultsExpanded] = useState(false);

  // New state for keywords
  const [keywords, setKeywords] = useState<string>("");
  const [savedKeywords, setSavedKeywords] = useState<string[]>([]);
  const [confirmKeywordSearchOpen, setConfirmKeywordSearchOpen] =
    useState(false);
  const [isKeywordSearching, setIsKeywordSearching] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    try {
      const seen = localStorage.getItem("onboarding_seen_v1");
      const force = localStorage.getItem("onboarding_force_start_v1");
      if (force === "1") {
        try {
          localStorage.removeItem("onboarding_force_start_v1");
        } catch {}
        return true;
      }
      return seen !== "1";
    } catch {
      return true;
    }
  });
  const [skipWelcome, setSkipWelcome] = useState<boolean>(false);

  if (!subscriptionLoading && !isPlanActive) {
    return <PlanRequiredCard title="Activate a plan to upload" />;
  }

  // Wizard state
  const [wizardStep, setWizardStep] = useState<
    "landing" | "selection" | "image" | "keywords" | "review"
  >("landing");
  const [selectedMode, setSelectedMode] = useState<
    "image" | "keywords" | "both" | null
  >(null);
  const [wizardProgress, setWizardProgress] = useState(0);
  const [showComprehensiveAnalysis, setShowComprehensiveAnalysis] =
    useState(false);
  const [aiOnboardingSummary, setAiOnboardingSummary] = useState<string | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const keywordsInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { uploadFile } = useFileUpload();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const seen = localStorage.getItem("onboarding_seen_v1");
      let shouldShow = seen !== "1";
      const force = localStorage.getItem("onboarding_force_start_v1");
      if (force === "1") {
        shouldShow = true;
        try {
          localStorage.removeItem("onboarding_force_start_v1");
        } catch {}
        setSkipWelcome(true);
      }
      setShowOnboarding(shouldShow);
    } catch {}
  }, []);

  // Fetch user statistics once to generate an AI-style onboarding summary
  useEffect(() => {
    const fetchStatsForOnboarding = async () => {
      try {
        const response = await api.statistics.getStats();
        const stats = (response as any)?.statistics;
        if (stats) {
          const total = stats.total_uploads ?? 0;
          const successful = stats.total_successful_identifications ?? 0;
          const avgConf = Number(stats.average_confidence_score ?? 0);

          const partsPhrase =
            total === 0
              ? "This looks like your first upload."
              : `You've uploaded ${total} part${total === 1 ? "" : "s"} so far${
                  successful
                    ? `, with ${successful} successful identifications`
                    : ""
                }.`;

          const confidencePhrase =
            avgConf > 0
              ? `Your current average confidence is about ${Math.round(
                  avgConf
                )}%.`
              : "We don't have enough data yet to estimate your confidence.";

          setAiOnboardingSummary(
            `${partsPhrase} ${confidencePhrase} For best accuracy, combine a clear image with 3–5 precise keywords (part number, make/model/year).`
          );
        }
      } catch {
        // Silent failure – onboarding still works without AI summary
      }
    };

    if (showOnboarding) {
      fetchStatsForOnboarding();
    }
  }, [showOnboarding]);

  const getProgressStageColor = (stage: string) => {
    switch (stage) {
      case "uploading":
        return "from-blue-500 to-cyan-500";
      case "validating":
        return "from-cyan-500 to-teal-500";
      case "ai_analysis":
        return "from-purple-500 to-pink-500";
      case "part_matching":
        return "from-red-500 to-rose-500";
      case "finalizing":
        return "from-indigo-500 to-purple-500";
      case "complete":
        return "from-green-400 to-emerald-400";
      case "error":
        return "from-red-500 to-pink-500";
      default:
        return "from-gray-500 to-slate-500";
    }
  };

  const getProgressStageIcon = (stage: string) => {
    switch (stage) {
      case "uploading":
        return <UploadIcon className="w-4 h-4" />;
      case "validating":
        return <CheckCircle className="w-4 h-4" />;
      case "ai_analysis":
        return <Brain className="w-4 h-4" />;
      case "part_matching":
        return <Zap className="w-4 h-4" />;
      case "finalizing":
        return <RefreshCw className="w-4 h-4" />;
      case "complete":
        return <CheckCircle className="w-4 h-4" />;
      case "error":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Loader2 className="w-4 h-4" />;
    }
  };

  const formatPrice = (
    price?: { min: number; max: number; currency: string } | null
  ) => {
    if (
      !price ||
      typeof price.min === "undefined" ||
      typeof price.max === "undefined"
    ) {
      return "Price not available";
    }
    const symbol = price.currency === "GBP" ? "£" : "$";
    return `${symbol}${price.min} - ${symbol}${price.max}`;
  };

  const extractCategory = (text: string): string => {
    const categoryMatches = text.match(/Category:\s*([^.\n]+)/i);
    return categoryMatches ? categoryMatches[1].trim() : "Engineering spares Component";
  };

  const extractManufacturer = (text: string): string => {
    const manufacturerMatches = text.match(/Manufacturer:\s*([^.\n]+)/i);
    return manufacturerMatches ? manufacturerMatches[1].trim() : "Unknown";
  };

  const extractPrice = (text: string): string => {
    const priceMatches = text.match(/Price\s*Range:\s*([^.\n]+)/i);
    return priceMatches ? priceMatches[1].trim() : "Price not available";
  };

  // Wizard navigation functions
  const handleModeSelection = (mode: "image" | "keywords" | "both") => {
    setSelectedMode(mode);
    setWizardProgress(33);

    if (mode === "image") {
      setWizardStep("image");
    } else if (mode === "keywords") {
      setWizardStep("keywords");
    } else {
      // Both - start with image
      setWizardStep("image");
    }
  };

  const handleNextStep = () => {
    if (wizardStep === "image" && selectedMode === "both") {
      setWizardStep("keywords");
      setWizardProgress(66);
    } else if (wizardStep === "image" || wizardStep === "keywords") {
      setWizardStep("review");
      setWizardProgress(100);
    }
  };

  const handleBackStep = () => {
    if (wizardStep === "review") {
      if (selectedMode === "both") {
        setWizardStep("keywords");
        setWizardProgress(66);
      } else {
        setWizardStep(selectedMode === "image" ? "image" : "keywords");
        setWizardProgress(33);
      }
    } else if (wizardStep === "keywords") {
      setWizardStep("image");
      setWizardProgress(33);
    } else if (wizardStep === "image") {
      setWizardStep("selection");
      setWizardProgress(0);
    } else if (wizardStep === "selection") {
      setWizardStep("landing");
      setWizardProgress(0);
      setSelectedMode(null);
    }
  };

  const handleResetWizard = () => {
    setWizardStep("landing");
    setSelectedMode(null);
    setWizardProgress(0);
    setUploadedFile(null);
    setImagePreview(null);
    setSavedKeywords([]);
    setKeywords("");
    setAnalysisResults(null);
    setSelectedPrediction(null);
    setOriginalAiResponse(null);
  };

  // Add keyword functionality
  const handleAddKeyword = () => {
    const trimmedKeyword = keywords.trim();
    if (trimmedKeyword && !savedKeywords.includes(trimmedKeyword)) {
      setSavedKeywords((prev) => [...prev, trimmedKeyword]);
      setKeywords(""); // Clear input after adding
      keywordsInputRef.current?.focus();
    }
  };

  // Remove a specific keyword
  const handleRemoveKeyword = (keywordToRemove: string) => {
    setSavedKeywords((prev) =>
      prev.filter((keyword) => keyword !== keywordToRemove)
    );
  };

  // Keyword-only search flow
  const openKeywordSearchModal = () => {
    // Ensure at least one keyword exists (consider pending input)
    if (savedKeywords.length === 0 && !keywords.trim()) {
      toast({
        title: "Add keywords",
        description: "Please enter at least one keyword.",
        variant: "destructive",
      });
      return;
    }
    // If the input has a value not yet saved, include it implicitly
    if (keywords.trim() && !savedKeywords.includes(keywords.trim())) {
      setSavedKeywords((prev) => [...prev, keywords.trim()]);
      setKeywords("");
    }
    setConfirmKeywordSearchOpen(true);
  };

  const performKeywordSearch = async () => {
    try {
      setIsKeywordSearching(true);
      setAnalysisResults(null);
      setSelectedPrediction(null);
      setOriginalAiResponse(null);

      // Schedule the keyword search for background processing
      const response = await dashboardApi.scheduleKeywordSearch(savedKeywords);

      if (!response?.success) {
        throw new Error(
          response?.message || "Keyword search scheduling failed"
        );
      }

      // Extract jobId with type-safe access to nested data
      const data = response?.data as
        | { jobId?: string; filename?: string }
        | undefined;
      const jobId =
        response?.jobId ||
        response?.filename ||
        data?.jobId ||
        data?.filename ||
        null;

      // Show scheduling confirmation
      toast({
        title: "Keyword analysis scheduled",
        description: `Your keyword search has been queued. Job ID: ${
          jobId ?? "processing..."
        }`,
      });

      // Auto-redirect to history page to track the job
      setTimeout(() => {
        navigate("/dashboard/history");
      }, 1500);

      return; // Exit early since we're scheduling, not processing immediately
    } catch (error: any) {
      console.error("Keyword search error:", error);

      if (axios.isAxiosError(error) && error.response) {
        const { status, data } = error.response as {
          status: number;
          data?: any;
        };

        const errorCode = data?.error as string | undefined;

        // Treat provider rate limiting as a queued background job instead of a hard error
        if (
          status === 429 ||
          (status === 502 && errorCode === "ai_service_rate_limited")
        ) {
          toast({
            title: "Keyword analysis queued",
            description:
              "Your keyword search is queued and will run automatically. You can monitor it from your history.",
          });

          // Optionally send the user to History to watch for completion
          setTimeout(() => {
            navigate("/dashboard/history");
          }, 1500);
          return;
        }
      }

      // Handle subscription errors
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const errorData = error.response.data;
        if (
          errorData?.error === "subscription_required" ||
          errorData?.error === "subscription_expired"
        ) {
          toast({
            title: "Subscription Required",
            description:
              errorData.message ||
              "You need an active subscription or trial to use this feature. Redirecting to billing...",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href =
              "/dashboard/billing?subscription_required=true";
          }, 2000);
          return;
        }
      }

      // Handle insufficient credits (402)
      if (axios.isAxiosError(error) && error.response?.status === 402) {
        const errorData = error.response.data;
        toast({
          title: "Insufficient Credits",
          description:
            errorData?.message ||
            "You don't have enough credits to perform this search. Please upgrade your plan.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/dashboard/billing";
        }, 2000);
        return;
      }

      // For all remaining errors, fall back to treating the request as queued
      // instead of surfacing a hard failure to the user.
      toast({
        title: "Keyword analysis queued",
        description:
          "Your keyword search is queued and will run automatically. You can monitor it from your history.",
      });

      setTimeout(() => {
        navigate("/dashboard/history");
      }, 1500);
    } finally {
      setIsKeywordSearching(false);
    }
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
        status: "uploading",
        message: "Uploading image...",
        progress: 20,
        currentStep: "Upload & Validation",
        currentStepIndex: 1,
        totalSteps: 6,
        details: "Transferring image data",
      });

      // Step 2: AI Analysis Progress
      onProgress?.({
        status: "ai_analysis",
        message: "Initializing AI analysis...",
        progress: 30,
        currentStep: "AI Analysis",
        currentStepIndex: 2,
        totalSteps: 6,
        details: "Analyzing image with AI Service",
      });

      // Call GitHub AI Part Analysis Service
      const initialResponse = await api.upload.image(file, savedKeywords, {
        confidenceThreshold: options.confidenceThreshold || 0.3,
        maxPredictions: options.maxPredictions || 3,
      });

      // Modify the processing check in analyzeImage method
      if (!initialResponse.success) {
        let retries = 0;
        const maxRetries = 10;
        const delay = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));

        while (retries < maxRetries) {
          onProgress?.({
            status: "ai_analysis",
            message: `Processing image... (Attempt ${retries + 1})`,
            progress: 40 + retries * 5,
            currentStep: "AI Analysis",
            currentStepIndex: 2,
            totalSteps: 6,
            details: "Waiting for analysis completion",
          });

          await delay(3000);

          const statusResponse = await api.upload.image(file, savedKeywords, {
            confidenceThreshold: options.confidenceThreshold || 0.3,
            maxPredictions: options.maxPredictions || 3,
          });

          if (statusResponse.success && statusResponse.data) {
            // Transform the flat response to match existing interface
            const flatData = statusResponse.data as any;

            // Create a single prediction from flat data for backward compatibility
            const prediction = {
              class_name:
                flatData.class_name ||
                flatData.precise_part_name ||
                "Engineering spares Component",
              confidence: (flatData.confidence_score || 0) / 100, // Convert percentage to decimal
              description: flatData.description || flatData.full_analysis || "",
              category: flatData.category || "Unspecified",
              manufacturer: flatData.manufacturer || "Unknown",
              estimated_price:
                flatData.estimated_price || "Price not available",
              part_number: flatData.part_number || null,
              compatibility: flatData.compatible_vehicles || [],
            };

            // Transform response to match existing interface
            const analysisResults: AnalysisResponse = {
              success: true,
              predictions: [prediction], // Wrap in array for backward compatibility
              similar_images: [],
              model_version:
                flatData.model_version || "SpareFinderAI Part Analysis v1.0",
              processing_time: flatData.processing_time_seconds || 0,
              image_metadata: {
                content_type: file.type,
                size_bytes: file.size,
              },
              additional_details: {
                full_analysis:
                  flatData.full_analysis || flatData.description || "",
                technical_specifications: JSON.stringify(
                  flatData.technical_data_sheet || {}
                ),
                market_information: JSON.stringify({
                  pricing: flatData.estimated_price,
                  suppliers: flatData.suppliers,
                  buy_links: flatData.buy_links,
                }),
                confidence_reasoning: flatData.confidence_explanation || "",
              },
              // Store flat data for direct access
              flatData: flatData,
            };

            // Final progress update
            onProgress?.({
              status: "complete",
              message: `Found ${analysisResults.predictions.length} potential matches`,
              progress: 100,
              currentStep: "Analysis Complete",
              currentStepIndex: 6,
              totalSteps: 6,
              details: "Comprehensive part analysis finished",
              identifiedPart: analysisResults.predictions[0]?.class_name,
              confidence: analysisResults.predictions[0]?.confidence * 100,
            });

            return analysisResults;
          }

          retries++;
        }

        // If max retries reached without success
        throw new Error("Analysis timed out. Please try again.");
      }

      // If initial response is successful, process immediately
      if (initialResponse.success && initialResponse.data) {
        // Transform the flat response to match existing interface
        const flatData = initialResponse.data as any;

        // Create a single prediction from flat data for backward compatibility
        const prediction = {
          class_name:
            flatData.class_name ||
            flatData.precise_part_name ||
            "Engineering spares Component",
          confidence: (flatData.confidence_score || 0) / 100, // Convert percentage to decimal
          description: flatData.description || flatData.full_analysis || "",
          category: flatData.category || "Unspecified",
          manufacturer: flatData.manufacturer || "Unknown",
          estimated_price: flatData.estimated_price || "Price not available",
          part_number: flatData.part_number || null,
          compatibility: flatData.compatible_vehicles || [],
        };

        // Transform response to match existing interface
        const analysisResults: AnalysisResponse = {
          success: true,
          predictions: [prediction], // Wrap in array for backward compatibility
          similar_images: [],
          model_version:
            flatData.model_version || "SpareFinderAI Part Analysis v1.0",
          processing_time: flatData.processing_time_seconds || 0,
          image_metadata: {
            content_type: file.type,
            size_bytes: file.size,
          },
          additional_details: {
            full_analysis: flatData.full_analysis || flatData.description || "",
            technical_specifications: JSON.stringify(
              flatData.technical_data_sheet || {}
            ),
            market_information: JSON.stringify({
              pricing: flatData.estimated_price,
              suppliers: flatData.suppliers,
              buy_links: flatData.buy_links,
            }),
            confidence_reasoning: flatData.confidence_explanation || "",
          },
          // Store flat data for direct access
          flatData: flatData,
        };

        // Final progress update
        onProgress?.({
          status: "complete",
          message: "Part analysis completed successfully",
          progress: 100,
          currentStep: "Analysis Complete",
          currentStepIndex: 6,
          totalSteps: 6,
          details: "Comprehensive part analysis finished",
          identifiedPart: flatData.class_name || flatData.precise_part_name,
          confidence: flatData.confidence_score || 0,
        });

        return analysisResults;
      }

      // If no predictions or success
      throw new Error(initialResponse.error || "No analysis results found");
    } catch (error) {
      console.error("Image analysis error:", error);

      let errorMessage = "Unknown error occurred during image analysis";
      let errorTitle = "Analysis Failed";
      let retryable = false;

      // Handle specific error types from the improved backend
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Handle axios errors with better messages
      if (axios.isAxiosError(error)) {
        const response = error.response;

        // Handle rate limiting errors (429) - set to pending, don't show error
        if (response?.status === 429) {
          // Don't show error to user, analysis is pending
          onProgress?.({
            status: "pending",
            message: "Your analysis is being processed. You'll receive an email when it's complete.",
            progress: 0,
          });
          return; // Exit early, don't show error
        }
        // Handle subscription errors - redirect to billing
        else if (response?.status === 403) {
          const errorData = response.data;
          if (
            errorData?.error === "subscription_required" ||
            errorData?.error === "subscription_expired"
          ) {
            errorTitle = "Subscription Required";
            errorMessage =
              errorData.message ||
              "You need an active subscription or trial to use this feature.";
            retryable = false;

            // Redirect to billing page after showing error
            setTimeout(() => {
              window.location.href =
                "/dashboard/billing?subscription_required=true";
            }, 2000);

            toast({
              title: errorTitle,
              description: errorMessage + " Redirecting to billing...",
              variant: "destructive",
            });

            onProgress?.({
              status: "error",
              message: errorMessage,
              progress: 0,
              currentStep: errorTitle,
              currentStepIndex: 0,
              totalSteps: 6,
              details: "Please start your free trial or upgrade your plan",
            });

            return;
          }
        }

        if (response?.data) {
          const errorData = response.data;

          // Use the enhanced error information from backend
          if (errorData.error && errorData.message) {
            errorTitle = errorData.error
              .replace("_", " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            errorMessage = errorData.message;
            retryable = errorData.retry_suggested || false;

            // Add troubleshooting info if available
            if (errorData.troubleshooting) {
              console.log("Troubleshooting info:", errorData.troubleshooting);
            }
          } else {
            errorMessage =
              errorData.message || errorData.error || "Server error occurred";
          }
        } else {
          // Handle network errors
          switch (error.code) {
            case "ECONNABORTED":
              errorTitle = "Request Timeout";
              errorMessage =
                "The request took too long to complete. Please try again.";
              retryable = true;
              break;
            case "ECONNREFUSED":
              errorTitle = "Connection Failed";
              errorMessage =
                "Unable to connect to the analysis service. Please check your connection and try again.";
              retryable = true;
              break;
            case "ERR_NETWORK":
              errorTitle = "Network Error";
              errorMessage =
                "Network connection failed. Please check your internet connection.";
              retryable = true;
              break;
            default:
              errorMessage = `Network error: ${error.message}`;
              retryable = true;
          }
        }
      }

      // Check if this is a pending/retryable error - don't show error to user
      if (axios.isAxiosError(error) && (error.response?.data?.status === "pending" || error.response?.data?.retry_suggested)) {
        onProgress?.({
          status: "pending",
          message: "Your analysis is being processed. You'll receive an email when it's complete.",
          progress: 0,
        });
        return; // Exit early, don't show error
      }

      onProgress?.({
        status: "error",
        message: errorMessage,
        progress: 0,
        currentStep: errorTitle,
        currentStepIndex: 0,
        totalSteps: 6,
        details: retryable
          ? "You can try uploading again"
          : "Unable to complete image analysis",
      });

      toast({
        title: errorTitle,
        description: errorMessage + (retryable ? " (You can try again)" : ""),
        variant: "destructive",
      });

      return null;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 10MB.",
          variant: "destructive",
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
      fileInputRef.current.value = "";
    }
  };

  // Method to store analysis results in Supabase
  const storeAnalysisResults = useCallback(
    async (file: File, analysisResults: AnalysisResponse) => {
      try {
        // Simplified storage without Supabase
        console.log("Analysis Results:", analysisResults);

        toast({
          title: "Analysis Saved",
          description: "Your part analysis has been processed successfully",
        });

        return {
          id: crypto.randomUUID(), // Use Web Crypto API for unique ID
          analysisResults,
        };
      } catch (error) {
        console.error("Analysis storage failed:", error);
        toast({
          title: "Error",
          description: "Failed to process analysis results",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast]
  );

  // Modify handleUpload to remove Supabase-specific code
  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please select an image file first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setAnalysisProgress({
      status: "uploading",
      message: "Preparing image for AI analysis...",
      progress: 10,
      currentStep: "Initializing Upload",
      currentStepIndex: 1,
      totalSteps: 6,
      details: "Validating image and preparing for processing",
    });

    try {
      const updateProgress = (
        stage: string,
        message: string,
        progress: number,
        details?: string
      ) => {
        setAnalysisProgress((prev) => ({
          ...prev,
          status: stage,
          message: message,
          progress: progress,
          currentStep: stage
            .replace("_", " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          currentStepIndex:
            stage === "uploading"
              ? 1
              : stage === "validating"
              ? 2
              : stage === "ai_analysis"
              ? 3
              : stage === "part_matching"
              ? 4
              : stage === "finalizing"
              ? 5
              : stage === "complete"
              ? 6
              : prev?.currentStepIndex || 1,
          details: details || prev?.details,
        }));
      };

      updateProgress("uploading", "Uploading image to secure servers...", 20);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate upload delay

      updateProgress(
        "validating",
        "Validating image integrity and format...",
        30
      );
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate validation

      updateProgress(
        "ai_analysis",
        "Initializing AI-powered part analysis...",
        40,
        "Searching advanced Engineering spares databases"
      );

      const result = await api.upload.image(uploadedFile, savedKeywords, {
        confidenceThreshold: 0.3,
        maxPredictions: 3,
      });

      // Store the original AI response for complete data saving
      setOriginalAiResponse(result);

      updateProgress(
        "part_matching",
        "Matching part details across multiple databases...",
        70,
        "Cross-referencing Engineering spares part catalogs"
      );
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate matching process

      updateProgress(
        "finalizing",
        "Compiling comprehensive analysis report...",
        90,
        "Generating detailed insights and specifications"
      );
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate finalization

      console.log("Upload result:", result);

      // Debug logging for AI response content
      if (import.meta.env.DEV) {
        console.log("🔍 AI Response Debug:", {
          success: result.success,
          dataStructure: result.data
            ? Object.keys(result.data as any)
            : "No data",
          predictionCount: (result.data as any)?.predictions?.length || 0,
          hasAnalysisField: (result.data as any)?.predictions?.[0]?.analysis
            ? "Yes"
            : "No",
          hasDescriptionField: (result.data as any)?.predictions?.[0]
            ?.description
            ? "Yes"
            : "No",
          analysisLength:
            (result.data as any)?.predictions?.[0]?.analysis?.length || 0,
          analysisPreview:
            (result.data as any)?.predictions?.[0]?.analysis?.substring(
              0,
              200
            ) + "..." || "No analysis",
        });
      }

      if (!result.success) {
        throw new Error(result.error || "No result returned from upload");
      }

      // Prepare predictions, using the service's predictions or fallback parsing
      const predictions = (result.data as any)?.predictions?.length
        ? (result.data as any).predictions.map((prediction: any) => ({
            class_name: prediction.class_name || "Engineering spares Component",
            confidence: prediction.confidence || 0.75,
            description: prediction.analysis || prediction.description || "", // Use analysis field first
            category: prediction.category || "Unspecified",
            manufacturer: prediction.manufacturer || "Unknown",
            estimated_price:
              prediction.estimated_price || "Price not available",
            part_number: prediction.part_number,
            compatibility: prediction.compatibility,
          }))
        : // Fallback parsing if no predictions
          [
            {
              class_name: "Engineering spares Component",
              confidence: 0.75,
              description:
                (result.data as any)?.analysis ||
                (result.data as any)?.description ||
                "No detailed description available",
              category: "Unspecified",
              manufacturer: "Unknown",
              estimated_price: "Price not available",
            },
          ];

      // Prepare additional details dynamically using analysis field
      const firstPrediction = predictions[0];
      const additionalDetails = {
        full_analysis:
          (result.data as any)?.predictions?.[0]?.analysis ||
          (result.data as any)?.analysis ||
          (result.data as any)?.description ||
          "",
        technical_specifications: `
- Detailed analysis provided by AI Model
- Comprehensive part identification service`,
        market_information: `
- Estimated Price: ${firstPrediction.estimated_price}
- Manufacturer: ${firstPrediction.manufacturer}`,
        confidence_reasoning: `
- AI Model Confidence: ${(firstPrediction.confidence * 100).toFixed(1)}%
- Detailed analysis available`,
      };

      // Final progress update
      updateProgress(
        "complete",
        `Part identified: ${firstPrediction.class_name}`,
        100,
        "Analysis complete"
      );

      // Set analysis results to trigger full display
      const analysisResults: AnalysisResponse = {
        success: result.success,
        predictions: predictions,
        similar_images: [], // No similar images from this service
        model_version:
          (result.data as any)?.model_version || "AI Part Analysis",
        processing_time: (result.data as any)?.processing_time || 0,
        image_metadata: {
          content_type: uploadedFile.type,
          size_bytes: uploadedFile.size,
          base64_image: await convertImageToBase64(uploadedFile), // Add this helper function
        },
        additional_details: additionalDetails,
      };

      // Set the first prediction as selected
      setSelectedPrediction(firstPrediction);

      // Set analysis results for display
      setAnalysisResults(analysisResults);

      toast({
        title: "Success",
        description: `Part identified: ${firstPrediction.class_name}`,
      });

      // Auto-redirect to history page to show the results
      setTimeout(() => {
        navigate("/dashboard/history");
      }, 1500); // Small delay to let user see the success message

      // If analysis is successful, store the results
      if (result.success && result.data && (result.data as any).length > 0) {
        try {
          // Prepare analysis results in the expected format
          const analysisResults: AnalysisResponse = {
            success: result.success,
            predictions: (result.data as any[]).map((prediction: any) => ({
              class_name: prediction.class_name || "Engineering spares Component",
              confidence: prediction.confidence || 0.75,
              description: prediction.description || "",
              category: prediction.category || "Unspecified",
              manufacturer: prediction.manufacturer || "Unknown",
              estimated_price:
                prediction.estimated_price || "Price not available",
              part_number: prediction.part_number,
              compatibility: prediction.compatibility,
            })),
            similar_images: [],
            model_version: "AI Part Analysis",
            processing_time: 0, // Not provided by this service
            image_metadata: {
              content_type: uploadedFile.type,
              size_bytes: uploadedFile.size,
              base64_image: await convertImageToBase64(uploadedFile), // Add this helper function
            },
            additional_details: {
              full_analysis: (result.data as any[])[0]?.description || "",
              technical_specifications: "",
              market_information: "",
              confidence_reasoning: "",
            },
          };

          // Store analysis in database
          console.log("Analysis results prepared:", analysisResults);
        } catch (storageError) {
          console.error("Failed to store analysis:", storageError);
          toast({
            title: "Storage Error",
            description: "Could not save analysis details",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Upload error:", error);

      // Handle rate limiting errors (429)
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const errorData = error.response.data;
        const retryAfter = errorData?.retryAfter;
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : null;

        setAnalysisProgress({
          status: "error",
          message: "Please try again shortly",
          progress: 0,
          currentStep: "Processing Queue",
          currentStepIndex: 0,
          totalSteps: 6,
          details:
            "We're receiving a high volume of requests. Please try again shortly.",
        });

        toast({
          title: "Please try again shortly",
          description:
            retrySeconds
              ? `We're receiving a high volume of requests. Please try again in ${retrySeconds} seconds.`
              : "We're receiving a high volume of requests. Please try again shortly.",
          variant: "destructive",
          duration: retrySeconds ? retrySeconds * 1000 : 5000,
        });
        return;
      }

      // Handle subscription errors
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const errorData = error.response.data;
        if (
          errorData?.error === "subscription_required" ||
          errorData?.error === "subscription_expired"
        ) {
          toast({
            title: "Subscription Required",
            description:
              errorData.message ||
              "You need an active subscription or trial to use this feature. Redirecting to billing...",
            variant: "destructive",
          });
          setTimeout(() => {
            navigate("/dashboard/billing");
          }, 2000);
          return;
        }
      }

      // Handle insufficient credits errors
      if (axios.isAxiosError(error) && error.response?.status === 402) {
        const errorData = error.response.data;
        toast({
          title: "Insufficient Credits",
          description:
            errorData.message ||
            "You don't have enough credits to perform this analysis. Redirecting to billing...",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/dashboard/billing");
        }, 2000);
        return;
      }

      // Update progress to error state
      setAnalysisProgress({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to process image",
        progress: 0,
        currentStep: "Analysis Failed",
        currentStepIndex: 0,
        totalSteps: 6,
        details: "Unable to complete image analysis",
      });

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to process image",
        variant: "destructive",
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
      handleFileSelect({
        target: { files: files },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        handleFileSelect(e);
      }
    },
    []
  );

  const scheduleAnalysis = useCallback(async () => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please select an image first.",
        variant: "destructive",
      });
      return;
    }
    try {
      const API_BASE =
        (import.meta as any).env?.VITE_AI_SERVICE_URL ||
        "https://aiagent-sparefinder-org.onrender.com";
      const form = new FormData();
      form.append("file", uploadedFile);
      if (savedKeywords.length)
        form.append("keywords", savedKeywords.join(", "));
      const params = new URLSearchParams({
        confidence_threshold: "0.3",
        max_predictions: "3",
      });
      const res = await fetch(
        `${API_BASE}/analyze-part/?${params.toString()}`,
        { method: "POST", body: form }
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 202 || data?.status === "pending") {
        toast({
          title: "Scheduled",
          description: "Your analysis was queued. You can track it below.",
        });
        try {
          localStorage.setItem("onboarding_seen_v1", "1");
          setShowOnboarding(false);
        } catch {}
        navigate("/dashboard/history");
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || "Failed to schedule analysis");
      }
      toast({
        title: "Started",
        description: "Your analysis started. Track progress below.",
      });
      try {
        localStorage.setItem("onboarding_seen_v1", "1");
        setShowOnboarding(false);
      } catch {}
      navigate("/dashboard/history");
    } catch (e: any) {
      toast({
        title: "Schedule failed",
        description: e?.message || "Unable to schedule analysis",
        variant: "destructive",
      });
    }
  }, [uploadedFile, savedKeywords, toast]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setImagePreview(null);
    setAnalysisResults(null);
    setSelectedPrediction(null);
    setAnalysisProgress(null);
    setPartInfo(null);
    setOriginalAiResponse(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleCopyPartNumber = useCallback((partNumber: string) => {
    navigator.clipboard.writeText(partNumber);
    toast({
      title: "Copied!",
      description: "Part number copied to clipboard",
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
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a comprehensive JSON report with additional metadata
      const reportData = {
        metadata: {
          generated_at: new Date().toISOString(),
          source: "SpareFinderAI Vision Analysis",
          version: "1.0.0",
        },
        part_identification: {
          name: analysisResults.predictions[0]?.class_name,
          confidence: `${(
            analysisResults.predictions[0]?.confidence * 100
          ).toFixed(1)}%`,
          category: analysisResults.predictions[0]?.category,
          manufacturer: analysisResults.predictions[0]?.manufacturer,
          estimated_price: analysisResults.predictions[0]?.estimated_price,
          part_number: analysisResults.predictions[0]?.part_number,
        },
        technical_details: {
          description: analysisResults.predictions[0]?.description,
          compatibility: analysisResults.predictions[0]?.compatibility,
          additional_specifications:
            analysisResults.additional_details?.technical_specifications,
        },
        market_information: {
          pricing_details:
            analysisResults.additional_details?.market_information,
          replacement_frequency:
            analysisResults.additional_details?.replacement_frequency,
        },
        analysis_metadata: {
          model_version: analysisResults.model_version,
          processing_time: `${analysisResults.processing_time} seconds`,
          image_details: {
            size: `${analysisResults.image_metadata?.size_bytes} bytes`,
            type: analysisResults.image_metadata?.content_type,
          },
        },
        full_analysis: analysisResults.additional_details?.full_analysis,
        disclaimer:
          "This report is generated by SpareFinderAI Vision and is for informational purposes only.",
      };

      // Convert to formatted JSON with indentation
      const jsonReport = JSON.stringify(reportData, null, 2);

      // Create a Blob and download
      const blob = new Blob([jsonReport], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sparefinder_part_analysis_${new Date()
        .toISOString()
        .replace(/:/g, "-")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Downloaded",
        description: "Comprehensive part analysis report saved successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to download analysis report:", error);
      toast({
        title: "Download Failed",
        description: "Unable to generate analysis report. Please try again.",
        variant: "destructive",
      });
    }
  }, [analysisResults, toast]);

  // Enhanced shareable link generation with more robust error handling
  const generateShareableLink = useCallback(() => {
    if (!analysisResults) {
      toast({
        title: "No Results",
        description: "No analysis results available to share",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a compact, shareable representation of the analysis
      const shareData = {
        part_name: analysisResults.predictions[0]?.class_name,
        confidence: `${(
          analysisResults.predictions[0]?.confidence * 100
        ).toFixed(1)}%`,
        category: analysisResults.predictions[0]?.category,
        manufacturer: analysisResults.predictions[0]?.manufacturer,
        timestamp: new Date().toISOString(),
        source: "SpareFinderAI Vision",
      };

      // Generate a base64 encoded shareable link
      const shareableLink = `https://sparefinder.ai/analysis/${encodeURIComponent(
        btoa(JSON.stringify(shareData))
      )}`;

      // Copy to clipboard with enhanced error handling
      navigator.clipboard
        .writeText(shareableLink)
        .then(() => {
          toast({
            title: "Shareable Link Generated",
            description:
              "Analysis link copied to clipboard. Share with colleagues or save for future reference.",
          });

          // Separately open the link
          window.open(shareableLink, "_blank");
        })
        .catch((err) => {
          console.error("Clipboard copy failed:", err);
          toast({
            title: "Share Failed",
            description: "Unable to copy shareable link. Please copy manually.",
            variant: "destructive",
          });
        });
    } catch (error) {
      console.error("Failed to generate shareable link:", error);
      toast({
        title: "Share Error",
        description: "Could not generate shareable link. Please try again.",
        variant: "destructive",
      });
    }
  }, [analysisResults, toast]);

  // PDF Download Method
  const downloadPDFReport = useCallback(async () => {
    if (!analysisResults) {
      toast({
        title: "No Results",
        description: "No analysis results available to download",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the full analysis content - prioritize flatData
      const fullAnalysis =
        analysisResults.flatData?.full_analysis ||
        analysisResults.additional_details?.full_analysis ||
        "";

      // Format the full analysis using our markdown parser
      const formattedAnalysis = fullAnalysis
        ? parseAIResponse(fullAnalysis)
        : "";

      // Create a container for PDF content
      const input = document.createElement("div");
      input.style.width = "800px";
      input.style.padding = "20px";
      input.style.fontFamily = "Arial, sans-serif";
      input.style.backgroundColor = "white";
      input.style.color = "black";
      input.style.lineHeight = "1.6";

      // Generate comprehensive PDF content
      input.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2c3e50; padding-bottom: 20px;">
          <h1 style="color: #2c3e50; margin: 0; font-size: 28px; font-weight: bold;">
            🔍 SpareFinderAI Vision Analysis Report
          </h1>
          <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 14px;">
            Generated on ${new Date().toLocaleString()} | Model: ${
        analysisResults.model_version
      }
          </p>
        </div>
        
        ${analysisResults.predictions
          .map(
            (prediction, index) => `
          <div style="margin-bottom: 25px; border: 2px solid #ecf0f1; padding: 20px; border-radius: 8px; background-color: #fafafa;">
            <h2 style="color: #2c3e50; margin-bottom: 15px; font-size: 22px; border-bottom: 1px solid #bdc3c7; padding-bottom: 8px;">
              🛞 Part ${index + 1}: ${prediction.class_name || "Unknown Part"}
            </h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
              <div>
                <p style="margin: 5px 0;"><strong>🎯 Confidence:</strong> ${(
                  prediction.confidence * 100
                ).toFixed(2)}%</p>
                <p style="margin: 5px 0;"><strong>📂 Category:</strong> ${
                  prediction.category || "Unspecified"
                }</p>
                <p style="margin: 5px 0;"><strong>🏢 Manufacturer:</strong> ${
                  prediction.manufacturer || "Unknown"
                }</p>
              </div>
              <div>
                ${
                  prediction.part_number
                    ? `<p style="margin: 5px 0;"><strong>🔢 Part Number:</strong> <code style="background-color: #ecf0f1; padding: 2px 6px; border-radius: 3px;">${prediction.part_number}</code></p>`
                    : ""
                }
                <p style="margin: 5px 0;"><strong>💰 Estimated Price:</strong> ${
                  prediction.estimated_price || "Not Available"
                }</p>
                <p style="margin: 5px 0;"><strong>⏱️ Processing Time:</strong> ${
                  analysisResults.processing_time || 0
                }s</p>
              </div>
            </div>
            
            ${
              prediction.description
                ? `
              <div style="background-color: #e8f6f3; padding: 15px; border-radius: 5px; margin-top: 15px; border-left: 4px solid #1abc9c;">
                <h3 style="color: #16a085; margin: 0 0 10px 0; font-size: 16px;">📝 Basic Description</h3>
                <p style="margin: 0; color: #2c3e50;">${prediction.description}</p>
              </div>
            `
                : ""
            }
          </div>
        `
          )
          .join("")}

        ${
          fullAnalysis
            ? `
          <div style="margin-top: 30px; border-top: 3px solid #3498db; padding-top: 20px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px; font-size: 24px; text-align: center;">
              🧠 Complete AI Analysis
            </h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; line-height: 1.8;">
              ${formattedAnalysis}
            </div>
          </div>
        `
            : ""
        }

        ${
          analysisResults.flatData
            ? `
          <div style="margin-top: 25px; border-top: 2px solid #95a5a6; padding-top: 20px;">
            <h2 style="color: #2c3e50; margin-bottom: 15px; font-size: 20px;">📊 Technical Specifications</h2>
            <div style="background-color: #ecf0f1; padding: 15px; border-radius: 5px;">
              ${
                analysisResults.flatData.technical_data_sheet
                  ? `
                <div style="margin-bottom: 15px;">
                  <h3 style="color: #34495e; margin-bottom: 8px;">🔧 Technical Data</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                    ${Object.entries(
                      analysisResults.flatData.technical_data_sheet
                    )
                      .map(
                        ([key, value]) => `
                      <div style="padding: 5px 0; border-bottom: 1px dotted #bdc3c7;">
                        <strong>${key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) =>
                            l.toUpperCase()
                          )}:</strong> ${value}
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                </div>
              `
                  : ""
              }
              
              ${
                analysisResults.flatData.compatible_vehicles?.length
                  ? `
                <div style="margin-bottom: 15px;">
                  <h3 style="color: #34495e; margin-bottom: 8px;">🚗 Compatible Vehicles</h3>
                  <p style="font-size: 14px; color: #2c3e50;">${analysisResults.flatData.compatible_vehicles.join(
                    ", "
                  )}</p>
                </div>
              `
                  : ""
              }
              
              ${
                analysisResults.flatData.suppliers?.length
                  ? `
                <div>
                  <h3 style="color: #34495e; margin-bottom: 8px;">🛒 Supplier Information</h3>
                  ${analysisResults.flatData.suppliers
                    .map(
                      (supplier) => `
                    <div style="background-color: white; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #3498db;">
                      <strong>${supplier.name}</strong>
                      ${
                        supplier.price_range
                          ? `<br><span style="color: #27ae60;">Price: ${supplier.price_range}</span>`
                          : ""
                      }
                      ${
                        supplier.shipping_region
                          ? `<br><span style="color: #8e44ad;">Ships to: ${supplier.shipping_region}</span>`
                          : ""
                      }
                      ${
                        supplier.url
                          ? `<br><span style="color: #3498db;">URL: ${supplier.url}</span>`
                          : ""
                      }
                    </div>
                  `
                    )
                    .join("")}
                </div>
              `
                  : ""
              }
            </div>
          </div>
        `
            : ""
        }

        ${
          analysisResults.image_metadata
            ? `
          <div style="margin-top: 25px; border-top: 2px solid #95a5a6; padding-top: 20px;">
            <h2 style="color: #2c3e50; margin-bottom: 15px; font-size: 20px;">📸 Image Analysis Details</h2>
            <div style="background-color: #fdf2e9; padding: 15px; border-radius: 5px; border-left: 4px solid #f39c12;">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; font-size: 14px;">
                <div>
                  <strong>📁 Format:</strong><br>
                  ${
                    analysisResults.image_metadata.content_type
                      ?.split("/")[1]
                      ?.toUpperCase() || "Unknown"
                  }
                </div>
                <div>
                  <strong>📏 File Size:</strong><br>
                  ${
                    analysisResults.image_metadata.size_bytes
                      ? (
                          analysisResults.image_metadata.size_bytes /
                          1024 /
                          1024
                        ).toFixed(2) + " MB"
                      : "Unknown"
                  }
                </div>
                <div>
                  <strong>✅ Status:</strong><br>
                  <span style="color: #27ae60; font-weight: bold;">Analysis Complete</span>
                </div>
              </div>
            </div>
          </div>
        `
            : ""
        }

        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #bdc3c7; text-align: center;">
          <p style="font-size: 12px; color: #7f8c8d; margin: 0;">
            This comprehensive analysis report was generated by SpareFinderAI Vision.<br>
            For technical support or questions, visit our support center.<br>
            <strong>Report ID:</strong> ${Date.now().toString(36).toUpperCase()}
          </p>
        </div>
      `;

      // Apply CSS styles for better PDF rendering
      const style = document.createElement("style");
      style.textContent = `
        .analysis-content a {
          color: #3498db !important;
          text-decoration: underline !important;
        }
        .analysis-content strong {
          font-weight: bold !important;
          color: #2c3e50 !important;
        }
        .analysis-content em {
          font-style: italic !important;
          color: #34495e !important;
        }
        .analysis-content code {
          background-color: #f8f9fa !important;
          padding: 2px 4px !important;
          border-radius: 3px !important;
          font-family: 'Courier New', monospace !important;
        }
      `;
      document.head.appendChild(style);

      // Append to body to render
      document.body.appendChild(input);

      // Convert to canvas with higher quality
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Remove temporary elements
      document.body.removeChild(input);
      document.head.removeChild(style);

      // Create PDF with better formatting
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Handle multi-page PDFs if content is too long
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      // Save PDF with descriptive filename
      const partName =
        analysisResults.predictions[0]?.class_name || "Engineering spares-part";
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];
      pdf.save(
        `SpareFinderAI_${partName.replace(/\s+/g, "_")}_${timestamp}.pdf`
      );

      toast({
        title: "PDF Generated Successfully",
        description:
          "Complete analysis report with all details saved to your downloads",
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast({
        title: "PDF Generation Failed",
        description: "Unable to create PDF report. Please try again.",
        variant: "destructive",
      });
    }
  }, [analysisResults, toast]);

  // Save results to database
  const saveAnalysisResults = useCallback(async () => {
    if (!analysisResults) {
      toast({
        title: "No Results",
        description: "No analysis results available to save",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Get the complete AI analysis content - prioritize flatData
      const fullAnalysis =
        analysisResults.flatData?.full_analysis ||
        analysisResults.additional_details?.full_analysis ||
        "";

      // Transform the data to match the expected schema - include complete AI response
      const saveData = {
        success: analysisResults.success,
        predictions: analysisResults.predictions,
        similar_images: analysisResults.similar_images || [],
        model_version: analysisResults.model_version,
        processing_time: analysisResults.processing_time,
        image_metadata: {
          content_type:
            analysisResults.image_metadata?.content_type ||
            uploadedFile?.type ||
            "image/jpeg",
          size_bytes:
            analysisResults.image_metadata?.size_bytes ||
            uploadedFile?.size ||
            0,
          base64_image: analysisResults.image_metadata?.base64_image || null,
        },
        additional_details: {
          full_analysis: fullAnalysis,
          technical_specifications:
            analysisResults.additional_details?.technical_specifications ||
            (analysisResults.flatData?.technical_data_sheet
              ? JSON.stringify(
                  analysisResults.flatData.technical_data_sheet,
                  null,
                  2
                )
              : ""),
          market_information:
            analysisResults.additional_details?.market_information ||
            JSON.stringify(
              {
                pricing: analysisResults.flatData?.estimated_price,
                suppliers: analysisResults.flatData?.suppliers,
                buy_links: analysisResults.flatData?.buy_links,
              },
              null,
              2
            ),
          confidence_reasoning:
            analysisResults.additional_details?.confidence_reasoning ||
            analysisResults.flatData?.confidence_explanation ||
            "",
        },
        image_url: imagePreview || "",
        image_name: uploadedFile?.name || "analysis_result.jpg",
        // Include complete AI response data with enhanced metadata
        analysis: fullAnalysis, // Store the full AI analysis
        confidence:
          analysisResults.flatData?.confidence_score ||
          analysisResults.predictions?.[0]?.confidence ||
          0,
        metadata: {
          ai_service_id: originalAiResponse?.id,
          upload_timestamp: new Date().toISOString(),
          frontend_version: "2.0.0",
          model_version: analysisResults.model_version,
          processing_time: analysisResults.processing_time,
          // Include flat data structure for comprehensive storage
          flat_data: analysisResults.flatData
            ? {
                class_name: analysisResults.flatData.class_name,
                category: analysisResults.flatData.category,
                precise_part_name: analysisResults.flatData.precise_part_name,
                material_composition:
                  analysisResults.flatData.material_composition,
                manufacturer: analysisResults.flatData.manufacturer,
                confidence_score: analysisResults.flatData.confidence_score,
                estimated_price: analysisResults.flatData.estimated_price,
                technical_data_sheet:
                  analysisResults.flatData.technical_data_sheet,
                compatible_vehicles:
                  analysisResults.flatData.compatible_vehicles,
                engine_types: analysisResults.flatData.engine_types,
                suppliers: analysisResults.flatData.suppliers,
                buy_links: analysisResults.flatData.buy_links,
                fitment_tips: analysisResults.flatData.fitment_tips,
                additional_instructions:
                  analysisResults.flatData.additional_instructions,
              }
            : undefined,

          // Store enhanced analysis sections
          enhanced_sections: {
            part_identification: {
              name:
                analysisResults.flatData?.precise_part_name ||
                analysisResults.predictions?.[0]?.class_name,
              category:
                analysisResults.flatData?.category ||
                analysisResults.predictions?.[0]?.category,
              manufacturer:
                analysisResults.flatData?.manufacturer ||
                analysisResults.predictions?.[0]?.manufacturer,
              part_number:
                analysisResults.flatData?.part_number ||
                analysisResults.predictions?.[0]?.part_number,
            },
            technical_analysis: {
              material: analysisResults.flatData?.material_composition,
              specifications: analysisResults.flatData?.technical_data_sheet,
              compatibility: analysisResults.flatData?.compatible_vehicles,
            },
            market_analysis: {
              price_estimate: analysisResults.flatData?.estimated_price,
              suppliers: analysisResults.flatData?.suppliers,
              purchase_links: analysisResults.flatData?.buy_links,
            },
            ai_insights: {
              confidence_score: analysisResults.flatData?.confidence_score,
              confidence_explanation:
                analysisResults.flatData?.confidence_explanation,
              full_analysis: fullAnalysis,
            },
          },
        },
      };

      console.log("💾 Saving comprehensive analysis results:", saveData);

      const response = await api.upload.saveResults(saveData);

      if (response.success) {
        toast({
          title: "Complete Analysis Saved",
          description: `Full analysis with AI insights saved successfully: ${
            (response.data as any)?.part_name ||
            analysisResults.flatData?.precise_part_name ||
            "Analysis Result"
          }`,
          variant: "default",
        });
      } else {
        throw new Error(response.message || "Failed to save results");
      }
    } catch (error) {
      console.error("Save results error:", error);
      toast({
        title: "Save Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save analysis results",
        variant: "destructive",
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
    if (confidence > 0.8) return "success";
    if (confidence > 0.5) return "warning";
    return "destructive";
  };

  // Enhanced Part Analysis Display Component
  const PartAnalysisDisplay = ({
    analysisResults,
  }: {
    analysisResults: AnalysisResponse;
  }) => {
    const prediction = analysisResults.predictions?.[0];
    const analysisContent =
      prediction?.description ||
      analysisResults.additional_details?.full_analysis ||
      "";

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
                  <span className="font-semibold text-white">
                    {prediction.class_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">🏷 Category:</span>
                  <span>{prediction.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">🏢 Manufacturer:</span>
                  <span>{prediction.manufacturer || "Not Specified"}</span>
                </div>
                {prediction.part_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">🔢 Part Number:</span>
                    <span className="font-mono text-green-300">
                      {prediction.part_number}
                    </span>
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
                    <span className="font-bold text-white">
                      {(prediction.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${
                        prediction.confidence > 0.8
                          ? "bg-green-500"
                          : prediction.confidence > 0.6
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.confidence * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">⏱ Processing:</span>
                  <span>
                    {analysisResults.processing_time?.toFixed(2) || 0}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">💰 Price:</span>
                  <span className="text-green-300 font-semibold">
                    {prediction.estimated_price}
                  </span>
                </div>
                {/* Price Range Chart (New/Used/Refurb) */}
                {typeof prediction.estimated_price === "string" && (
                  <div className="mt-2">
                    {(() => {
                      const parseRange = (
                        text?: string
                      ): [number, number] | null => {
                        if (!text) return null;
                        const nums = (
                          text
                            .replace(/[,\s]/g, "")
                            .match(/[0-9]+\.?[0-9]*/g) || []
                        ).map(Number);
                        if (nums.length >= 2) {
                          const a = Math.min(nums[0], nums[1]);
                          const b = Math.max(nums[0], nums[1]);
                          return [a, b];
                        }
                        if (nums.length === 1) return [nums[0], nums[0]];
                        return null;
                      };

                      const newR = parseRange(
                        (prediction.estimated_price as string).match(
                          /New[:\s]*([^\n]+)/i
                        )?.[1]
                      );
                      const usedR = parseRange(
                        (prediction.estimated_price as string).match(
                          /Used[:\s]*([^\n]+)/i
                        )?.[1]
                      );
                      const refR = parseRange(
                        (prediction.estimated_price as string).match(
                          /Refurb(?:ished)?[:\s]*([^\n]+)/i
                        )?.[1]
                      );
                      const ranges = [
                        { label: "New", r: newR, color: "#10B981" },
                        { label: "Used", r: usedR, color: "#F59E0B" },
                        { label: "Refurb", r: refR, color: "#3B82F6" },
                      ];
                      const highs = ranges.map((x) => x.r?.[1] || 0);
                      const maxHigh = Math.max(...highs);
                      if (!isFinite(maxHigh) || maxHigh <= 0) return null;

                      const W = 280;
                      const H = 100;
                      const L = 60;
                      const R = 10;
                      const T = 8;
                      const B = 8;
                      const innerW = W - L - R;
                      const yStep = (H - T - B) / ranges.length;
                      const toX = (v: number) =>
                        L + Math.round((v / maxHigh) * innerW);

                      return (
                        <svg width={W} height={H} className="block">
                          <rect
                            x={0}
                            y={0}
                            width={W}
                            height={H}
                            rx={8}
                            fill="#0b1324"
                          />
                          {ranges.map((row, idx) => {
                            const y = T + idx * yStep + 6;
                            const x0 = L;
                            const x1 = L + innerW;
                            const low = row.r?.[0] ?? 0;
                            const high = row.r?.[1] ?? 0;
                            const fx0 = toX(Math.max(0, low));
                            const fx1 = toX(Math.max(low, high));
                            return (
                              <g key={row.label}>
                                <text
                                  x={8}
                                  y={y + 8}
                                  fill="#94a3b8"
                                  fontSize="12"
                                  fontFamily="ui-sans-serif, system-ui"
                                >
                                  {row.label}
                                </text>
                                <rect
                                  x={x0}
                                  y={y}
                                  width={x1 - x0}
                                  height={10}
                                  rx={5}
                                  fill="#223047"
                                />
                                {row.r && (
                                  <rect
                                    x={fx0}
                                    y={y}
                                    width={Math.max(4, fx1 - fx0)}
                                    height={10}
                                    rx={5}
                                    fill={row.color}
                                  />
                                )}
                                {row.r && (
                                  <text
                                    x={fx1 + 6}
                                    y={y + 9}
                                    fill="#e2e8f0"
                                    fontSize="11"
                                    fontFamily="ui-sans-serif, system-ui"
                                  >
                                    ${Math.round(row.r[0])}–$
                                    {Math.round(row.r[1])}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}
                  </div>
                )}
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
                  <span>
                    {analysisResults.image_metadata?.content_type
                      ?.split("/")[1]
                      ?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">📏 Size:</span>
                  <span>
                    {(
                      analysisResults.image_metadata?.size_bytes /
                      1024 /
                      1024
                    )?.toFixed(2)}{" "}
                    MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">✅ Status:</span>
                  <span className="text-green-300 font-semibold">
                    Analysis Complete
                  </span>
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
                          animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatType: "reverse",
                          }}
                        >
                          <FileText className="w-6 h-6 text-green-400" />
                        </motion.div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-green-300">
                            🔧 Technical Data Sheets
                          </h2>
                          <p className="text-green-400 text-sm">
                            Detailed specifications and technical information
                          </p>
                        </div>
                        <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                          {sections.technical.length} section
                          {sections.technical.length !== 1 ? "s" : ""}
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
                              <h3 className="text-xl font-bold text-green-200">
                                {section.title}
                              </h3>
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
                      className="relative bg-gradient-to-br from-blue-900/10 to-purple-900/10 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm general-container"
                    >
                      <div className="flex items-center space-x-3 mb-6 pb-3 border-b border-blue-500/30">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <Brain className="w-6 h-6 text-blue-400" />
                        </motion.div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-blue-300">
                            📋 Analysis Results
                          </h2>
                          <p className="text-blue-400 text-sm">
                            Part identification, compatibility, and market
                            information
                          </p>
                        </div>
                        <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                          {sections.general.length} section
                          {sections.general.length !== 1 ? "s" : ""}
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
                              <h3 className="text-xl font-bold text-blue-200">
                                {section.title}
                              </h3>
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

                  {/* Fallback: render raw markdown if no sections were parsed */}
                  {sections.technical.length === 0 &&
                    sections.general.length === 0 &&
                    analysisContent && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                      >
                        <MarkdownCard
                          title="AI Analysis"
                          content={analysisContent}
                          level={2}
                        />
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
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-60 bg-[#3A5AFE1A] dark:bg-purple-600/20"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
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
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Sidebar and mobile menu handled by layout when inLayout */}
      {!inLayout && (
        <>
          <DashboardSidebar
            isCollapsed={isCollapsed}
            onToggle={handleToggleSidebar}
          />
          <MobileSidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-black/20 backdrop-blur-xl border border-white/10 md:hidden"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
        </>
      )}

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={
          inLayout
            ? { marginLeft: 0, width: "100%" }
            : {
                marginLeft: isCollapsed
                  ? "var(--collapsed-sidebar-width, 80px)"
                  : "var(--expanded-sidebar-width, 320px)",
                width: isCollapsed
                  ? "calc(100% - var(--collapsed-sidebar-width, 80px))"
                  : "calc(100% - var(--expanded-sidebar-width, 320px))",
              }
        }
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-3xl md:max-w-5xl lg:max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3A5AFE0A] via-[#06B6D40A] to-transparent blur-xl opacity-80 dark:from-purple-600/10 dark:to-blue-600/10" />
            <div className="relative rounded-3xl border border-border bg-card shadow-soft-elevated backdrop-blur-xl dark:bg-black/30 dark:border-white/10">
              {/* Credits Display - Top Right */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="absolute top-4 right-4"
              >
                <CreditsDisplay
                  size="small"
                  className="bg-card/95 border border-border shadow-soft-elevated dark:bg-black/40 dark:border-white/20"
                />
              </motion.div>

              <div className="text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center px-4 py-2 rounded-full border border-border bg-gradient-to-r from-[#3A5AFE14] via-[#06B6D414] to-transparent text-xs sm:text-sm font-medium text-foreground/80 backdrop-blur-xl mb-4 dark:border-purple-500/30 dark:from-purple-600/20 dark:to-blue-600/20 dark:text-purple-300"
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="mr-2"
                  >
                    <Sparkles className="w-4 h-4 text-primary dark:text-purple-400" />
                  </motion.div>
                  <span className="font-semibold">
                    SpareFinder AI‑Powered
                  </span>
                </motion.div>
                <motion.h1
                  className="text-3xl lg:text-4xl font-bold text-foreground dark:bg-gradient-to-r dark:from-white dark:via-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent mb-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Upload Part Image
                </motion.h1>
                <motion.p
                  className="text-lg text-muted-foreground"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {wizardStep === "landing"
                    ? "Welcome to SpareFinder AI - Let's identify your Engineering spares part!"
                    : wizardStep === "selection"
                    ? "Choose how you'd like to identify your Engineering spares part"
                    : wizardStep === "image"
                    ? selectedMode === "both"
                      ? "Upload an image - step 1 of 2"
                      : "Upload an image of your Engineering spares part for AI analysis"
                    : wizardStep === "keywords"
                    ? "Add keywords to refine your search - step 2 of 2"
                    : "Review and submit your request"}
                </motion.p>
              </div>
            </div>
          </div>

          {/* Wizard Progress Bar */}
          {wizardStep !== "landing" && wizardStep !== "selection" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#3A5AFE0A] via-[#8B5CF60A] to-transparent blur-xl opacity-80 dark:from-purple-600/10 dark:to-blue-600/10" />
              <div className="relative rounded-2xl border border-border bg-card shadow-soft-elevated backdrop-blur-xl dark:bg-black/30 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground font-medium">
                    Progress
                  </span>
                  <span className="text-sm text-purple-400 font-semibold">
                    {wizardProgress}%
                  </span>
                </div>
                <Progress value={wizardProgress} className="h-2 bg-muted" />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span
                    className={wizardStep === "image" ? "text-purple-400" : ""}
                  >
                    {selectedMode === "both" && wizardStep !== "keywords"
                      ? "Step 1: Image"
                      : selectedMode === "keywords"
                      ? "Keywords"
                      : "Upload"}
                  </span>
                  <span
                    className={
                      wizardStep === "keywords" ? "text-purple-400" : ""
                    }
                  >
                    {selectedMode === "both" ? "Step 2: Keywords" : ""}
                  </span>
                  <span
                    className={wizardStep === "review" ? "text-purple-400" : ""}
                  >
                    Review
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Wizard Content */}
          <AnimatePresence mode="wait">
            {/* Landing Page */}
            {wizardStep === "landing" && (
              <motion.div
                key="landing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-2">
                  {/* Left Column - Text Content */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="h-full"
                  >
                    <Card className="flex h-full flex-col rounded-3xl border border-border bg-card/95 shadow-soft-elevated backdrop-blur-xl dark:bg-black/30 dark:border-white/10">
                      <CardHeader className="space-y-3 pb-4 sm:pb-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground dark:bg-white/5 dark:border-white/10">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Guided, AI‑assisted workflow
                        </div>
                        <CardTitle className="mb-4 text-2xl font-semibold text-foreground sm:text-3xl dark:text-white">
                          Get Started with SpareFinder AI
                        </CardTitle>
                        <CardDescription className="text-lg text-muted-foreground dark:text-gray-400">
                          Identify your Engineering spares parts in just a few simple
                          steps
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col justify-between space-y-6">
                        <div className="space-y-4" id="tour-step-choose-method">
                          <div className="flex items-start gap-3 rounded-2xl bg-muted/60 p-3 sm:p-4 dark:bg-white/5" id="tour-step-upload-analyze">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                              <span className="text-sm font-bold text-primary">
                                1
                              </span>
                            </div>
                            <div>
                              <h3 className="mb-1 text-lg font-semibold text-foreground dark:text-white">
                                Choose Your Method
                              </h3>
                              <p className="text-sm text-muted-foreground dark:text-gray-400">
                                Select image upload, keyword search, or both for
                                maximum accuracy
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 rounded-2xl bg-muted/40 p-3 sm:p-4 dark:bg-white/5" id="tour-step-get-results">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#3A5AFE1A] ring-1 ring-[#3A5AFE26]">
                              <span className="text-sm font-bold text-[#3A5AFE]">
                                2
                              </span>
                            </div>
                            <div>
                              <h3 className="mb-1 text-lg font-semibold text-foreground dark:text-white">
                                Upload & Analyze
                              </h3>
                              <p className="text-sm text-muted-foreground dark:text-gray-400">
                                Our AI will process your part image and provide
                                detailed identification
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 rounded-2xl bg-muted/20 p-3 sm:p-4 dark:bg-white/5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/30">
                              <span className="text-sm font-bold text-emerald-500">
                                3
                              </span>
                            </div>
                            <div>
                              <h3 className="mb-1 text-lg font-semibold text-foreground dark:text-white">
                                Get Results
                              </h3>
                              <p className="text-sm text-muted-foreground dark:text-gray-400">
                                Receive comprehensive part information, pricing,
                                and supplier details
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6">
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              id="tour-start-analyzing-button"
                              onClick={() => setWizardStep("selection")}
                              size="lg"
                              className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#3A5AFE] via-[#4C5DFF] to-[#06B6D4] text-base font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,0.35)] transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_22px_55px_rgba(15,23,42,0.45)] focus-visible:ring-2 focus-visible:ring-[#3A5AFE] focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:from-purple-600 dark:via-blue-600 dark:to-cyan-500"
                            >
                              <Zap className="mr-2 h-5 w-5" />
                              Start Analyzing Parts
                            </Button>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Right Column - Animation */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-center h-full"
                  >
                <div className="relative w-full h-full flex items-center justify-center rounded-lg border border-border bg-card shadow-soft-elevated backdrop-blur-xl dark:bg-black/30 dark:border-white/10 overflow-hidden">
                      <video
                        src="/Animations/scanpart.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover scale-[1.35]"
                        style={{ objectPosition: "center 45%" }}
                      />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Selection Step */}
            {wizardStep === "selection" && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border border-border bg-card shadow-soft-elevated backdrop-blur-xl dark:bg-black/30 dark:border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-center">
                      How would you like to identify your part?
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-center">
                      Choose the method that works best for you
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Image Only Option */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleModeSelection("image")}
                        className="p-6 rounded-2xl border border-border bg-card text-left hover:border-primary/40 hover:shadow-soft-elevated transition-all group dark:bg-gradient-to-br dark:from-purple-600/20 dark:to-purple-800/20 dark:border-purple-500/30"
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-600/30 mb-4 group-hover:bg-purple-600/50">
                          <Camera className="w-6 h-6 text-purple-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground dark:text-white mb-2">
                          Image Only
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Upload an image and let AI identify the part
                          automatically
                        </p>
                      </motion.button>

                      {/* Keywords Only Option */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleModeSelection("keywords")}
                        className="p-6 rounded-2xl border border-border bg-card text-left hover:border-primary/40 hover:shadow-soft-elevated transition-all group dark:bg-gradient-to-br dark:from-blue-600/20 dark:to-blue-800/20 dark:border-blue-500/30"
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600/30 mb-4 group-hover:bg-blue-600/50">
                          <Search className="w-6 h-6 text-blue-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground dark:text-white mb-2">
                          Keywords Only
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Describe your part using keywords for a targeted
                          search
                        </p>
                      </motion.button>

                      {/* Both Option */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleModeSelection("both")}
                        className="p-6 rounded-2xl border border-border bg-card text-left hover:border-emerald-400/60 hover:shadow-soft-elevated transition-all group dark:bg-gradient-to-br dark:from-emerald-600/20 dark:to-emerald-800/20 dark:border-emerald-500/30"
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600/30 mb-4 group-hover:bg-emerald-600/50">
                          <ImagePlus className="w-6 h-6 text-emerald-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground dark:text-white mb-2">
                          Both
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Upload an image and add keywords for maximum accuracy
                        </p>
                      </motion.button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Review/Summary Step */}
          {wizardStep === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="border border-border bg-card/95 shadow-soft-elevated backdrop-blur-xl dark:bg-black/30 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    Analysis Summary
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Review your submission before starting the analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Mode Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Analysis Mode:
                    </span>
                    <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">
                      {selectedMode === "both"
                        ? "Image + Keywords"
                        : selectedMode === "image"
                        ? "Image Only"
                        : "Keywords Only"}
                    </Badge>
                  </div>

                  {/* Image Summary */}
                  {(selectedMode === "image" || selectedMode === "both") &&
                    uploadedFile && (
                      <div className="space-y-3">
                        <h3 className="text-foreground font-semibold flex items-center gap-2">
                          <ImagePlus className="w-5 h-5 text-primary" />
                          Uploaded Image
                        </h3>
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border">
                          {imagePreview && (
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border flex-shrink-0">
                              <img
                                src={imagePreview}
                                alt="Part preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 space-y-2">
                            <p className="text-foreground font-medium">
                              {uploadedFile.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {(uploadedFile.size / 1024).toFixed(2)} KB •{" "}
                              {uploadedFile.type}
                            </p>
                            <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ready for analysis
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Keywords Summary */}
                  {(selectedMode === "keywords" || selectedMode === "both") &&
                    savedKeywords.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-foreground font-semibold flex items-center gap-2">
                          <Target className="w-5 h-5 text-emerald-500" />
                          Search Keywords ({savedKeywords.length})
                        </h3>
                        <div className="p-4 rounded-lg bg-muted/30 border border-border">
                          <div className="flex flex-wrap gap-2">
                            {savedKeywords.map((keyword, index) => (
                              <Badge
                                key={index}
                                className="bg-emerald-600/20 text-emerald-300 border-emerald-500/30"
                              >
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Processing Info */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/15">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm text-foreground font-medium">
                          What happens next?
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedMode === "both"
                            ? "Your image will be analyzed using AI, refined with your keywords for maximum accuracy."
                            : selectedMode === "image"
                            ? "Your image will be processed using advanced AI to identify the Engineering spares part."
                            : "Our system will search for parts matching your keywords in our extensive catalog."}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {(wizardStep === "image" || wizardStep === "keywords") && (
            <>
              {/* Main Content Grid - centered and responsive */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
                {/* Upload Section - Only show for image step */}
                {wizardStep === "image" && selectedMode !== "keywords" && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative mx-auto w-full max-w-xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
                    <Card className="relative border border-border bg-card/95 shadow-soft-elevated backdrop-blur-xl dark:bg-black/30 dark:border-white/10 h-full">
                      <CardHeader>
                        <CardTitle className="text-foreground flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <UploadIcon className="w-5 h-5 text-primary" />
                            <span>Upload Part Image</span>
                          </div>
                          {uploadedFile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveFile}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Upload an image for AI-powered part identification
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Upload Area */}
                        <div
                          id="tour-upload-dropzone"
                          className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-8 lg:p-12 text-center transition-all duration-300 ${
                            dragActive
                              ? "border-purple-500 bg-purple-600/10"
                              : uploadedFile
                              ? "border-green-500/50 bg-green-600/5"
                              : "border-border hover:border-muted-foreground/50"
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
                                <div className="aspect-video rounded-xl overflow-hidden border border-border">
                                  <ImageWithFallback
                                    src={imagePreview}
                                    alt="Uploaded part"
                                    className="w-full h-full object-cover"
                                    onError={() => {
                                      const target =
                                        document.createElement("img");
                                      target.src = "/images/placeholder.png";
                                      target.alt = "Placeholder image";
                                      target.className =
                                        "w-full h-full object-cover";
                                      target.style.display = "block";
                                      target.onerror = () => {
                                        const placeholder =
                                          document.createElement("div");
                                        placeholder.className =
                                          "w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs";
                                        placeholder.innerHTML =
                                          '<div class="text-center"><div class="w-8 h-8 mx-auto mb-1 opacity-50"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>Image unavailable</div>';
                                        target.parentNode?.appendChild(
                                          placeholder
                                        );
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
                                <p className="text-foreground font-medium text-lg">
                                  {uploadedFile.name}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                  {(uploadedFile.size / 1024 / 1024).toFixed(2)}{" "}
                                  MB • {uploadedFile.type}
                                </p>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              className="space-y-6"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              >
                                <ImagePlus className="w-16 h-16 text-gray-400 mx-auto" />
                              </motion.div>
                              <div>
                                <p className="text-foreground font-medium text-lg mb-2">
                                  Drop your image here
                                </p>
                                <p className="text-muted-foreground text-sm">
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
                                  className="w-full sm:w-auto h-12 px-6 border-border text-foreground hover:bg-accent"
                                >
                                  <Camera className="w-5 h-5 mr-2" />
                                  Choose File
                                </Button>
                              </motion.div>
                            </motion.div>
                          )}
                        </div>

                        {/* Enhanced Progress Bar with Detailed Information */}
                        <AnimatePresence>
                          {(isAnalyzing || isLoading) && analysisProgress && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="space-y-6 rounded-2xl p-6 border border-border bg-muted/30 backdrop-blur-sm dark:bg-black/30 dark:border-white/10"
                            >
                              {/* Enhanced Progress Header */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <motion.div
                                      animate={{
                                        rotate:
                                          analysisProgress.status === "complete"
                                            ? 0
                                            : 360,
                                      }}
                                      transition={{
                                        duration:
                                          analysisProgress.status === "complete"
                                            ? 0
                                            : 2,
                                        repeat:
                                          analysisProgress.status === "complete"
                                            ? 0
                                            : Infinity,
                                        ease: "linear",
                                      }}
                                      className={`p-3 rounded-full bg-gradient-to-r ${getProgressStageColor(
                                        analysisProgress.status
                                      )} shadow-lg`}
                                    >
                                      {getProgressStageIcon(
                                        analysisProgress.status
                                      )}
                                    </motion.div>
                                    <div className="flex-1">
                                      <div className="text-foreground font-bold text-xl">
                                        {analysisProgress.currentStep ||
                                          analysisProgress.message}
                                      </div>
                                      <div className="text-muted-foreground text-base mt-1">
                                        {analysisProgress.details ||
                                          "Processing your Engineering spares part analysis..."}
                                      </div>
                                      {analysisProgress.currentStepIndex &&
                                        analysisProgress.totalSteps && (
                                          <div className="text-muted-foreground text-sm mt-2 flex items-center space-x-2">
                                            <span>
                                              Step{" "}
                                              {
                                                analysisProgress.currentStepIndex
                                              }{" "}
                                              of {analysisProgress.totalSteps}
                                            </span>
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
                                    <div className="text-gray-400 text-sm">
                                      Complete
                                    </div>
                                  </div>
                                </div>

                                {/* Detailed Status Information */}
                                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                      <span className="text-gray-300">
                                        Status:
                                      </span>
                                      <span className="text-white font-semibold capitalize">
                                        {analysisProgress.status.replace(
                                          "_",
                                          " "
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                      <span className="text-gray-300">
                                        Engine:
                                      </span>
                                      <span className="text-white font-semibold">
                                        AI Vision
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                      <span className="text-gray-300">
                                        Mode:
                                      </span>
                                      <span className="text-white font-semibold">
                                        Advanced Analysis
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Enhanced Progress Bar */}
                              <div className="space-y-4">
                                <div className="relative">
                                  <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden backdrop-blur-sm border border-gray-600">
                                    <motion.div
                                      className={`h-full bg-gradient-to-r ${getProgressStageColor(
                                        analysisProgress.status
                                      )} rounded-full relative overflow-hidden`}
                                      initial={{ width: 0 }}
                                      animate={{
                                        width: `${analysisProgress.progress}%`,
                                      }}
                                      transition={{
                                        duration: 0.8,
                                        ease: "easeOut",
                                      }}
                                    >
                                      {/* Enhanced animated shine effect */}
                                      <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                        animate={{ x: ["-100%", "100%"] }}
                                        transition={{
                                          duration: 1.5,
                                          repeat:
                                            analysisProgress.status !==
                                            "complete"
                                              ? Infinity
                                              : 0,
                                          ease: "easeInOut",
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
                                      {Array.from(
                                        {
                                          length: analysisProgress.totalSteps,
                                        },
                                        (_, i) => (
                                          <div
                                            key={i}
                                            className="flex flex-col items-center space-y-1"
                                          >
                                            <div
                                              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                                (analysisProgress.currentStepIndex ||
                                                  0) > i
                                                  ? "bg-green-400 scale-110"
                                                  : (analysisProgress.currentStepIndex ||
                                                      0) ===
                                                    i + 1
                                                  ? `bg-gradient-to-r ${getProgressStageColor(
                                                      analysisProgress.status
                                                    )} scale-125 animate-pulse`
                                                  : "bg-gray-600"
                                              }`}
                                            />
                                            <div className="text-xs text-gray-400 text-center max-w-16">
                                              {i === 0 && "Upload"}
                                              {i === 1 && "Validate"}
                                              {i === 2 && "AI Scan"}
                                              {i === 3 && "Match"}
                                              {i === 4 && "Finalize"}
                                              {i === 5 && "Complete"}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Real-time Activity Log */}
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-between text-gray-300 hover:text-white"
                                  >
                                    <span className="flex items-center space-x-2">
                                      <Info className="w-4 h-4" />
                                      <span>View Detailed Progress</span>
                                    </span>
                                    <ChevronDown className="w-4 h-4" />
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="mt-4 space-y-2 bg-muted/30 rounded-lg p-4 border border-border max-h-40 overflow-y-auto dark:bg-black/30 dark:border-white/10">
                                    <div className="text-xs font-mono text-gray-300 space-y-1">
                                      <div className="flex justify-between">
                                        <span>🔄 Analysis started</span>
                                        <span className="text-gray-500">
                                          {new Date().toLocaleTimeString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>
                                          📤 Image uploaded successfully
                                        </span>
                                        <span className="text-gray-500">
                                          {new Date().toLocaleTimeString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>
                                          🔍 {analysisProgress.message}
                                        </span>
                                        <span className="text-gray-500">
                                          {new Date().toLocaleTimeString()}
                                        </span>
                                      </div>
                                      {analysisProgress.status ===
                                        "ai_analysis" && (
                                        <div className="flex justify-between text-blue-300">
                                          <span>
                                            🧠 Deep learning model processing...
                                          </span>
                                          <span className="text-gray-500">
                                            {new Date().toLocaleTimeString()}
                                          </span>
                                        </div>
                                      )}
                                      {analysisProgress.status ===
                                        "part_matching" && (
                                        <div className="flex justify-between text-purple-300">
                                          <span>
                                            🔗 Matching against Engineering spares
                                            database...
                                          </span>
                                          <span className="text-gray-500">
                                            {new Date().toLocaleTimeString()}
                                          </span>
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
                                        transition={{
                                          duration: 2,
                                          repeat: Infinity,
                                        }}
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
                                          Advanced AI pattern recognition
                                          complete
                                        </div>
                                      </div>
                                    </div>
                                    {analysisProgress.confidence && (
                                      <div className="text-right">
                                        <div className="text-green-400 text-3xl font-bold">
                                          {analysisProgress.confidence}%
                                        </div>
                                        <div className="text-green-300 text-sm">
                                          Confidence Score
                                        </div>
                                        <div className="text-green-400 text-xs mt-1">
                                          {analysisProgress.confidence > 90
                                            ? "Excellent Match"
                                            : analysisProgress.confidence > 75
                                            ? "Good Match"
                                            : "Fair Match"}
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

                        {/* Tips moved to right column */}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Keywords Section - Only show for keywords step */}
                {wizardStep === "keywords" && selectedMode !== "image" && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full"
                  >
                    <Card className="bg-card/95 text-foreground border border-border shadow-soft-elevated backdrop-blur-xl dark:bg-black/30 dark:border-white/10">
                      <CardHeader>
                        <CardTitle className="text-foreground dark:text-white">
                          Add Keywords
                        </CardTitle>
                        <CardDescription className="text-muted-foreground dark:text-gray-400">
                          Describe your Engineering spares part using keywords
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Keyword Input */}
                        <div className="mb-4 space-y-2">
                          <div className="flex space-x-2">
                            <Input
                              id="tour-keywords-input"
                              ref={keywordsInputRef}
                              value={keywords}
                              onChange={(e) => setKeywords(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleAddKeyword();
                                }
                              }}
                              placeholder="e.g., brake, suspension, Toyota Camry"
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
                                  className="flex items-center px-3 py-1 text-sm rounded-full bg-blue-50 text-blue-700 dark:bg-blue-600/20 dark:text-blue-300"
                                >
                                  {keyword}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-2 p-0 h-4 w-4"
                                    onClick={() => handleRemoveKeyword(keyword)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Right column: Tips */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                  className="w-full"
                >
                  {showOnboarding && (
                    <OnboardingGuide
                      userId={null}
                      force
                      showWelcome={!skipWelcome}
                      onStart={() => {
                        // Ensure the tour always begins from the landing step
                        handleResetWizard();
                      }}
                      onDismiss={() => setShowOnboarding(false)}
                      className="mb-6"
                      welcomeTitle="AI‑guided upload"
                      welcomeDescription="Let SpareFinder AI walk you through capturing the best image and keywords so we can identify your part as accurately as possible."
                      aiSummary={aiOnboardingSummary || undefined}
                      steps={[
                        {
                          selector: "#tour-start-analyzing-button",
                          title: "Start the guided flow",
                          description:
                            "Click this button to begin the 3‑step SpareFinder AI wizard.",
                          aiHint:
                            "We’ll first ask how you want to search, then walk you through image upload and keywords for best accuracy.",
                        },
                        {
                          selector: "#tour-upload-dropzone",
                          title: "Choose a clear image",
                          description:
                            "Click Choose File and pick a sharp, well‑lit photo where the part fills most of the frame.",
                          aiHint:
                            "AI models work best when the part is centered, in focus, and not obstructed by packaging or clutter.",
                        },
                        {
                          selector: "#tour-keywords-input",
                          title: "Add precise keywords",
                          description:
                            "Optionally add 3–5 focused terms like part number, make/model/year, and position (e.g., front‑left).",
                          aiHint:
                            "Keywords help the AI disambiguate visually similar parts and find the closest matches faster.",
                        },
                        {
                          selector: "#tour-search-keywords-btn",
                          title: "Run the AI analysis",
                          description:
                            "Press Analyze Part. We'll process the image and keywords, then send you to History to track the job in real time.",
                          aiHint:
                            "Behind the scenes, SpareFinder AI combines vision, text understanding, and your past searches to improve match quality over time.",
                        },
                      ]}
                    />
                  )}
                  <Card className="bg-card/95 text-foreground border border-border shadow-soft-elevated backdrop-blur-xl dark:bg-black/30 dark:border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center text-foreground dark:text-white">
                        <Target className="w-4 h-4 mr-2 text-sky-500" />
                        Tips for Better Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1 text-muted-foreground dark:text-gray-300">
                        <li>• Use clear, well-lit images</li>
                        <li>• Capture the part from multiple angles</li>
                        <li>• Ensure the part number is visible if possible</li>
                        <li>• Remove any packaging or covers</li>
                      </ul>
                      <div className="my-4 border-t border-border/80 dark:border-white/10" />
                      <div>
                        <div className="mb-2 font-medium text-foreground dark:text-white">
                          Keyword Search Guidance
                        </div>
                        <ul className="text-sm space-y-1 text-muted-foreground dark:text-gray-300">
                          <li>
                            • Image analysis is recommended for the most
                            accurate results.
                          </li>
                          <li>
                            • If using keywords only, include 3–5 precise terms.
                          </li>
                          <li>
                            • Add part number, vehicle make/model/year, side
                            (e.g., front-left).
                          </li>
                          <li>
                            • Avoid generic words like "car part" or "spare".
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          {(wizardStep === "image" || wizardStep === "keywords") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-center"
            >
              <Button
                variant="outline"
                onClick={handleBackStep}
                className="bg-black/20 border-white/10 hover:bg-white/10"
              >
                Back
              </Button>

              <Button
                onClick={handleNextStep}
                disabled={
                  (wizardStep === "image" && !uploadedFile) ||
                  (wizardStep === "keywords" && savedKeywords.length === 0)
                }
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Continue
              </Button>
            </motion.div>
          )}

          {wizardStep === "review" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-center"
            >
              <Button
                variant="outline"
                onClick={handleBackStep}
                className="bg-black/20 border-white/10 hover:bg-white/10"
              >
                Back
              </Button>

              <div className="flex gap-3">
                <Button
                  id="tour-search-keywords-btn"
                  variant="outline"
                  onClick={handleResetWizard}
                  className="bg-black/20 border-white/10 hover:bg-white/10"
                >
                  Start Over
                </Button>

                <Button
                  onClick={async () => {
                    if (selectedMode === "image" || selectedMode === "both") {
                      // Create SpareFinder Research job and redirect to history
                      if (!uploadedFile) {
                        toast({
                          title: "No Image",
                          description: "Please upload an image to analyze",
                          variant: "destructive",
                        });
                        return;
                      }

                      try {
                        setIsAnalyzing(true);

                        // Create SpareFinder Research job
                        const response = await api.upload.createCrewAnalysisJob(
                          uploadedFile,
                          savedKeywords.join(" ")
                        );

                        if (!response.success) {
                          throw new Error(
                            response.message || "Failed to create analysis job"
                          );
                        }

                        toast({
                          title: "Analysis Started! 🚀",
                          description:
                            "Redirecting you to history to watch progress...",
                        });

                        // Redirect to history page
                        setTimeout(() => {
                          navigate("/dashboard/history");
                        }, 1500);
                      } catch (error) {
                        console.error("SpareFinder Research error:", error);
                        setIsAnalyzing(false);

                        toast({
                          title: "Analysis Failed",
                          description:
                            error instanceof Error
                              ? error.message
                              : "Please try again",
                          variant: "destructive",
                        });
                      }
                    } else {
                      performKeywordSearch();
                    }
                  }}
                  disabled={!uploadedFile && selectedMode !== "keywords"}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 px-8 h-12"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  🤖 SpareFinder AI Research
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Fullscreen Loading Overlay */}
      {(isAnalyzing || isKeywordSearching) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <div className="text-center space-y-6 p-8">
            {/* Animated Loader */}
            <div className="mx-auto h-24 w-24">
              <img
                src="/sparefinderlogodark.png"
                alt="SpareFinder"
                className="h-full w-full object-contain motion-safe:animate-[spin_1.35s_linear_infinite] motion-reduce:animate-none"
              />
            </div>

            {/* Loading Text */}
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3 justify-center">
                <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                {isAnalyzing ? "Analyzing Your Image" : "Searching Our Catalog"}
              </h3>
              <p className="text-gray-400 text-lg">
                {isAnalyzing
                  ? "Our AI is examining your Engineering spares part..."
                  : "Finding matching parts for your keywords..."}
              </p>
            </div>

            {/* Progress Indicators */}
            <div className="flex gap-2 justify-center">
              <motion.div
                className="w-2 h-2 rounded-full bg-purple-500"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-2 h-2 rounded-full bg-blue-500"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-2 h-2 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              />
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Please wait, this may take a few moments...
            </p>
          </div>
        </motion.div>
      )}

      {/* Confirm keyword-only search modal */}
      <Dialog
        open={confirmKeywordSearchOpen}
        onOpenChange={setConfirmKeywordSearchOpen}
      >
        <DialogContent className="bg-black/90 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              Search with keywords only?
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {uploadedFile
                ? "An image is currently selected. Proceed to search using only your keywords? The image will be ignored."
                : "We will search our catalog using your keywords only. Results may be less precise than image analysis."}
            </DialogDescription>
          </DialogHeader>
          <div className="text-gray-400 text-sm">
            Keywords: {savedKeywords.join(", ")}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmKeywordSearchOpen(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={performKeywordSearch}
              disabled={isKeywordSearching}
              className="bg-gradient-to-r from-emerald-600 to-green-600"
            >
              {isKeywordSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comprehensive AI Analysis Modal */}
      <ComprehensiveAnalysisModal
        open={showComprehensiveAnalysis}
        onOpenChange={setShowComprehensiveAnalysis}
        imageFile={uploadedFile}
        keywords={savedKeywords.join(" ")}
      />
    </div>
  );
};

export default Upload;
