import axios, { AxiosInstance } from 'axios';
import { toast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'https://part-finder-ai-vision-1.onrender.com/';

// Type definitions
export interface ApiResponse<T = any> {
  success?: boolean;
  data: T & { 
    totalUploads?: number; 
    successfulUploads?: number; 
    avgConfidence?: number; 
    avgProcessTime?: number;
    uploads?: any[];
    activities?: any[];
    modelAccuracy?: number;
    accuracyChange?: number;
    totalSearches?: number;
    searchesGrowth?: number;
    avgResponseTime?: number;
    responseTimeChange?: number;
    token?: string;
    user?: User;
    [key: string]: any;
  };
  error?: string;
  message?: string;
}

export interface UploadResponse {
  success: boolean;
  part_info?: {
    name: string;
    part_number?: string;
    category: string;
    manufacturer: string;
    price_range: string;
    confidence_score: number;
    description?: string;
    specifications?: Record<string, any>;
    compatibility?: string[];
    similar_images?: Array<{
      url: string;
      metadata: Record<string, any>;
      similarity_score: number;
      source: string;
      title: string;
      price: string;
    }>;
  };
  error?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  company?: string;
  role: string;
  avatar_url?: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    company?: string;
    role: string;
    created_at: string;
  };
  success: boolean;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  company?: string;
}

// OpenAI Image Analysis Types
export interface AIServicePrediction {
  class_name: string;
  confidence: number;
  description: string;
  category?: string | null;
  manufacturer?: string | null;
  estimated_price?: string | null;
  part_number?: string | null;
  compatibility?: string[];
}

export interface AIServiceSimilarImage {
  url: string;
  title: string;
  price: string;
  metadata?: {
    isEbay?: boolean;
    source?: string;
    link?: string;
    similarity_score?: number;
  };
}

export interface AIServiceResponse {
  request_id: string;
  predictions: AIServicePrediction[];
  processing_time: number;
  similar_images?: AIServiceSimilarImage[] | null;
  model_version?: string;
  image_metadata?: {
    size_bytes?: number;
    content_type?: string;
  };
}

// Define response interfaces
export interface DashboardStatsResponse {
  totalUploads: number;
  successfulUploads: number;
  avgConfidence: number;
  avgProcessTime: number;
}

export interface RecentUploadResponse {
  uploads: Array<{
    id: string;
    image_name: string;
    created_at: string;
    confidence_score: number;
  }>;
}

export interface RecentActivityResponse {
  activities: Array<{
    id: string;
    resource_type: string;
    action: string;
    details?: {
      description?: string;
      confidence?: number;
      status?: string;
    };
    created_at: string;
  }>;
}

export interface PerformanceMetricsResponse {
  modelAccuracy: number;
  accuracyChange: number;
  totalSearches: number;
  searchesGrowth: number;
  avgResponseTime: number;
  responseTimeChange: number;
}

// Extend AxiosInstance type to include custom methods
interface ExtendedAxiosInstance extends AxiosInstance {
  adminLogin: (credentials: { email: string; password: string }) => Promise<ApiResponse<AuthResponse>>;
  setToken: (token: string) => void;
}

// Create an axios instance with base configuration
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'multipart/form-data',
  }
});

// Add a response interceptor to handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Default error handling
    const errorMessage = error.response?.data?.message 
      || error.message 
      || 'An unexpected error occurred';

    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive'
    });

    return Promise.reject(error);
  }
);

// API endpoints for the new approach
export const endpoints = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
  },
  upload: {
    image: '/api/upload',
    analyze: '/api/analyze',
  },
  user: {
    profile: '/api/user/profile',
    settings: '/api/user/settings',
  },
  parts: {
    search: '/api/parts/search',
    details: (id: string) => `/api/parts/${id}`,
  },
} as const;

// Create axios instance for new approach
const client: ExtendedAxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
}) as ExtendedAxiosInstance;

// Extend the client with admin login method
client.adminLogin = async ({ email, password }: { email: string; password: string }): Promise<ApiResponse<AuthResponse>> => {
  try {
    const response = await client.post<ApiResponse<AuthResponse>>(endpoints.auth.login, { 
      email, 
      password,
      isAdminLogin: true 
    });

    if (response.data) {
      return {
        success: true,
        data: response.data as any
      };
    }

    return {
      success: false,
      data: {} as any,
      error: 'Admin login failed'
    };
  } catch (error: any) {
    console.error('Admin login error:', error);
    return {
      success: false,
      data: {} as any,
      error: error.response?.data?.message || 'Admin login failed'
    };
  }
};

client.setToken = (token: string) => {
  client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// AI Service client for image uploads
const aiClient: AxiosInstance = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 120000, // Increased to 2 minutes for AI processing
  headers: {
    'Content-Type': 'application/json',
  },
});

aiClient.interceptors.request.use((config) => {
  // Use the AI service API key
  const apiKey = 'geotech-dev-key-2024';
  config.headers.Authorization = `Bearer ${apiKey}`;
  return config;
});

// API functions for the new approach
export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const response = await client.post<any>(endpoints.auth.login, { email, password });
      console.log('API Login Response:', response.data);
      
      // Backend returns { token, user, message } directly
      if (response.data && response.data.token) {
        // Save token to localStorage for the class-based client
        localStorage.setItem('auth_token', response.data.token);
        
        return {
          success: true,
          data: response.data
        };
      }
      
      return {
        success: false,
        data: null,
        error: 'Invalid login response'
      };
    },
    register: async (userData: { email: string; password: string; full_name: string; company?: string }): Promise<ApiResponse<AuthResponse>> => {
      try {
        const response = await client.post<any>(endpoints.auth.register, userData);
        console.log('🔍 API Register Response:', response.data);
        
        // If we have a successful response with token
        if (response.data && response.data.success && response.data.token) {
          // Save token to localStorage
          localStorage.setItem('auth_token', response.data.token);
          
          return {
            success: true,
            data: response.data
          };
        }
        
        // If we have an error message in the response
        if (response.data && !response.data.success) {
          throw new Error(response.data.message || response.data.error || 'Registration failed');
        }
        
        // Fallback error
        throw new Error('Invalid registration response');
      } catch (error: any) {
        console.error('❌ Registration error:', error);
        // Handle both axios error responses and regular errors
        const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Registration failed';
        return {
          success: false,
          data: null,
          error: errorMessage
        };
      }
    },
    logout: async () => {
      const response = await client.post<ApiResponse>(endpoints.auth.logout);
      return response.data;
    },
  },
  upload: {
    image: async (
      file: File, 
      options: {
        keywords?: string;
        confidenceThreshold?: number;
        maxPredictions?: number;
        includeWebScraping?: boolean;
      } = {}
    ): Promise<UploadResponse> => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add optional parameters
        const {
          keywords,
          confidenceThreshold = 0.5,
          maxPredictions = 5,
          includeWebScraping = true
        } = options;
        
        if (keywords) {
          formData.append('keywords', keywords);
        }
        
        // Add query parameters for AI service
        const params = new URLSearchParams({
          confidence_threshold: confidenceThreshold.toString(),
          max_predictions: maxPredictions.toString(),
          include_web_scraping: includeWebScraping.toString()
        });
        
        console.log('Uploading to AI service:', `${AI_SERVICE_URL}/predict?${params}`);
        
        const response = await aiClient.post<UploadResponse>(`/predict?${params}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000, // 2 minutes timeout for this specific request
        });
        
        console.log('AI service response:', response.data);
        return response.data;
      } catch (error) {
        console.error('AI service error:', error);
        
        if (error.code === 'ECONNABORTED') {
          throw new Error('AI analysis is taking longer than expected. Please try with a smaller image or try again later.');
        } else if (error.response?.status === 500) {
          throw new Error('AI service is currently unavailable. Please try again later.');
        } else if (error.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to AI service. Please make sure the AI service is running.');
        }
        
        throw error;
      }
    },
  },
  user: {
    getProfile: async () => {
      const response = await client.get<ApiResponse>(endpoints.user.profile);
      return response.data;
    },
    updateProfile: async (profileData: any) => {
      const response = await client.put<ApiResponse>(endpoints.user.profile, profileData);
      return response.data;
    },
  },
  statistics: {
    refresh: async (): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await client.post<any>('/api/statistics/refresh');
        return response.data;
      } catch (error) {
        console.error('Failed to refresh statistics:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to refresh statistics'
        };
      }
    },
    getAnalytics: (timeRange: string = '30d') => 
      client.get('/statistics/analytics', { params: { range: timeRange } })
  },
  dashboard: {
    getStats: () => client.get<ApiResponse<DashboardStatsResponse>>('/dashboard/stats'),
    getRecentUploads: (limit: number = 5) => 
      client.get<ApiResponse<RecentUploadResponse>>('/dashboard/recent-uploads', { params: { limit } }),
    getRecentActivities: (limit: number = 5) => 
      client.get<ApiResponse<RecentActivityResponse>>('/dashboard/recent-activities', { params: { limit } }),
    getPerformanceMetrics: () => 
      client.get<ApiResponse<PerformanceMetricsResponse>>('/dashboard/performance-metrics')
  }
};

export const uploadPartImage = async (
  file: File, 
  keywords?: string[], 
  options: {
    confidenceThreshold?: number;
    maxPredictions?: number;
    includeWebScraping?: boolean;
  } = {}
) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Add keywords
  if (keywords && keywords.length > 0) {
    formData.append('keywords', keywords.join(', '));
  }
  
  // Add optional parameters
  formData.append('confidence_threshold', (options.confidenceThreshold || 0.3).toString());
  formData.append('max_predictions', (options.maxPredictions || 3).toString());
  formData.append('include_web_scraping', (options.includeWebScraping ?? true).toString());

  try {
    const response = await apiClient.post<{
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
      similar_images?: Array<{
        url: string;
        title: string;
        price: string;
        metadata?: {
          isEbay?: boolean;
          source?: string;
        };
      }>;
      processing_time: number;
      model_version: string;
      image_metadata: {
        content_type: string;
        size_bytes: number;
      };
    }>('/openai/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });

    return response.data;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

export default apiClient; 