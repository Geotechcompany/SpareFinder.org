import axios, { AxiosInstance } from 'axios';
import { toast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'https://part-finder-ai-vision-1.onrender.com/';

// Type definitions
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T & {
    statistics?: T;
    uploads?: Array<{
      id: string;
      image_name: string;
      created_at: string;
      confidence_score: number;
    }>;
    activities?: Array<{
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
    totalUploads?: number;
    successfulUploads?: number;
    avgConfidence?: number;
    avgProcessTime?: number;
    modelAccuracy?: number;
    accuracyChange?: number;
    totalSearches?: number;
    searchesGrowth?: number;
    avgResponseTime?: number;
    responseTimeChange?: number;
  };
  error?: string;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  success: boolean;
  message?: string;
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
  success: boolean;
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

// Simplified type definitions
export interface DashboardStatsResponse {
  totalUploads?: number;
  successfulUploads?: number;
  avgConfidence?: number;
  avgProcessTime?: number;
}

export interface RecentUploadResponse {
  uploads?: Array<{
    id: string;
    image_name: string;
    created_at: string;
    confidence_score: number;
  }>;
}

export interface RecentActivityResponse {
  activities?: Array<{
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
  modelAccuracy?: number;
  accuracyChange?: number;
  totalSearches?: number;
  searchesGrowth?: number;
  avgResponseTime?: number;
  responseTimeChange?: number;
}

// Extend AxiosInstance type to include admin methods
interface ExtendedAxiosInstance extends AxiosInstance {
  adminLogin: (credentials: { email: string; password: string }) => Promise<ApiResponse<AuthResponse>>;
  setToken: (token: string) => void;
  getAdminStats?: () => Promise<{ success: boolean; data?: any; error?: string }>;
  getCurrentUser?: () => Promise<{ success: boolean; data?: any; error?: string }>;
  getUsers?: (page: number, limit: number) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateUserRole?: (userId: string, role: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteAdminUser?: (userId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  adminLogout?: () => Promise<{ success: boolean; error?: string }>;
  
  // New methods
  getAchievements?: () => Promise<{ success: boolean; data?: any; error?: string }>;
  getRecentActivities?: (limit?: number) => Promise<{ success: boolean; data?: any; error?: string }>;
  getDashboardStats?: () => Promise<{ success: boolean; data?: any; error?: string }>;
  getBillingInfo?: () => Promise<{ success: boolean; data?: any; error?: string }>;
  getInvoices?: (page?: number, limit?: number) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateSubscription?: (planId: 'free' | 'pro' | 'enterprise') => Promise<{ success: boolean; data?: any; error?: string }>;
  cancelSubscription?: () => Promise<{ success: boolean; data?: any; error?: string }>;
  
  // History methods
  history?: {
    getUploads: (
      page: number, 
      limit: number, 
      filters?: { 
        search?: string; 
        status?: string 
      }
    ) => Promise<{ success: boolean; data?: any; error?: string }>;
    exportHistory: (format: 'csv' | 'json') => Promise<{ success: boolean; data?: any; error?: string }>;
    deleteUpload: (uploadId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  }
}

// Create an axios instance with base configuration
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'multipart/form-data',
  }
}) as ExtendedAxiosInstance;

// Add request interceptor to include token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  
  console.log('🔐 API Request Interceptor:', {
    url: config.url,
    method: config.method,
    hasToken: !!token
  });

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('🚨 No authentication token found');
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor to handle authentication errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('🚨 API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // Handle specific authentication errors
    if (error.response?.status === 401 || error.response?.data?.message === 'No token provided') {
      // Clear stored token
      localStorage.removeItem('auth_token');
      
      // Redirect to login page
      window.location.href = '/login';

      // Show toast notification
      toast({
        title: 'Authentication Error',
        description: 'Your session has expired. Please log in again.',
        variant: 'destructive'
      });
    }

    return Promise.reject(error);
  }
);

// Modify getAdminStats to handle authentication more robustly
apiClient.getAdminStats = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.error('🚨 No authentication token found');
      return {
        success: false,
        error: 'No authentication token'
      };
    }

    const response = await apiClient.get('/api/admin/stats');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    
    // Check if it's an authentication error
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch admin stats'
    };
  }
};

apiClient.getDashboardStats = async () => {
  try {
    const response = await apiClient.get('/api/dashboard/stats');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats'
    };
  }
};

apiClient.getCurrentUser = async () => {
  try {
    const response = await apiClient.get('/api/user/profile');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user profile'
    };
  }
};

// Extend apiClient with admin methods after the existing extensions
apiClient.getUsers = async (page = 1, limit = 20) => {
  try {
    const response = await apiClient.get('/api/admin/users', { 
      params: { page, limit } 
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users'
    };
  }
};

apiClient.updateUserRole = async (userId, role) => {
  try {
    const response = await apiClient.patch(`/api/admin/users/${userId}/role`, { role });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to update user role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user role'
    };
  }
};

apiClient.deleteAdminUser = async (userId) => {
  try {
    const response = await apiClient.delete(`/api/admin/users/${userId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to delete user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user'
    };
  }
};

// Add adminLogout method to apiClient
apiClient.adminLogout = async () => {
  try {
    console.log('🔐 Attempting Admin Logout');
    
    // Call backend logout endpoint
    const response = await apiClient.post('/api/auth/logout');
    
    // Clear local storage
    localStorage.removeItem('auth_token');
    
    // Remove authorization header
    delete apiClient.defaults.headers.common['Authorization'];
    
    console.log('🔐 Logout successful');
    
    return {
      success: true
    };
  } catch (error) {
    console.error('🚨 Logout error:', error);
    
    // Even if backend logout fails, clear local token
    localStorage.removeItem('auth_token');
    delete apiClient.defaults.headers.common['Authorization'];
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed'
    };
  } finally {
    // Always redirect to login page
    window.location.href = '/login';
  }
};

// Extend apiClient with additional methods
apiClient.getAchievements = async () => {
  try {
    const response = await apiClient.get('/api/dashboard/achievements');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to fetch achievements:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch achievements'
    };
  }
};

apiClient.getRecentActivities = async (limit = 5) => {
  try {
    const response = await apiClient.get('/api/dashboard/recent-activities', {
      params: { limit }
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to fetch recent activities:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recent activities'
    };
  }
};

// Update billing methods to use the correct route
apiClient.getBillingInfo = async () => {
  try {
    const response = await apiClient.get('/api/billing');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to fetch billing info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch billing information'
    };
  }
};

apiClient.getInvoices = async (page = 1, limit = 10) => {
  try {
    const response = await apiClient.get('/api/billing/invoices', { 
      params: { page, limit } 
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoices'
    };
  }
};

// Add subscription methods to apiClient
apiClient.updateSubscription = async (planId: 'free' | 'pro' | 'enterprise') => {
  try {
    const response = await apiClient.post('/api/billing/update-subscription', { planId });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update subscription'
    };
  }
};

apiClient.cancelSubscription = async () => {
  try {
    const response = await apiClient.post('/api/billing/cancel-subscription');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel subscription'
    };
  }
};

// Add history methods to apiClient
apiClient.history = {
  getUploads: async (page = 1, limit = 20, filters = {}) => {
    try {
      const response = await apiClient.get('/api/history/uploads', { 
        params: { 
          page, 
          limit, 
          ...filters 
        } 
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch upload history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch upload history'
      };
    }
  },
  exportHistory: async (format = 'csv') => {
    try {
      const response = await apiClient.get('/api/history/export', { 
        params: { format },
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `upload_history.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to export history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export history'
      };
    }
  },
  deleteUpload: async (uploadId) => {
    try {
      const response = await apiClient.delete(`/api/history/uploads/${uploadId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to delete upload:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete upload'
      };
    }
  }
};

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
    console.log('🔐 API Client Admin Login Attempt:', { email });
    const response = await client.post<ApiResponse<AuthResponse>>(endpoints.auth.login, { 
      email, 
      password,
      isAdminLogin: true 
    });

    console.log('🔐 API Client Login Response:', {
      success: response.data?.success,
      hasData: !!response.data
    });

    if (response.data) {
      const authData = {
        token: (response.data as any).token || '',
        user: (response.data as any).user || { 
          id: '', 
          email: '', 
          full_name: '', 
          role: '' 
        },
        success: response.data.success ?? true
      } as AuthResponse;

      console.log('🔐 API Client Login Data:', {
        userId: authData.user.id,
        email: authData.user.email,
        role: authData.user.role
      });

      return {
        success: true,
        data: authData,
        message: 'Login successful'
      };
    }

    console.log('🔐 API Client Login Failed: No Data');
    const defaultAuthResponse: AuthResponse = { 
      token: '', 
      user: { 
        id: '', 
        email: '', 
        full_name: '', 
        company: undefined,
        role: '', 
        avatar_url: undefined,
        created_at: '' 
      },
      success: false
    };

    return {
      success: false,
      data: defaultAuthResponse,
      error: 'Login failed: No data received'
    };
  } catch (error) {
    console.error('🔐 API Client Login Error:', error);
    const defaultAuthResponse: AuthResponse = { 
      token: '', 
      user: { 
        id: '', 
        email: '', 
        full_name: '', 
        company: undefined,
        role: '', 
        avatar_url: undefined,
        created_at: '' 
      },
      success: false
    };

    return {
      success: false,
      data: defaultAuthResponse,
      error: error instanceof Error ? error.message : 'Login failed'
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
    const token = localStorage.getItem('auth_token');
    
    // Only log out if there's no token or the error is a 401 unauthorized
    if (!token || error.response?.status === 401) {
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
    'Content-Type': 'multipart/form-data',
    'Authorization': `Bearer ${import.meta.env.VITE_AI_SERVICE_API_KEY || 'geotech-dev-key-2024'}`
  },
});

aiClient.interceptors.request.use((config) => {
  // Ensure Authorization header is set
  const apiKey = import.meta.env.VITE_AI_SERVICE_API_KEY || 'geotech-dev-key-2024';
  config.headers.Authorization = `Bearer ${apiKey}`;
  
  // Ensure Content-Type is multipart/form-data for file uploads
  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data';
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// API functions for the new approach
export const api = {
  auth: {
    login: async (email: string, password: string) => {
      try {
        console.log('🔐 Attempting Login:', { email });
        
        const response = await client.post<any>(endpoints.auth.login, { email, password });
        console.log('🔐 Login Response:', response.data);
        
        // Backend returns { token, user, message } directly
        if (response.data && response.data.token) {
          // Save token to localStorage
          localStorage.setItem('auth_token', response.data.token);
          
          // Set token in client headers for future requests
          client.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
          
          return {
            success: true,
            data: response.data
          };
        }
        
        console.error('🚨 Invalid login response:', response.data);
        return {
          success: false,
          data: null,
          error: 'Invalid login response'
        };
      } catch (error: any) {
        console.error('🚨 Login error:', error);
        
        // Handle specific error scenarios
        const errorMessage = error.response?.data?.message 
          || error.response?.data?.error 
          || error.message 
          || 'Login failed';
        
        return {
          success: false,
          data: null,
          error: errorMessage
        };
      }
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
      try {
        console.log('🔐 Attempting Logout');
        
        // Call backend logout endpoint
        const response = await client.post<ApiResponse>(endpoints.auth.logout);
        
        // Clear local storage
        localStorage.removeItem('auth_token');
        
        // Remove authorization header
        delete client.defaults.headers.common['Authorization'];
        
        console.log('🔐 Logout successful');
        
        // Redirect to login page
        window.location.href = '/login';
        
        return response.data;
      } catch (error) {
        console.error('🚨 Logout error:', error);
        
        // Even if backend logout fails, clear local token
        localStorage.removeItem('auth_token');
        delete client.defaults.headers.common['Authorization'];
        
        // Redirect to login page
        window.location.href = '/login';
        
        throw error;
      }
    },
  },
  upload: {
    image: async (
      file: File, 
      keywords?: string[], 
      options: {
        confidenceThreshold?: number;
        maxPredictions?: number;
        includeWebScraping?: boolean;
      } = {}
    ): Promise<AIServiceResponse> => {
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
        const response = await aiClient.post<AIServiceResponse>('/openai/upload/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        });

        return response.data;
      } catch (error) {
        console.error('Image upload error:', error);
        throw error;
      }
    },
  },
  user: {
    getProfile: async () => {
      try {
        console.log('🔍 Fetching User Profile - Endpoint:', endpoints.user.profile);
        const response = await client.get<ApiResponse<{ user?: User; profile?: User }>>(endpoints.user.profile);
        
        console.log('🔍 User Profile Raw Response:', {
          success: response.data?.success,
          data: response.data,
          status: response.status
        });
        
        // More flexible response handling
        if (response.data) {
          const userData = (response.data as any).user || (response.data as any).profile;
          return {
            success: response.data.success ?? true,
            data: userData || null
          };
        }
        
        console.error('🔍 Invalid profile response structure');
        return {
          success: false,
          data: null,
          error: 'Invalid profile response'
        };
      } catch (error) {
        console.error('🔍 User Profile Fetch Error:', error);
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Failed to fetch profile'
        };
      }
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
    getStats: () => client.get<ApiResponse<DashboardStatsResponse>>('/api/dashboard/stats'),
    getRecentUploads: (limit: number = 5) => 
      client.get<ApiResponse<RecentUploadResponse>>('/api/dashboard/recent-uploads', { params: { limit } }),
    getRecentActivities: (limit: number = 5) => 
      client.get<ApiResponse<RecentActivityResponse>>('/api/dashboard/recent-activities', { params: { limit } }),
    getPerformanceMetrics: () => 
      client.get<ApiResponse<PerformanceMetricsResponse>>('/api/dashboard/performance-metrics')
  },
  billing: {
    getInfo: () => client.get<ApiResponse>('/api/billing'),
    getInvoices: (page = 1, limit = 10) => 
      client.get<ApiResponse>('/api/billing/invoices', { params: { page, limit } }),
    updateSubscription: (planId: 'free' | 'pro' | 'enterprise') => 
      client.post<ApiResponse>('/api/billing/subscription', { tier: planId }),
    cancelSubscription: () => 
      client.post<ApiResponse>('/api/billing/cancel-subscription')
  },
  history: {
    getUploads: (page = 1, limit = 20, filters = {}) => 
      client.get<ApiResponse>('/api/history/uploads', { 
        params: { 
          page, 
          limit, 
          ...filters 
        } 
      }),
    exportHistory: (format: 'csv' | 'json' = 'csv') => 
      client.get<ApiResponse>('/api/history/export', { 
        params: { format },
        responseType: 'blob'
      }),
    deleteUpload: (uploadId: string) => 
      client.delete<ApiResponse>(`/api/history/uploads/${uploadId}`)
  },
  achievements: {
    getAchievements: async () => {
      try {
        console.log('🔍 Fetching Achievements');
        const response = await client.get<ApiResponse>('/api/dashboard/achievements');
        
        console.log('🔍 Achievements Response:', {
          success: response.data?.success,
          data: response.data
        });
        
        return {
          success: true,
          data: response.data
        };
      } catch (error) {
        console.error('❌ Failed to fetch achievements:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch achievements'
        };
      }
    }
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
    const response = await aiClient.post<{
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

export { client, apiClient as defaultApiClient, aiClient }; 