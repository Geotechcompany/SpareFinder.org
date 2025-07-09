import axios from 'axios';
import { config } from './config';
import { useAuth } from '@/contexts/AuthContext';

export interface ApiResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string;
}

export interface GitHubAIPartAnalysisResponse {
  predictions: Array<{
    class_name: string;
    confidence: number;
    category?: string;
    estimated_price?: string;
  }>;
  technical_details?: Record<string, string | string[]>;
  purchasing_info?: {
    global_contacts?: string[];
    recommended_sources?: Array<{
      name: string;
      url: string;
      description?: string;
    }>;
  };
}

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
    details: {
      description: string;
      confidence?: number | null;
      status: string;
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

export interface AnalysisResponse {
  description?: string;
  predictions: Array<{
    class_name: string;
    confidence: number;
    description: string;
    category: string;
    manufacturer: string;
    part_number?: string | null;
    estimated_price?: string;
    compatibility?: string[];
  }>;
  additional_details?: {
    full_analysis?: string;
    technical_specifications?: string;
    market_information?: string;
  };
  image_metadata?: {
    content_type?: string;
    size_bytes?: number;
    base64_image?: string;
  };
  processing_time?: number;
  model_version?: string;
}

// Type guards
export function isDashboardStatsResponse(response: any): response is ApiResponse<DashboardStatsResponse> {
  return response && 
    response.success === true && 
    response.data && 
    typeof response.data.totalUploads === 'number' &&
    typeof response.data.successfulUploads === 'number' &&
    typeof response.data.avgConfidence === 'number' &&
    typeof response.data.avgProcessTime === 'number';
}

export function isRecentUploadResponse(response: any): response is ApiResponse<RecentUploadResponse> {
  return response && 
    response.success === true && 
    response.data && 
    Array.isArray(response.data.uploads) && 
    response.data.uploads.length > 0 &&
    response.data.uploads.every(upload => 
      typeof upload.id === 'string' &&
      typeof upload.image_name === 'string' &&
      typeof upload.created_at === 'string' &&
      typeof upload.confidence_score === 'number'
    );
}

export function isRecentActivityResponse(response: any): response is ApiResponse<RecentActivityResponse> {
  return response && 
    response.success === true && 
    response.data && 
    Array.isArray(response.data.activities) && 
    response.data.activities.length > 0 &&
    response.data.activities.every(activity => 
      typeof activity.id === 'string' &&
      typeof activity.resource_type === 'string' &&
      typeof activity.action === 'string' &&
      activity.details && 
      typeof activity.details.description === 'string' &&
      typeof activity.details.status === 'string' &&
      typeof activity.created_at === 'string'
    );
}

export function isPerformanceMetricsResponse(response: any): response is ApiResponse<PerformanceMetricsResponse> {
  return response && 
    response.success === true && 
    response.data && 
    typeof response.data.modelAccuracy === 'number' &&
    typeof response.data.accuracyChange === 'number' &&
    typeof response.data.totalSearches === 'number' &&
    typeof response.data.searchesGrowth === 'number' &&
    typeof response.data.avgResponseTime === 'number' &&
    typeof response.data.responseTimeChange === 'number';
}

// Utility function to safely extract data
export function extractData<T>(response: ApiResponse<T>): T | null {
  return response.success && response.data ? response.data : null;
}

// Create an axios instance with interceptors for token handling
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling authentication errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is due to an unauthorized request and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const refreshResponse = await apiClient.post('/auth/refresh-token', {
          token: localStorage.getItem('token')
        });

        if (refreshResponse.data.token) {
          // Update the token in localStorage
          localStorage.setItem('token', refreshResponse.data.token);

          // Retry the original request with the new token
          originalRequest.headers['Authorization'] = `Bearer ${refreshResponse.data.token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // If token refresh fails, force logout
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // For other errors, reject the promise
    return Promise.reject(error);
  }
);

// Dashboard API methods
export const dashboardApi = {
  getStats: async () => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  },

  getRecentUploads: async () => {
    try {
      const response = await apiClient.get('/dashboard/recent-uploads');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch recent uploads:', error);
      throw error;
    }
  },

  getRecentActivities: async () => {
    try {
      const response = await apiClient.get('/dashboard/recent-activities');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
      throw error;
    }
  },

  getPerformanceMetrics: async () => {
    try {
      const response = await apiClient.get('/dashboard/performance-metrics');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
      throw error;
    }
  },

  // Add these methods to the dashboardApi object
  exportHistory: async (format: 'csv' | 'json' = 'csv') => {
    try {
      const response = await apiClient.get(`/dashboard/export-history?format=${format}`);
      return response.data;
    } catch (error) {
      console.error('Failed to export history:', error);
      throw error;
    }
  },

  deleteUpload: async (uploadId: string) => {
    try {
      const response = await apiClient.delete(`/dashboard/uploads/${uploadId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete upload:', error);
      throw error;
    }
  },
}; 

export const api = {
  auth: {
    getCurrentUser: async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('🚫 No authentication token found');
          return { 
            success: false,
            data: null, 
            error: 'No authentication token found. Please log in.' 
          };
        }

        try {
          const response = await apiClient.get('/auth/current-user', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          console.log('✅ Current User Retrieved Successfully');
          return { 
            success: true,
            data: response.data.data, 
            error: null 
          };
        } catch (error: any) {
          console.error('❌ Failed to get current user:', error);
          
          // Detailed error handling
          if (error.response) {
            switch (error.response.status) {
              case 401:
                console.warn('🔒 Token is invalid or expired');
                localStorage.removeItem('token');
                return { 
                  success: false,
                  data: null, 
                  error: 'Session expired. Please log in again.' 
                };
              
              case 404:
                console.warn('🔍 User profile not found');
                localStorage.removeItem('token');
                return { 
                  success: false,
                  data: null, 
                  error: 'User profile not found. Please contact support.' 
                };
              
              case 500:
                console.error('🚨 Server error during authentication');
                return { 
                  success: false,
                  data: null, 
                  error: 'Server error. Please try again later.' 
                };
              
              default:
                console.warn('❓ Unexpected authentication error');
                return { 
                  success: false,
                  data: null, 
                  error: 'Authentication failed. Please try again.' 
                };
            }
          } else if (error.request) {
            // Request was made but no response received
            console.error('🌐 No response from server');
            return { 
              success: false,
              data: null, 
              error: 'No response from server. Check your network connection.' 
            };
          } else {
            // Something happened in setting up the request
            console.error('❌ Error setting up authentication request');
            return { 
              success: false,
              data: null, 
              error: 'An unexpected error occurred. Please try again.' 
            };
          }
        }
      } catch (unexpectedError) {
        console.error('🚨 Unexpected error in getCurrentUser:', unexpectedError);
        return { 
          success: false,
          data: null, 
          error: 'An unexpected error occurred. Please try again.' 
        };
      }
    },

    signIn: async (email: string, password: string) => {
      try {
        const response = await apiClient.post('/api/auth/login', { email, password });
        
        if (response.data.success && response.data.token) {
          localStorage.setItem('token', response.data.token);
          return response.data;
        } else {
          throw new Error(response.data.message || 'Login failed');
        }
      } catch (error: any) {
        console.error('Login failed:', error);
        throw {
          success: false,
          error: error.response?.data?.message || error.message || 'Login failed'
        };
      }
    },

    signOut: async () => {
      try {
        const token = localStorage.getItem('token');
        await apiClient.post('/auth/logout', {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        localStorage.removeItem('token');
        return { 
          data: null, 
          error: null 
        };
      } catch (error: any) {
        console.error('Logout failed:', error);
        localStorage.removeItem('token');
        return { 
          data: null, 
          error: error.response?.data?.message || error.message || 'Logout failed' 
        };
      }
    },

    signUp: async (email: string, password: string, metadata?: Record<string, any>) => {
      try {
        const response = await apiClient.post('/auth/signup', { 
          email, 
          password, 
          ...metadata 
        });
        
        // Store token if provided
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }

        return { 
          data: response.data, 
          error: null 
        };
      } catch (error: any) {
        console.error('Signup failed:', error);
        return { 
          data: null, 
          error: error.response?.data?.message || error.message || 'Signup failed' 
        };
      }
    },

    signInWithOAuth: async (provider: 'google' | 'github') => {
      try {
        const response = await apiClient.get(`/auth/${provider}`);
        
        // Store token if provided
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }

        return { 
          data: response.data, 
          error: null 
        };
      } catch (error: any) {
        console.error('OAuth login failed:', error);
        return { 
          data: null, 
          error: error.response?.data?.message || error.message || 'OAuth login failed' 
        };
      }
    }
  },
  statistics: {
    refresh: async () => {
      try {
        const response = await apiClient.post('/statistics/refresh');
        return response.data;
      } catch (error) {
        console.error('Failed to refresh statistics:', error);
        throw error;
      }
    }
  },
  profile: {
    getAchievements: async () => {
      try {
        const response = await apiClient.get('/profile/achievements');
        return response.data;
      } catch (error) {
        console.error('Failed to get achievements:', error);
        throw error;
      }
    },
    getRecentActivities: async (limit = 4) => {
      try {
        const response = await apiClient.get(`/profile/activities?limit=${limit}`);
        return response.data;
      } catch (error) {
        console.error('Failed to get recent activities:', error);
        throw error;
      }
    },
    getProfile: async () => {
      try {
        const response = await apiClient.get('/profile');
        return {
          success: true,
          data: {
            profile: response.data
          }
        };
      } catch (error) {
        console.error('Failed to get profile:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  },
  upload: {
    image: async (file: File, keywords?: string[], options?: any) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add keywords as a comma-separated string
        if (keywords && keywords.length > 0) {
          formData.append('keywords', keywords.join(', '));
        }

        // Add additional options
        if (options) {
          formData.append('confidence_threshold', options.confidenceThreshold || '0.3');
          formData.append('max_predictions', options.maxPredictions || '3');
        }

        // Use SpareFinderAI-Service URL from config
        const response = await axios.post(`${config.ai.serviceUrl}/analyze-part/`, formData, {
          headers: { 
            'Content-Type': 'multipart/form-data'
          },
          timeout: config.ai.timeout
        });

        // Transform response to match existing interface
        return {
          success: response.data.success,
          part_info: response.data.predictions.map((pred: any) => ({
            class_name: pred.class_name,
            confidence: pred.confidence,
            description: pred.description,
            category: pred.category,
            manufacturer: pred.manufacturer,
            estimated_price: pred.estimated_price,
            part_number: pred.part_number,
            compatibility: pred.compatibility
          })),
          full_analysis: response.data.analysis,
          processing_time: response.data.processing_time,
          model_version: response.data.model_version,
          error: response.data.error || null  // Add this line
        };
      } catch (error) {
        console.error('Image upload to AI service failed:', error);
        throw error;
      }
    },
    storeAnalysis: async (analysisResults: AnalysisResponse) => {
      try {
        // Prepare data for backend
        const storeData = {
          part_name: analysisResults.predictions[0].class_name,
          part_number: analysisResults.predictions[0].part_number,
          manufacturer: analysisResults.predictions[0].manufacturer,
          category: analysisResults.predictions[0].category,
          confidence_score: analysisResults.predictions[0].confidence * 100,
          image_url: analysisResults.image_metadata?.content_type && analysisResults.image_metadata?.base64_image
            ? `data:${analysisResults.image_metadata.content_type};base64,${analysisResults.image_metadata.base64_image}`
            : undefined,
          description: analysisResults.predictions[0].description || 
                       analysisResults.additional_details?.full_analysis,
          additional_details: {
            full_analysis: analysisResults.additional_details?.full_analysis,
            technical_specifications: analysisResults.additional_details?.technical_specifications,
            market_information: analysisResults.additional_details?.market_information,
            processing_time: analysisResults.processing_time,
            model_version: analysisResults.model_version
          }
        };

        const response = await axios.post('/api/upload/store-analysis', storeData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        return response.data;
      } catch (error) {
        console.error('Failed to store analysis:', error);
        throw error;
      }
    }
  },
  billing: {
    getBillingInfo: async (options: { signal?: AbortSignal } = {}) => {
      try {
        const response = await apiClient.get('/billing/info', {
          signal: options.signal
        });
        return response.data;
      } catch (error) {
        console.error('Failed to fetch billing info:', error);
        throw error;
      }
    },
    getInvoices: async (options: { signal?: AbortSignal } = {}) => {
      try {
        const response = await apiClient.get('/billing/invoices', {
          signal: options.signal
        });
        return response.data;
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
        throw error;
      }
    },
    updateSubscription: async (planId: 'free' | 'pro' | 'enterprise') => {
      try {
        const response = await apiClient.post('/billing/update-subscription', { planId });
        return response.data;
      } catch (error) {
        console.error('Failed to update subscription:', error);
        throw error;
      }
    },
    cancelSubscription: async () => {
      try {
        const response = await apiClient.post('/billing/cancel-subscription');
        return response.data;
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
        throw error;
      }
    }
  },
  dashboard: {
    getStats: async () => {
      try {
        const response = await apiClient.get('/dashboard/stats');
        return {
          success: true,
          data: response.data
        };
      } catch (error) {
        console.error('Failed to get dashboard stats:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  },
  // Existing dashboardApi methods can be added here if needed
  ...dashboardApi,
  admin: {
    getUsers: async (page: number = 1, limit: number = 20) => {
      try {
        const response = await apiClient.get('/admin/users', { params: { page, limit } });
        return {
          success: true,
          data: {
            users: response.data.users,
            pagination: response.data.pagination
          }
        };
      } catch (error) {
        console.error('Failed to get users:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },
    updateUserRole: async (userId: string, newRole: 'user' | 'admin' | 'super_admin') => {
      try {
        const response = await apiClient.patch(`/admin/users/${userId}/role`, { role: newRole });
        return {
          success: true,
          data: response.data
        };
      } catch (error) {
        console.error('Failed to update user role:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },
    deleteUser: async (userId: string) => {
      try {
        const response = await apiClient.delete(`/admin/users/${userId}`);
        return {
          success: true,
          data: response.data
        };
      } catch (error) {
        console.error('Failed to delete user:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  }
};

export type ApiType = typeof api; 