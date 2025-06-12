import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Types
interface PredictionResult {
  class_name: string;
  confidence: number;
  part_number?: string;
  description?: string;
  category?: string;
  manufacturer?: string;
  compatibility?: string[];
  estimated_price?: string;
}

interface PredictionResponse {
  request_id: string;
  predictions: PredictionResult[];
  processing_time: number;
  model_version: string;
  confidence_threshold: number;
  timestamp: string;
}

interface PartAnalysisRequest {
  imageFile: Buffer | File;
  fileName: string;
  mimeType: string;
  userId?: string;
  confidenceThreshold?: number;
  maxPredictions?: number;
}

interface PartAnalysisResult {
  requestId: string;
  predictions: PredictionResult[];
  imageUrl: string;
  metadata: {
    processingTime: number;
    modelVersion: string;
    uploadTimestamp: string;
  };
}

export class AIIntegrationService {
  private aiServiceUrl: string;
  private apiKey: string;
  private supabase: any;
  private storageBucket: string;

  constructor(
    aiServiceUrl: string,
    apiKey: string,
    supabaseUrl: string,
    supabaseKey: string,
    storageBucket: string = 'part-images'
  ) {
    this.aiServiceUrl = aiServiceUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
    this.storageBucket = storageBucket;
    
    // Initialize Supabase client
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Analyze a part image and return predictions using TensorFlow AI
   */
  async analyzePart(request: PartAnalysisRequest): Promise<PartAnalysisResult> {
    const requestId = uuidv4();
    
    try {
      // Step 1: Upload image to Supabase Storage
      const imageUrl = await this.uploadImageToStorage(
        request.imageFile,
        request.fileName,
        requestId
      );

      // Step 2: Send image to AI service for TensorFlow prediction
      const predictions = await this.predictWithTensorFlow(
        request.imageFile,
        request.confidenceThreshold,
        request.maxPredictions
      );

      // Step 3: Enrich predictions with external data (Octopart, Mouser, Google)
      const enrichedPredictions = await this.enrichPredictions(predictions.predictions);

      // Step 4: Save analysis result to database
      await this.saveAnalysisResult({
        requestId,
        userId: request.userId,
        imageUrl,
        predictions: enrichedPredictions,
        processingTime: predictions.processing_time,
        modelVersion: predictions.model_version
      });

      return {
        requestId,
        predictions: enrichedPredictions,
        imageUrl,
        metadata: {
          processingTime: predictions.processing_time,
          modelVersion: predictions.model_version,
          uploadTimestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Part analysis failed:', error);
      throw new Error(`Part analysis failed: ${error.message}`);
    }
  }

  /**
   * Upload image to Supabase Storage
   */
  private async uploadImageToStorage(
    imageFile: Buffer | File,
    fileName: string,
    requestId: string
  ): Promise<string> {
    try {
      const fileExtension = fileName.split('.').pop() || 'jpg';
      const storageFileName = `${requestId}-${Date.now()}.${fileExtension}`;
      const filePath = `uploads/${storageFileName}`;

      let fileData: Buffer;
      if (imageFile instanceof File) {
        fileData = Buffer.from(await imageFile.arrayBuffer());
      } else {
        fileData = imageFile;
      }

      const { data, error } = await this.supabase.storage
        .from(this.storageBucket)
        .upload(filePath, fileData, {
          contentType: this.getMimeType(fileName),
          cacheControl: '3600'
        });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.storageBucket)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Image upload failed:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Send image to AI service for TensorFlow prediction
   */
  private async predictWithTensorFlow(
    imageFile: Buffer | File,
    confidenceThreshold: number = 0.5,
    maxPredictions: number = 5
  ): Promise<PredictionResponse> {
    try {
      const formData = new FormData();
      
      if (imageFile instanceof File) {
        formData.append('file', imageFile);
      } else {
        formData.append('file', imageFile, {
          filename: 'image.jpg',
          contentType: 'image/jpeg'
        });
      }

      const response: AxiosResponse<PredictionResponse> = await axios.post(
        `${this.aiServiceUrl}/predict/image`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${this.apiKey}`
          },
          params: {
            confidence_threshold: confidenceThreshold,
            include_external_search: true
          },
          timeout: 30000 // 30 second timeout
        }
      );

      return response.data;
    } catch (error) {
      console.error('TensorFlow prediction failed:', error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`TensorFlow prediction failed: ${message}`);
      }
      
      throw new Error(`TensorFlow prediction failed: ${error.message}`);
    }
  }

  /**
   * Enrich predictions with external data from Octopart, Mouser, and Google Search
   */
  private async enrichPredictions(predictions: PredictionResult[]): Promise<PredictionResult[]> {
    const enrichedPredictions = await Promise.all(
      predictions.map(async (prediction) => {
        try {
          // Step 1: Check if part exists in our database
          const existingPart = await this.findPartInDatabase(prediction.class_name);
          
          if (existingPart) {
            return {
              ...prediction,
              part_number: existingPart.part_number,
              description: existingPart.description,
              manufacturer: existingPart.manufacturer,
              compatibility: existingPart.compatibility,
              estimated_price: existingPart.estimated_price
            };
          }

          // Step 2: Query external APIs (Octopart & Mouser)
          const externalData = await this.queryExternalAPIs(prediction.class_name);
          
          if (externalData) {
            return {
              ...prediction,
              ...externalData
            };
          }

          // Step 3: Google Search fallback
          const searchData = await this.googleSearchFallback(prediction.class_name);
          
          return {
            ...prediction,
            ...searchData
          };
        } catch (error) {
          console.error(`Failed to enrich prediction for ${prediction.class_name}:`, error);
          return prediction; // Return original prediction if enrichment fails
        }
      })
    );

    return enrichedPredictions;
  }

  /**
   * Find part in Supabase database
   */
  private async findPartInDatabase(className: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('parts')
        .select('*')
        .ilike('name', `%${className.replace('_', ' ')}%`)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Database query error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database lookup failed:', error);
      return null;
    }
  }

  /**
   * Query external part APIs (Octopart and Mouser only)
   */
  private async queryExternalAPIs(className: string): Promise<Partial<PredictionResult> | null> {
    try {
      const searchTerm = className.replace('_', ' ');
      
      // Try AI service's external API endpoints first
      const aiServiceData = await this.queryAIServiceAPIs(searchTerm);
      if (aiServiceData) return aiServiceData;

      return null;
    } catch (error) {
      console.error('External API query failed:', error);
      return null;
    }
  }

  /**
   * Query external APIs through AI service (Octopart & Mouser)
   */
  private async queryAIServiceAPIs(searchTerm: string): Promise<Partial<PredictionResult> | null> {
    try {
      const response = await axios.get(
        `${this.aiServiceUrl}/parts/search/description`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          params: {
            description: searchTerm,
            providers: 'octopart,mouser',
            limit: 3
          },
          timeout: 15000
        }
      );

      const results = response.data.results;
      if (results && results.length > 0) {
        const topResult = results[0];
        return {
          part_number: topResult.part_number,
          description: topResult.description,
          manufacturer: topResult.manufacturer,
          estimated_price: this.formatPrice(topResult.pricing)
        };
      }

      return null;
    } catch (error) {
      console.error('AI service external API query failed:', error);
      return null;
    }
  }

  /**
   * Google Search fallback using AI service
   */
  private async googleSearchFallback(className: string): Promise<Partial<PredictionResult> | null> {
    try {
      const searchTerm = `automotive ${className.replace('_', ' ')} part`;
      
      // Use Google Custom Search through external service or direct API
      const apiKey = process.env.GOOGLE_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      
      if (!apiKey || !searchEngineId) {
        console.warn('Google Search API not configured');
        return null;
      }

      const response = await axios.get(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: apiKey,
            cx: searchEngineId,
            q: searchTerm,
            num: 3
          },
          timeout: 10000
        }
      );

      // Extract relevant information from search results
      const items = response.data.items || [];
      
      if (items.length > 0) {
        return {
          description: items[0].snippet,
          // Additional processing of search results...
        };
      }

      return null;
    } catch (error) {
      console.error('Google Search fallback failed:', error);
      return null;
    }
  }

  /**
   * Format pricing information
   */
  private formatPrice(pricing: any[]): string {
    if (!pricing || pricing.length === 0) return 'Price not available';
    
    const firstPrice = pricing[0];
    return `$${firstPrice.price} ${firstPrice.currency || 'USD'}`;
  }

  /**
   * Save analysis result to database
   */
  private async saveAnalysisResult(result: {
    requestId: string;
    userId?: string;
    imageUrl: string;
    predictions: PredictionResult[];
    processingTime: number;
    modelVersion: string;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('part_analyses')
        .insert({
          id: result.requestId,
          user_id: result.userId,
          image_url: result.imageUrl,
          predictions: result.predictions,
          processing_time: result.processingTime,
          model_version: result.modelVersion,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to save analysis result:', error);
        throw new Error(`Failed to save analysis result: ${error.message}`);
      }
    } catch (error) {
      console.error('Database save failed:', error);
      throw error;
    }
  }

  /**
   * Get MIME type from file name
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif'
    };

    return mimeTypes[extension || ''] || 'image/jpeg';
  }

  /**
   * Health check for AI service
   */
  async healthCheck(): Promise<{ status: string; ready: boolean; providers: string[] }> {
    try {
      const [healthResponse, providersResponse] = await Promise.all([
        axios.get(`${this.aiServiceUrl}/health/ready`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 5000
        }),
        axios.get(`${this.aiServiceUrl}/providers`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 5000
        })
      ]);

      return {
        status: 'healthy',
        ready: healthResponse.data.models_loaded || false,
        providers: providersResponse.data.providers?.map((p: any) => p.name) || []
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        ready: false,
        providers: []
      };
    }
  }
} 