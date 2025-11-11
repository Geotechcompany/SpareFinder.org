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

// Backend API Response Types (matching actual AI service)
interface BackendPrediction {
  part_name: string;
  part_number: string;
  confidence: number;
  category: string;
  manufacturer: string;
  description?: string;
  estimated_price?: {
    min: number;
    max: number;
    currency: string;
  };
  suppliers?: Array<{
    name: string;
    price: number;
    availability: string;
    rating: number;
    shipping_time: string;
    url: string;
  }>;
  external_parts?: Array<{
    part_number: string;
    manufacturer: string;
    description: string;
    price: number;
    availability: string;
    datasheet_url?: string;
    supplier: string;
  }>;
}

interface BackendResponse {
  success: boolean;
  predictions: BackendPrediction[];
  processing_time_ms: number;
  request_id: string;
  model_version: string;
  confidence_threshold: number;
  external_search_results?: BackendPrediction['external_parts'];
}

// Configuration
const AI_SERVICE_CONFIG = {
  baseUrl: import.meta.env.VITE_AI_SERVICE_URL || 'https://aiagent.sparefinder.org',
  apiKey: import.meta.env.VITE_AI_SERVICE_API_KEY || 'geotech-dev-key-2024',
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

// Transform backend response to frontend format
const transformBackendResponse = (backendResponse: BackendResponse): AnalysisResponse => {
  const predictions: PartPrediction[] = backendResponse.predictions.map((pred, index) => ({
    id: `prediction-${index}-${Date.now()}`,
    partName: pred.part_name,
    partNumber: pred.part_number,
    category: pred.category,
    manufacturer: pred.manufacturer,
    confidence: pred.confidence * 100, // Convert to percentage
    description: pred.description || 'No description available',
    specifications: {},
    estimatedPrice: pred.estimated_price || {
      min: 0,
      max: 0,
      currency: 'GBP'
    },
    compatibility: [], // Will be populated from external searches
    suppliers: pred.suppliers?.map((supplier, idx) => ({
      id: `supplier-${idx}`,
      name: supplier.name,
      price: supplier.price,
      currency: 'GBP',
      availability: supplier.availability as 'in_stock' | 'limited' | 'out_of_stock',
      rating: supplier.rating,
      reviewCount: 0,
      shippingTime: supplier.shipping_time,
      url: supplier.url,
    })) || [],
    images: [],
    tags: [pred.category.toLowerCase()],
    lastUpdated: new Date().toISOString(),
  }));

  return {
    success: backendResponse.success,
    analysisId: backendResponse.request_id,
    predictions,
    processingTime: backendResponse.processing_time_ms,
    metadata: {
      imageSize: 0, // Will be set from original file
      imageFormat: '', // Will be set from original file
      modelVersion: backendResponse.model_version,
      confidence: predictions.length > 0 ? predictions[0].confidence : 0,
    },
  };
};

// API Service Class
class AIPartService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = AI_SERVICE_CONFIG.baseUrl;
    this.apiKey = AI_SERVICE_CONFIG.apiKey;
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
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // Use default error message if JSON parsing fails
        }
        throw new Error(errorMessage);
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

      onProgress?.({
        stage: 'processing',
        progress: 50,
        message: 'Processing image...',
      });

      // Make API request with timeout using the correct endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_SERVICE_CONFIG.timeoutMs);

      try {
        const backendResponse = await this.makeRequest<BackendResponse>('/predict/image?include_external_search=true', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

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

        // Transform backend response to frontend format
        const response = transformBackendResponse(backendResponse);
        
        // Set metadata from original file
        response.metadata.imageSize = request.imageFile.size;
        response.metadata.imageFormat = request.imageFile.type;

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
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

  async checkHealth(): Promise<{ status: string; timestamp: number }> {
    return this.makeRequest('/health');
  }

  async checkReadiness(): Promise<{ status: string; models_loaded: boolean }> {
    return this.makeRequest('/health/ready');
  }

  async getAvailableProviders(): Promise<string[]> {
    const response = await this.makeRequest<{ providers: string[] }>('/providers');
    return response.providers;
  }

  async searchPartByNumber(partNumber: string): Promise<PartPrediction[]> {
    const response = await this.makeRequest<{ parts: any[] }>(`/parts/search/number/${partNumber}`);
    // Transform response if needed
    return [];
  }

  async getPartDetails(partNumber: string): Promise<PartPrediction> {
    const response = await this.makeRequest<any>(`/parts/details/${partNumber}`);
    // Transform response if needed
    throw new Error('Not implemented');
  }

  async submitFeedback(analysisId: string, feedback: {
    correct: boolean;
    actualPartName?: string;
    actualPartNumber?: string;
    comments?: string;
  }): Promise<{ success: boolean }> {
    // This would need to be implemented in the backend
    console.log('Feedback submitted:', { analysisId, feedback });
    return { success: true };
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
      let errorMessage = 'An unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific error cases
        if (error.message.includes('401')) {
          errorMessage = 'Authentication failed. Please check your API key.';
        } else if (error.message.includes('503')) {
          errorMessage = 'AI service is not ready. Please try again in a moment.';
        } else if (error.message.includes('413')) {
          errorMessage = 'File size is too large. Please use a smaller image.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid file format. Please use JPEG, PNG, or WebP.';
        }
      }

      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  };

  const checkServiceHealth = async () => {
    try {
      const health = await aiPartService.checkHealth();
      const readiness = await aiPartService.checkReadiness();
      return { health, readiness };
    } catch (error) {
      console.error('Service health check failed:', error);
      throw error;
    }
  };

  return {
    analyzeImage,
    validateFile: validateImageFile,
    compressImage,
    checkServiceHealth,
  };
};

// Mock data for development/testing (keeping existing mock for fallback)
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