import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

console.log('🔧 API Client Config:', {
  baseURL: API_BASE_URL,
  environment: import.meta.env.MODE
});

// Token storage utilities
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

const tokenStorage = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  removeToken: () => sessionStorage.removeItem(TOKEN_KEY),
  
  getRefreshToken: () => sessionStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => sessionStorage.setItem(REFRESH_TOKEN_KEY, token),
  removeRefreshToken: () => sessionStorage.removeItem(REFRESH_TOKEN_KEY),
  
  clearAll: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token refresh state
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor to add token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getToken();
    const hasToken = !!token;
    
    console.log('🔍 Request interceptor:', {
      url: config.url,
      hasToken,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'NO TOKEN',
      timestamp: new Date().toISOString()
    });
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Authorization header added');
    } else {
      console.log('❌ No token found - request will be unauthorized');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling authentication errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is due to an unauthorized request and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If we're already refreshing, wait for the existing refresh to complete
      if (isRefreshing && refreshPromise) {
        return refreshPromise
          .then(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      // If we're refreshing but no promise exists, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Check if we have tokens
      const currentToken = tokenStorage.getToken();
      const refreshToken = tokenStorage.getRefreshToken();
      
      if (!currentToken || !refreshToken) {
        // No tokens, redirect to login
        console.warn('🔒 No tokens available - redirecting to login');
        isRefreshing = false;
        refreshPromise = null;
        processQueue(error, null);
        tokenStorage.clearAll();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Create refresh promise
      refreshPromise = (async () => {
        try {
          console.log('🔄 Attempting to refresh token...');
          
          // Try to refresh the token with timeout
          const refreshResponse = await Promise.race([
            axios.post(`${API_BASE_URL}/api/auth/refresh`, {
              refresh_token: refreshToken
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Token refresh timeout')), 10000)
            )
          ]);

        if (refreshResponse.data.token) {
            console.log('✅ Token refreshed successfully');
            
            // Update stored tokens
            tokenStorage.setToken(refreshResponse.data.token);
            if (refreshResponse.data.refresh_token) {
              tokenStorage.setRefreshToken(refreshResponse.data.refresh_token);
            }

            // Process the queue with the new token
            processQueue(null, refreshResponse.data.token);
            
            return refreshResponse.data.token;
          } else {
            throw new Error('No token in refresh response');
          }
        } catch (refreshError) {
          console.error('🔒 Token refresh failed:', refreshError);
          
          // Process queue with error
          processQueue(refreshError, null);
          
          // Clear tokens and redirect to login
          tokenStorage.clearAll();
          window.location.href = '/login';
          throw refreshError;
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      try {
        const newToken = await refreshPromise;
        // Update the authorization header for the original request
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API response interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  user?: any; // Auth endpoints return user directly
  token?: string; // Auth endpoints return token
  refresh_token?: string; // Auth endpoints return refresh token
  message?: string;
  error?: string;
}

// Authentication API
export const authApi = {
  register: async (userData: {
    email: string;
    password: string;
    full_name: string;
    company?: string;
  }): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/register', userData);
    
    // Store tokens if registration is successful
    if (response.data.success && response.data.token) {
      tokenStorage.setToken(response.data.token);
      if (response.data.refresh_token) {
        tokenStorage.setRefreshToken(response.data.refresh_token);
      }
    }
    
    return response.data;
  },

  login: async (credentials: { email: string; password: string }): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    
    // Store tokens if login is successful
    if (response.data.success && response.data.token) {
      tokenStorage.setToken(response.data.token);
      if (response.data.refresh_token) {
        tokenStorage.setRefreshToken(response.data.refresh_token);
      }
    }
    
    return response.data;
  },

  logout: async (): Promise<ApiResponse> => {
    try {
      const response = await apiClient.post('/auth/logout');
      return response.data;
    } finally {
      // Always clear tokens on logout, even if the request fails
      tokenStorage.clearAll();
    }
  },

  getCurrentUser: async (): Promise<ApiResponse> => {
    const response = await apiClient.get('/auth/current-user');
      return response.data;
  },

  signOut: async (): Promise<ApiResponse> => {
    return authApi.logout();
  }
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<ApiResponse> => {
    console.log('📊 Fetching dashboard stats...');
    try {
      const response = await apiClient.get('/dashboard/stats');
      console.log('📊 Stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error('📊 Failed to fetch dashboard stats:', error);
      throw error;
    }
  },

  getRecentUploads: async (limit: number = 5): Promise<ApiResponse> => {
    const response = await apiClient.get(`/dashboard/recent-uploads?limit=${limit}`);
      return response.data;
  },

  getRecentActivities: async (limit: number = 5): Promise<ApiResponse> => {
    const response = await apiClient.get(`/dashboard/recent-activities?limit=${limit}`);
    return response.data;
  },

  getPerformanceMetrics: async (): Promise<ApiResponse> => {
    const response = await apiClient.get('/dashboard/performance-metrics');
    return response.data;
  },

  // Add missing methods used by History component
  exportHistory: async (format: 'csv' | 'json' = 'csv'): Promise<ApiResponse> => {
    const response = await apiClient.get(`/dashboard/export?format=${format}`);
    return response.data;
  },

  deleteUpload: async (uploadId: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/dashboard/uploads/${uploadId}`);
          return response.data;
  }
};

// Admin API
export const adminApi = {
  getUsers: async (page: number = 1, limit: number = 50): Promise<ApiResponse> => {
    const response = await apiClient.get(`/admin/users?page=${page}&limit=${limit}`);
    return response.data;
  },

  getAdminStats: async (): Promise<ApiResponse> => {
    const response = await apiClient.get('/admin/stats');
    return { success: true, data: { statistics: response.data.statistics } };
  },

  getAIModels: async (): Promise<ApiResponse> => {
    const response = await apiClient.get('/admin/ai-models');
    return { success: true, data: response.data };
  },

  getPaymentMethods: async (): Promise<ApiResponse> => {
    const response = await apiClient.get('/admin/payment-methods');
    return { success: true, data: response.data };
  },

  getEmailTemplates: async (): Promise<ApiResponse> => {
    const response = await apiClient.get('/admin/email-templates');
    return { success: true, data: response.data };
  },

  getSystemSettings: async (): Promise<ApiResponse> => {
    const response = await apiClient.get('/admin/system-settings');
    return { success: true, data: response.data };
  },

  getAuditLogs: async (page: number = 1, limit: number = 100): Promise<ApiResponse> => {
    const response = await apiClient.get(`/admin/audit-logs?page=${page}&limit=${limit}`);
    return { success: true, data: response.data };
  }
};

// Billing API
export const billingApi = {
  getBillingInfo: async (options?: { signal?: AbortSignal }): Promise<ApiResponse> => {
    const response = await apiClient.get('/billing', {
      signal: options?.signal
    });
    return response.data;
  },

  updateSubscription: async (tier: 'free' | 'pro' | 'enterprise'): Promise<ApiResponse> => {
    const response = await apiClient.post('/billing/subscription', { tier });
        return response.data;
  },

  cancelSubscription: async (): Promise<ApiResponse> => {
    const response = await apiClient.post('/billing/subscription/cancel');
        return response.data;
  },

  getInvoices: async (options?: { 
    page?: number; 
    limit?: number; 
    signal?: AbortSignal 
  }): Promise<ApiResponse> => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const response = await apiClient.get(`/billing/invoices?${params.toString()}`, {
      signal: options?.signal
    });
    return response.data;
  },

  getUsage: async (): Promise<ApiResponse> => {
    const response = await apiClient.get('/billing/usage');
    return response.data;
  }
};

// Profile API
export const profileApi = {
  getProfile: async (): Promise<ApiResponse> => {
    const response = await apiClient.get('/profile');
        return response.data;
  },

  updateProfile: async (profileData: {
    full_name?: string;
    company?: string;
    phone?: string;
    bio?: string;
    location?: string;
    website?: string;
  }): Promise<ApiResponse> => {
    const response = await apiClient.patch('/profile', profileData);
        return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
    const response = await apiClient.post('/profile/change-password', {
      currentPassword,
      newPassword
        });
        return response.data;
  },

  deleteAccount: async (): Promise<ApiResponse> => {
    const response = await apiClient.delete('/profile/delete-account');
    return response.data;
  },

  // Mock achievements since there's no backend endpoint
  getAchievements: async (): Promise<ApiResponse> => {
    // Mock achievements data
    const mockAchievements = [
      {
        id: 'first-upload',
        title: 'First Upload',
        description: 'Upload your first part image',
        icon: '🎯',
        color: 'from-green-600 to-emerald-600',
        earned: true,
        earnedAt: new Date().toISOString()
      },
      {
        id: 'accuracy-master',
        title: 'Accuracy Master',
        description: 'Achieve 95% accuracy rate',
        icon: '🎯',
        color: 'from-blue-600 to-cyan-600',
        earned: false
      },
      {
        id: 'speed-demon',
        title: 'Speed Demon',
        description: 'Complete 50 identifications',
        icon: '⚡',
        color: 'from-yellow-600 to-orange-600',
        earned: false
      },
      {
        id: 'streak-master',
        title: 'Streak Master',
        description: 'Use the app for 7 consecutive days',
        icon: '🔥',
        color: 'from-red-600 to-pink-600',
        earned: false
      }
    ];

    const earned = mockAchievements.filter(a => a.earned).length;
    
        return {
          success: true,
      data: {
        achievements: mockAchievements,
        totalEarned: earned,
        totalAvailable: mockAchievements.length
      }
    };
  },

  getRecentActivities: async (limit: number = 5): Promise<ApiResponse> => {
    const response = await apiClient.get(`/dashboard/recent-activities?limit=${limit}`);
    return response.data;
  }
};

// Export the main API object
export const api = {
  auth: authApi,
  dashboard: dashboardApi,
  admin: adminApi,
  billing: billingApi,
  profile: profileApi
};

// Export individual APIs for backward compatibility
export { apiClient, tokenStorage };
export default api; 