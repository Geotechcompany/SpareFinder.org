// AI Service for Part Recognition
import { toast } from '@/hooks/use-toast';

// Types and Interfaces
export interface PartPrediction {
  id: string;
  partName: string;
  partNumber: string;
  category: string;
  manufacturer: string;
  confidence: number;
  description: string;
  specifications: Record<string, any>;
  estimatedPrice: {
    min: number;
    max: number;
    currency: string;
  };
  compatibility: VehicleCompatibility[];
  suppliers: Supplier[];
  images: string[];
  tags: string[];
  lastUpdated: string;
}

export interface VehicleCompatibility {
  make: string;
  model: string;
  years: string;
  engine?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  price: number;
  currency: string;
  availability: 'in_stock' | 'limited' | 'out_of_stock';
  rating: number;
  reviewCount: number;
  shippingTime: string;
  url: string;
}

export interface AnalysisRequest {
  imageFile: File;
  analysisType: 'standard' | 'detailed' | 'premium';
  includeSuppliers?: boolean;
  includeCompatibility?: boolean;
}

export interface AnalysisResponse {
  success: boolean;
  analysisId: string;
  predictions: PartPrediction[];
  processingTime: number;
  metadata: {
    imageSize: number;
    imageFormat: string;
    modelVersion: string;
    confidence: number;
  };
  error?: string;
}

export interface AnalysisProgress {
  stage: 'uploading' | 'processing' | 'analyzing' | 'enriching' | 'complete' | 'error';
  progress: number;
  message: string;
  details?: string;
}

// Configuration
const AI_SERVICE_CONFIG = {
  baseUrl: import.meta.env.VITE_AI_SERVICE_URL || 'https://ai-sparefinder-org.onrender.com',
  apiKey: import.meta.env.VITE_AI_API_KEY,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  timeoutMs: 60000, // 60 seconds
};

// Utility Functions
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > AI_SERVICE_CONFIG.maxFileSize) {
    return { 
      valid: false, 
      error: `File size too large. Maximum allowed: ${AI_SERVICE_CONFIG.maxFileSize / 1024 / 1024}MB` 
    };
  }

  if (!AI_SERVICE_CONFIG.supportedFormats.includes(file.type)) {
    return { 
      valid: false, 
      error: `Unsupported file format. Supported: ${AI_SERVICE_CONFIG.supportedFormats.join(', ')}` 
    };
  }

  return { valid: true };
};

export const compressImage = async (file: File, maxWidth = 1024, quality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original
          }
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

// API Service Class
class AIPartService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = AI_SERVICE_CONFIG.baseUrl;
    this.apiKey = AI_SERVICE_CONFIG.apiKey || '';
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.apiKey) {
      defaultHeaders['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI Service Request Error:', error);
      throw error;
    }
  }

  async uploadAndAnalyze(
    request: AnalysisRequest,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResponse> {
    try {
      // Validate file
      const validation = validateImageFile(request.imageFile);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      onProgress?.({
        stage: 'uploading',
        progress: 0,
        message: 'Preparing image for upload...',
      });

      // Compress image if needed
      let processedFile = request.imageFile;
      if (request.imageFile.size > 2 * 1024 * 1024) { // 2MB threshold
        onProgress?.({
          stage: 'uploading',
          progress: 10,
          message: 'Compressing image...',
        });
        processedFile = await compressImage(request.imageFile);
      }

      onProgress?.({
        stage: 'uploading',
        progress: 25,
        message: 'Uploading image...',
      });

      // Create form data
      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('analysis_type', request.analysisType);
      formData.append('include_suppliers', String(request.includeSuppliers ?? true));
      formData.append('include_compatibility', String(request.includeCompatibility ?? true));

      onProgress?.({
        stage: 'processing',
        progress: 50,
        message: 'Processing image...',
      });

      // Make API request
      const response = await this.makeRequest<AnalysisResponse>('/api/v1/analyze/upload', {
        method: 'POST',
        body: formData,
      });

      onProgress?.({
        stage: 'analyzing',
        progress: 75,
        message: 'Analyzing part...',
      });

      // Simulate additional processing time for UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      onProgress?.({
        stage: 'enriching',
        progress: 90,
        message: 'Enriching data...',
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Analysis complete!',
      });

      return response;
    } catch (error) {
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getAnalysisStatus(analysisId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    result?: AnalysisResponse;
  }> {
    return this.makeRequest(`/api/v1/analyze/status/${analysisId}`);
  }

  async searchSimilarParts(partId: string): Promise<PartPrediction[]> {
    return this.makeRequest(`/api/v1/parts/${partId}/similar`);
  }

  async getPartDetails(partId: string): Promise<PartPrediction> {
    return this.makeRequest(`/api/v1/parts/${partId}`);
  }

  async submitFeedback(analysisId: string, feedback: {
    correct: boolean;
    actualPartName?: string;
    actualPartNumber?: string;
    comments?: string;
  }): Promise<{ success: boolean }> {
    return this.makeRequest(`/api/v1/analyze/${analysisId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    });
  }
}

// Export singleton instance
export const aiPartService = new AIPartService();

// React Hook for easier integration
export const useAIAnalysis = () => {
  const analyzeImage = async (
    file: File,
    options: Partial<AnalysisRequest> = {},
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResponse | null> => {
    try {
      const request: AnalysisRequest = {
        imageFile: file,
        analysisType: 'standard',
        includeSuppliers: true,
        includeCompatibility: true,
        ...options,
      };

      return await aiPartService.uploadAndAnalyze(request, onProgress);
    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    analyzeImage,
    validateFile: validateImageFile,
    compressImage,
  };
};

// Mock data for development/testing
export const mockAnalysisResponse: AnalysisResponse = {
  success: true,
  analysisId: 'mock-analysis-123',
  processingTime: 2500,
  metadata: {
    imageSize: 1024 * 1024 * 2.5,
    imageFormat: 'image/jpeg',
    modelVersion: 'v2.1.0',
    confidence: 94.2,
  },
  predictions: [
    {
      id: 'part-brake-pad-001',
      partName: 'Premium Ceramic Brake Pad Set',
      partNumber: 'BP-2134-F-PRO',
      category: 'Braking System',
      manufacturer: 'Bosch',
      confidence: 94.2,
      description: 'High-performance ceramic brake pads designed for superior stopping power and reduced dust.',
      specifications: {
        material: 'Ceramic',
        thickness: '12.5mm',
        width: '63.2mm',
        length: '156.4mm',
        weight: '1.2kg',
        operatingTemp: '-40°C to 350°C',
      },
      estimatedPrice: {
        min: 89.99,
        max: 129.99,
        currency: 'GBP',
      },
      compatibility: [
        {
          make: 'Toyota',
          model: 'Camry',
          years: '2018-2022',
          engine: '2.5L I4',
        },
        {
          make: 'Honda',
          model: 'Accord',
          years: '2019-2023',
          engine: '1.5L Turbo',
        },
      ],
      suppliers: [
        {
          id: 'supplier-1',
          name: 'AutoParts Direct',
          price: 94.99,
          currency: 'GBP',
          availability: 'in_stock',
          rating: 4.8,
          reviewCount: 1247,
          shippingTime: '2-3 days',
          url: 'https://example.com/part-1',
        },
        {
          id: 'supplier-2',
          name: 'Motor Factors',
          price: 102.50,
          currency: 'GBP',
          availability: 'in_stock',
          rating: 4.6,
          reviewCount: 892,
          shippingTime: '1-2 days',
          url: 'https://example.com/part-2',
        },
      ],
      images: [
        '/placeholder-brake-pad-1.jpg',
        '/placeholder-brake-pad-2.jpg',
      ],
      tags: ['ceramic', 'premium', 'low-dust', 'high-performance'],
      lastUpdated: new Date().toISOString(),
    },
  ],
}; 