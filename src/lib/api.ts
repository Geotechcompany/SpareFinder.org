import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

// Type definitions
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
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

// Class-based API client for backward compatibility
class ApiClient {
  private baseUrl: string;
  private aiServiceUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.aiServiceUrl = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useAiService = false,
    queryParams?: string
  ): Promise<ApiResponse<T>> {
    const baseUrlToUse = useAiService ? this.aiServiceUrl : this.baseUrl;
    const cleanBaseUrl = baseUrlToUse.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${cleanBaseUrl}${cleanEndpoint}${queryParams ? `?${queryParams}` : ''}`;
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (useAiService) {
      const apiKey = 'geotech-dev-key-2024';
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
      // Always check for the latest token from localStorage
      const currentToken = localStorage.getItem('auth_token');
      if (currentToken) {
        this.token = currentToken;
        headers.Authorization = `Bearer ${currentToken}`;
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        let errorData: any = {};
        const contentType = response.headers.get('content-type');
        
        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            const errorText = await response.text();
            errorData = { message: errorText || response.statusText };
          }
        } catch (parseError) {
          errorData = { message: response.statusText };
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      return { success: true, data };
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  refreshToken() {
    this.token = localStorage.getItem('auth_token');
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await this.request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      
      console.log('🔍 API Register Response:', response.data);
      
      // If we have a successful response with token
      if (response.data && response.data.success && response.data.token) {
        // Save token to localStorage
        this.setToken(response.data.token);
        
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
        error: errorMessage
      };
    }
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('/api/auth/logout', {
      method: 'POST',
    });

    this.setToken(null);
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  async resetPassword(email: string): Promise<ApiResponse> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async adminLogin(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async adminLogout(): Promise<ApiResponse> {
    const response = await this.request('/api/auth/admin/logout', {
      method: 'POST',
    });

    this.setToken(null);
    return response;
  }

  async uploadImage(file: File, metadata?: any): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    
    const confidence_threshold = 0.5;
    const max_predictions = 5;
    const include_web_scraping = true;

    const queryParams = new URLSearchParams({
      confidence_threshold: confidence_threshold.toString(),
      max_predictions: max_predictions.toString(),
      include_web_scraping: include_web_scraping.toString()
    }).toString();

    const apiKey = 'geotech-dev-key-2024';

    return this.request('/predict', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    }, true, queryParams);
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<ApiResponse<any>> {
    return this.request('/api/dashboard/stats');
  }

  async getRecentUploads(limit = 5): Promise<ApiResponse<any>> {
    return this.request(`/api/dashboard/recent-uploads?limit=${limit}`);
  }

  async getRecentActivities(limit = 5): Promise<ApiResponse<any>> {
    return this.request(`/api/dashboard/recent-activities?limit=${limit}`);
  }

  async getPerformanceMetrics(): Promise<ApiResponse<any>> {
    return this.request('/api/dashboard/performance-metrics');
  }

  // History endpoints
  async getUploadHistory(page = 1, limit = 20, filters?: any): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }

    return this.request(`/api/history/uploads?${params}`);
  }

  async deleteUpload(uploadId: string): Promise<ApiResponse> {
    return this.request(`/api/history/uploads/${uploadId}`, {
      method: 'DELETE'
    });
  }

  async exportHistory(format: 'csv' | 'json' = 'csv'): Promise<ApiResponse<{ downloadUrl: string }>> {
    return this.request(`/api/history/export?format=${format}`);
  }

  // Profile endpoints
  async getProfile(): Promise<ApiResponse<any>> {
    return this.request('/api/profile');
  }

  async updateProfileData(updates: any): Promise<ApiResponse<{ profile: any }>> {
    return this.request('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  // Settings endpoints
  async getSettings(): Promise<ApiResponse<any>> {
    return this.request('/api/settings');
  }

  async updateSettings(settings: any): Promise<ApiResponse<{ settings: any }>> {
    return this.request('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }

  // Billing endpoints
  async getBillingInfo(): Promise<ApiResponse<any>> {
    return this.request('/api/billing');
  }

  async updateSubscription(tier: 'free' | 'pro' | 'enterprise'): Promise<ApiResponse<{ checkout_url?: string }>> {
    return this.request('/api/billing/subscription', {
      method: 'POST',
      body: JSON.stringify({ tier })
    });
  }

  async cancelSubscription(): Promise<ApiResponse> {
    return this.request('/api/billing/subscription/cancel', {
      method: 'POST'
    });
  }

  async getInvoices(page = 1, limit = 10): Promise<ApiResponse<any>> {
    return this.request(`/api/billing/invoices?page=${page}&limit=${limit}`);
  }

  // Admin endpoints
  async getUsers(page = 1, limit = 20): Promise<ApiResponse<any>> {
    return this.request(`/api/admin/users?page=${page}&limit=${limit}`);
  }

  async updateUserRole(userId: string, role: 'user' | 'admin' | 'super_admin'): Promise<ApiResponse<{ user: any }>> {
    return this.request(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  }

  async deleteAdminUser(userId: string): Promise<ApiResponse> {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async getAdminStats(): Promise<ApiResponse<any>> {
    return this.request('/api/admin/stats');
  }

  async getAdminAnalytics(timeRange = '30d'): Promise<ApiResponse<any>> {
    return this.request(`/api/admin/analytics?range=${timeRange}`);
  }

  async getSystemLogs(page = 1, limit = 100, level?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (level) params.append('level', level);

    return this.request(`/api/admin/logs?${params}`);
  }
}

// Create singleton instance of the class-based client
export const apiClient = new ApiClient();

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
const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    image: async (file: File): Promise<UploadResponse> => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add query parameters for AI service
        const params = new URLSearchParams({
          confidence_threshold: '0.5',
          max_predictions: '5',
          include_web_scraping: 'true'
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
};

export default apiClient; 