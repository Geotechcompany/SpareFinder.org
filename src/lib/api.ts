interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  company?: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  company?: string;
  role: string;
  avatar_url?: string;
  created_at: string;
}

interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Ensure proper URL formatting - remove double slashes
    const cleanBaseUrl = this.baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${cleanBaseUrl}${cleanEndpoint}`;
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type if not already specified and body is not FormData
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: any = {};
        const contentType = response.headers.get('content-type');
        
        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            // Handle non-JSON error responses (HTML, text, etc.)
            const errorText = await response.text();
            errorData = { message: errorText || response.statusText };
          }
        } catch (parseError) {
          errorData = { message: response.statusText };
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle successful responses
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON success responses
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
    const response = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
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

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  // Google OAuth
  async googleAuth(tokenData: { access_token?: string; id_token?: string }): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(tokenData),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  // Admin Auth endpoints
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

  // User endpoints
  async updateProfile(updates: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async uploadAvatar(file: File): Promise<ApiResponse<{ avatar_url: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.request<{ avatar_url: string }>('/api/user/avatar', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  // Upload endpoints
  async uploadImage(file: File, metadata?: any): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('image', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return this.request('/api/upload/image', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  // Search endpoints
  async searchParts(query: string, filters?: any): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }

    return this.request(`/api/search/parts?${params}`);
  }

  async getSearchHistory(page = 1, limit = 20): Promise<ApiResponse<any>> {
    return this.request(`/api/search/history?page=${page}&limit=${limit}`);
  }

  // Admin endpoints
  async getUsers(page = 1, limit = 20): Promise<ApiResponse<any>> {
    return this.request(`/api/admin/users?page=${page}&limit=${limit}`);
  }

  async updateUser(userId: string, updates: any): Promise<ApiResponse<any>> {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteUser(userId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async getSystemAnalytics(timeRange?: string): Promise<ApiResponse<any>> {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    return this.request(`/api/admin/analytics${params}`);
  }

  // Enhanced Admin endpoints
  async getAdminStats(): Promise<ApiResponse<{
    statistics: {
      total_users: number;
      total_searches: number;
      active_users: number;
      success_rate: number;
      recent_searches: any[];
      top_users: any[];
      system_metrics: any[];
      searches_today: number;
      new_users_today: number;
      searches_this_week: number;
      system_health: string;
      pending_tasks: number;
      recent_alerts: number;
      avg_response_time: number;
      cpu_usage: number;
      memory_usage: number;
      disk_usage: number;
    };
  }>> {
    return this.request<{
      statistics: {
        total_users: number;
        total_searches: number;
        active_users: number;
        success_rate: number;
        recent_searches: any[];
        top_users: any[];
        system_metrics: any[];
        searches_today: number;
        new_users_today: number;
        searches_this_week: number;
        system_health: string;
        pending_tasks: number;
        recent_alerts: number;
        avg_response_time: number;
        cpu_usage: number;
        memory_usage: number;
        disk_usage: number;
      };
    }>('/api/admin/stats');
  }

  async getAdminAnalytics(timeRange = '30d'): Promise<ApiResponse<{
    analytics: {
      searches_by_day: Record<string, number>;
      registrations_by_day: Record<string, number>;
      time_range: string;
    };
  }>> {
    return this.request(`/api/admin/analytics?range=${timeRange}`);
  }

  async getAdminSearches(page = 1, limit = 50, filters?: { status?: string; userId?: string }): Promise<ApiResponse<{
    searches: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.userId) params.append('userId', filters.userId);

    return this.request(`/api/admin/searches?${params}`);
  }

  async deleteAdminUser(userId: string): Promise<ApiResponse> {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async updateUserRole(userId: string, role: 'user' | 'admin' | 'super_admin'): Promise<ApiResponse<{ user: any }>> {
    return this.request(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  }

  async updateSystemSettings(settings: any): Promise<ApiResponse<{ settings: any }>> {
    return this.request('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ settings })
    });
  }

  async getSystemLogs(page = 1, limit = 100, level?: string): Promise<ApiResponse<{
    logs: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (level) params.append('level', level);

    return this.request(`/api/admin/logs?${params}`);
  }

  async getAdminLogs(options: {
    page?: number;
    limit?: number;
    level?: string;
    userId?: string;
    action?: string;
  } = {}): Promise<ApiResponse<{
    logs: Array<{
      id: string;
      user_id: string;
      action: string;
      resource_type: string;
      details: any;
      created_at: string;
      profiles?: {
        full_name: string;
        email: string;
      };
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const params = new URLSearchParams({
      page: (options.page || 1).toString(),
      limit: (options.limit || 50).toString(),
    });

    if (options.level) {
      params.append('level', options.level);
    }
    if (options.userId) {
      params.append('userId', options.userId);
    }
    if (options.action) {
      params.append('action', options.action);
    }

    return this.request(`/api/admin/logs?${params}`);
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<ApiResponse<{
    totalUploads: number;
    successfulUploads: number;
    avgConfidence: number;
    avgProcessTime: number;
    monthlyGrowth: number;
    currentStreak: number;
    longestStreak: number;
    totalAchievements: number;
    totalSaved: number;
    subscriptionTier: string;
    uploadsThisMonth: number;
  }>> {
    return this.request('/api/dashboard/stats');
  }

  async getRecentUploads(limit = 5): Promise<ApiResponse<{
    uploads: Array<{
      id: string;
      image_name: string;
      created_at: string;
      confidence_score: number;
      predictions: any[];
    }>;
  }>> {
    return this.request(`/api/dashboard/recent-uploads?limit=${limit}`);
  }

  async getRecentActivities(limit = 5): Promise<ApiResponse<{
    activities: Array<{
      id: string;
      action: string;
      resource_type: string;
      details: any;
      created_at: string;
    }>;
  }>> {
    return this.request(`/api/dashboard/recent-activities?limit=${limit}`);
  }

  async getAchievements(): Promise<ApiResponse<{
    achievements: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      color: string;
      earned: boolean;
      earnedAt?: string;
    }>;
    totalEarned: number;
    totalAvailable: number;
  }>> {
    return this.request('/api/dashboard/achievements');
  }

  async getPerformanceMetrics(): Promise<ApiResponse<{
    modelAccuracy: number;
    accuracyChange: number;
    avgResponseTime: number;
    responseTimeChange: number;
    totalSearches: number;
    searchesGrowth: number;
  }>> {
    return this.request('/api/dashboard/performance-metrics');
  }

  async getUserUsageStats(): Promise<ApiResponse<{
    currentMonth: {
      searches: number;
      apiCalls: number;
      storageUsed: number;
    };
    previousMonth: {
      searches: number;
      apiCalls: number;
      storageUsed: number;
    };
  }>> {
    return this.request('/api/dashboard/usage-stats');
  }

  // History endpoints
  async getUploadHistory(page = 1, limit = 20, filters?: any): Promise<ApiResponse<{
    uploads: Array<{
      id: string;
      image_name: string;
      image_url: string;
      created_at: string;
      confidence_score: number;
      predictions: any[];
      processing_time: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
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
  async getProfile(): Promise<ApiResponse<{
    profile: {
      id: string;
      email: string;
      full_name: string;
      company?: string;
      phone?: string;
      bio?: string;
      location?: string;
      website?: string;
      avatar_url?: string;
      role: string;
      created_at: string;
      updated_at: string;
    };
  }>> {
    return this.request('/api/profile');
  }

  async updateProfileData(updates: {
    full_name?: string;
    company?: string;
    phone?: string;
    bio?: string;
    location?: string;
    website?: string;
  }): Promise<ApiResponse<{ profile: any }>> {
    return this.request('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> {
    return this.request('/api/profile/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteAccount(): Promise<ApiResponse> {
    return this.request('/api/profile/delete-account', {
      method: 'DELETE'
    });
  }

  // Settings endpoints
  async getSettings(): Promise<ApiResponse<{
    settings: {
      notifications: {
        email: boolean;
        push: boolean;
        marketing: boolean;
      };
      privacy: {
        profileVisibility: 'public' | 'private';
        dataSharing: boolean;
      };
      preferences: {
        theme: 'light' | 'dark' | 'system';
        language: string;
        timezone: string;
      };
    };
  }>> {
    return this.request('/api/settings');
  }

  async updateSettings(settings: any): Promise<ApiResponse<{ settings: any }>> {
    return this.request('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }

  // Notifications endpoints
  async getNotifications(page = 1, limit = 20): Promise<ApiResponse<{
    notifications: Array<{
      id: string;
      title: string;
      message: string;
      type: 'info' | 'success' | 'warning' | 'error';
      read: boolean;
      created_at: string;
      action_url?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      unreadCount: number;
    };
  }>> {
    return this.request(`/api/notifications?page=${page}&limit=${limit}`);
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    return this.request(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    return this.request('/api/notifications/mark-all-read', {
      method: 'PATCH'
    });
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse> {
    return this.request(`/api/notifications/${notificationId}`, {
      method: 'DELETE'
    });
  }

  // Billing endpoints
  async getBillingInfo(): Promise<ApiResponse<{
    subscription: {
      id: string;
      tier: 'free' | 'pro' | 'enterprise';
      status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
      current_period_start: string;
      current_period_end: string;
      cancel_at_period_end: boolean;
    };
    usage: {
      current_period: {
        searches: number;
        api_calls: number;
        storage_used: number;
      };
      limits: {
        searches: number;
        api_calls: number;
        storage: number;
      };
    };
    invoices: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      created_at: string;
      invoice_url?: string;
    }>;
  }>> {
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

  async getInvoices(page = 1, limit = 10): Promise<ApiResponse<{
    invoices: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      created_at: string;
      invoice_url?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  }>> {
    return this.request(`/api/billing/invoices?page=${page}&limit=${limit}`);
  }

  // Health check endpoint
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request('/api/health');
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
export default apiClient;

// Export types for use in components
export type { 
  ApiResponse, 
  LoginRequest, 
  RegisterRequest, 
  User, 
  AuthResponse 
}; 