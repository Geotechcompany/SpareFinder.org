import axios, { AxiosInstance, AxiosResponse } from "axios";

// Define a generic API response type
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  templates?: any[];
  error?: string;
  message?: string;
  user?: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    [key: string]: unknown;
  };
  token?: string;
  refresh_token?: string;
};

// Remove the Axios module declaration and the duplicate interface
// Type assertions will be used in the code instead

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://api-sparefinder-org.onrender.com";

console.log("🔧 API Client Config:", {
  baseURL: API_BASE_URL,
  environment: import.meta.env.MODE,
  envVars: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    MODE: import.meta.env.MODE,
  },
});

// Token storage utilities
const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

const tokenStorage = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  removeToken: () => sessionStorage.removeItem(TOKEN_KEY),

  getRefreshToken: () => sessionStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) =>
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token),
  removeRefreshToken: () => sessionStorage.removeItem(REFRESH_TOKEN_KEY),

  clearAll: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

interface QueueItem {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

// Token refresh state
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
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

    // Check if this is a public endpoint that doesn't require a token
    const isPublicEndpoint =
      config.url &&
      (config.url.includes("/auth/register") ||
        config.url.includes("/auth/login") ||
        config.url.includes("/auth/refresh") ||
        config.url.includes("/auth/reset-password") ||
        (config.url.includes("/reviews") &&
          config.method?.toLowerCase() === "get") ||
        config.url.includes("/health"));

    // Only log detailed info for debugging when needed
    if (!isPublicEndpoint) {
      console.log("🔍 Request interceptor:", {
        url: config.url,
        hasToken,
        tokenPreview: token ? token.substring(0, 20) + "..." : "NO TOKEN",
        timestamp: new Date().toISOString(),
      });
    }

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
      if (!isPublicEndpoint) {
        console.log("✅ Authorization header added");
      }
    } else if (!isPublicEndpoint) {
      console.log("❌ No token found - request will be unauthorized");
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
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // If we're refreshing but no promise exists, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
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
        console.warn("🔒 No tokens available - redirecting to login");
        isRefreshing = false;
        refreshPromise = null;
        processQueue(error, null);
        tokenStorage.clearAll();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // Create refresh promise
      refreshPromise = (async () => {
        try {
          console.log("🔄 Attempting to refresh token...");

          // Try to refresh the token with timeout
          const refreshResponse = await Promise.race([
            axios.post(`${API_BASE_URL}/api/auth/refresh`, {
              refresh_token: refreshToken,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Token refresh timeout")),
                10000
              )
            ),
          ]);

          if (refreshResponse.data.token) {
            console.log("✅ Token refreshed successfully");

            // Update stored tokens
            tokenStorage.setToken(refreshResponse.data.token);
            if (refreshResponse.data.refresh_token) {
              tokenStorage.setRefreshToken(refreshResponse.data.refresh_token);
            }

            // Process the queue with the new token
            processQueue(null, refreshResponse.data.token);

            return refreshResponse.data.token;
          } else {
            throw new Error("No token in refresh response");
          }
        } catch (refreshError) {
          console.error("🔒 Token refresh failed:", refreshError);

          // Process queue with error
          processQueue(refreshError, null);

          // Clear tokens and redirect to login
          tokenStorage.clearAll();
          window.location.href = "/login";
          throw refreshError;
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      try {
        const newToken = await refreshPromise;
        // Update the authorization header for the original request
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  register: async (userData: {
    email: string;
    password: string;
    full_name: string;
    company?: string;
  }): Promise<ApiResponse> => {
    const response = await apiClient.post("/auth/register", userData);

    // Store tokens if registration is successful
    if (response.data.success && response.data.token) {
      console.log("🔐 Storing tokens after successful registration");
      tokenStorage.setToken(response.data.token);
      if (response.data.refresh_token) {
        tokenStorage.setRefreshToken(response.data.refresh_token);
      }

      // Verify token was stored
      const storedToken = tokenStorage.getToken();
      console.log("✅ Token stored successfully:", !!storedToken);
    } else {
      console.warn("❌ No token received from registration response");
    }

    return response.data;
  },

  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse> => {
    const response = await apiClient.post("/auth/login", credentials);

    // Store tokens if login is successful
    if (response.data.success && response.data.token) {
      tokenStorage.setToken(response.data.token);
      if (response.data.refresh_token) {
        tokenStorage.setRefreshToken(response.data.refresh_token);
      }
    }

    return response.data;
  },

  resetPassword: async (email: string): Promise<ApiResponse> => {
    const response = await apiClient.post("/auth/reset-password", { email });
    return response.data;
  },

  logout: async (): Promise<ApiResponse> => {
    try {
      const response = await apiClient.post("/auth/logout");
      return response.data;
    } finally {
      // Always clear tokens on logout, even if the request fails
      tokenStorage.clearAll();
    }
  },

  getCurrentUser: async (): Promise<ApiResponse> => {
    const response = await apiClient.get("/auth/current-user");
    return response.data;
  },

  signOut: async (): Promise<ApiResponse> => {
    return authApi.logout();
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<ApiResponse> => {
    console.log("📊 Fetching dashboard stats...");
    try {
      const response = await apiClient.get("/dashboard/stats");
      console.log("📊 Stats response:", response.data);
      console.log("📊 Stats response URL:", response.config.url);
      console.log("📊 Stats response status:", response.status);
      console.log("📊 Stats response headers:", response.headers);
      console.log("📊 Stats response config:", response.config);
      return response.data;
    } catch (error) {
      console.error("📊 Failed to fetch dashboard stats:", error);
      throw error;
    }
  },

  // Keyword-only search (backend mock; switch to real integration when available)
  searchByKeywords: async (
    keywords: string[] | string
  ): Promise<ApiResponse> => {
    const payload = { keywords };
    const response = await apiClient.post("/search/keywords", payload);
    return response.data;
  },
  // Direct keyword search with comprehensive analysis
  searchKeywords: async (keywords: string[] | string): Promise<ApiResponse> => {
    const payload: { keywords: string[] } = {
      keywords: Array.isArray(keywords) ? keywords : [keywords],
    };
    const AI_BASE =
      (import.meta as { env?: { VITE_AI_SERVICE_URL?: string } }).env
        ?.VITE_AI_SERVICE_URL || "http://localhost:8000";
    const res = await axios.post(`${AI_BASE}/search/keywords`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },

  scheduleKeywordSearch: async (
    keywords: string[] | string,
    userEmail?: string
  ): Promise<ApiResponse> => {
    const payload: { keywords: string[]; user_email?: string } = {
      keywords: Array.isArray(keywords) ? keywords : [keywords],
    };
    if (userEmail) payload.user_email = userEmail;

    // Call backend instead of AI service directly. Allow longer timeout because
    // the scheduler proxies to the AI service which can take several seconds.
    const response = await apiClient.post<
      ApiResponse<{ filename?: string; jobId?: string }>
    >("/search/keywords", payload, {
      timeout: 120000,
    });
    return response.data;
  },

  getRecentUploads: async (limit: number = 5): Promise<ApiResponse> => {
    console.log("📋 Fetching recent uploads...");
    try {
      const response = await apiClient.get(
        `/dashboard/recent-uploads?limit=${limit}`
      );
      console.log("📋 Recent uploads response:", response.data);
      return response.data;
    } catch (error) {
      console.error("📋 Failed to fetch recent uploads:", error);
      throw error;
    }
  },

  getRecentActivities: async (limit: number = 5): Promise<ApiResponse> => {
    console.log("🔄 Fetching recent activities...");
    try {
      const response = await apiClient.get(
        `/dashboard/recent-activities?limit=${limit}`
      );
      console.log("🔄 Recent activities response:", response.data);
      return response.data;
    } catch (error) {
      console.error("🔄 Failed to fetch recent activities:", error);
      throw error;
    }
  },

  getPerformanceMetrics: async (): Promise<ApiResponse> => {
    console.log("📈 Fetching performance metrics...");
    try {
      const response = await apiClient.get("/dashboard/performance-metrics");
      console.log("📈 Performance metrics response:", response.data);
      return response.data;
    } catch (error) {
      console.error("📈 Failed to fetch performance metrics:", error);
      throw error;
    }
  },

  // Add missing methods used by History component
  exportHistory: async (
    format: "csv" | "json" = "csv"
  ): Promise<ApiResponse> => {
    const response = await apiClient.get(`/dashboard/export?format=${format}`);
    return response.data;
  },

  deleteUpload: async (uploadId: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/dashboard/uploads/${uploadId}`);
    return response.data;
  },

  // Get individual job data from database
  getJobData: async (jobId: string): Promise<ApiResponse> => {
    console.log(`🔍 Fetching job data for: ${jobId}`);
    try {
      const response = await apiClient.get(`/dashboard/jobs/${jobId}`);
      console.log(`🔍 Job data response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`🔍 Failed to fetch job data for ${jobId}:`, error);
      throw error;
    }
  },
};

// Admin API
export const adminApi = {
  getUsers: async (
    page: number = 1,
    limit: number = 50,
    search?: string,
    roleFilter?: string
  ): Promise<ApiResponse> => {
    console.log("📋 Fetching users from API...");
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (search && search.trim()) {
        params.append("search", search.trim());
      }

      if (roleFilter && roleFilter !== "all") {
        params.append("role", roleFilter);
      }

      const response = await apiClient.get(`/admin/users?${params.toString()}`);
      console.log("📋 Raw API response:", response.data);
      return response.data;
    } catch (error) {
      console.error("📋 Failed to fetch users:", error);
      throw error;
    }
  },

  getAdminStats: async (): Promise<ApiResponse> => {
    const response = await apiClient.get("/admin/stats");
    return { success: true, data: { statistics: response.data.statistics } };
  },

  getAIModels: async (): Promise<ApiResponse> => {
    const response = await apiClient.get("/admin/ai-models");
    return { success: true, data: response.data };
  },

  getPaymentMethods: async (): Promise<ApiResponse> => {
    const response = await apiClient.get("/admin/payment-methods");
    return { success: true, data: response.data };
  },

  createPaymentMethod: async (paymentMethodData: {
    name: string;
    provider: string;
    api_key: string;
    secret_key: string;
    description?: string;
  }): Promise<ApiResponse> => {
    const response = await apiClient.post(
      "/admin/payment-methods",
      paymentMethodData
    );
    return { success: true, data: response.data };
  },

  deletePaymentMethod: async (
    paymentMethodId: string
  ): Promise<ApiResponse> => {
    const response = await apiClient.delete(
      `/admin/payment-methods/${paymentMethodId}`
    );
    return { success: true, data: response.data };
  },

  getEmailTemplates: async (): Promise<ApiResponse> => {
    const response = await apiClient.get("/admin/email-templates");
    return response.data;
  },

  getSystemSettings: async (): Promise<ApiResponse> => {
    const response = await apiClient.get("/admin/system-settings");
    return { success: true, data: response.data };
  },

  getAuditLogs: async (
    page: number = 1,
    limit: number = 100
  ): Promise<ApiResponse> => {
    const response = await apiClient.get(
      `/admin/audit-logs?page=${page}&limit=${limit}`
    );
    return { success: true, data: response.data };
  },

  getAnalytics: async (timeRange: string = "30d"): Promise<ApiResponse> => {
    const response = await apiClient.get(`/admin/analytics?range=${timeRange}`);
    return { success: true, data: response.data };
  },

  updateUserRole: async (
    userId: string,
    role: "user" | "admin" | "super_admin"
  ): Promise<ApiResponse> => {
    const response = await apiClient.patch(`/admin/users/${userId}/role`, {
      role,
    });
    return response.data;
  },

  deleteUser: async (userId: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  },

  getSubscribers: async (
    page: number = 1,
    limit: number = 50,
    tier?: string,
    status?: string
  ): Promise<ApiResponse> => {
    console.log("📊 Fetching subscribers from API...");
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (tier && tier !== "all") {
        params.append("tier", tier);
      }

      if (status && status !== "all") {
        params.append("status", status);
      }

      const response = await apiClient.get(
        `/admin/subscribers?${params.toString()}`
      );
      console.log("📊 Raw subscribers API response:", response.data);
      return response.data;
    } catch (error) {
      console.error("📊 Failed to fetch subscribers:", error);
      throw error;
    }
  },

  // SMTP Configuration
  getSmtpSettings: async (): Promise<ApiResponse> => {
    const response = await apiClient.get("/admin/system-settings");
    return { success: true, data: response.data };
  },

  saveSmtpSettings: async (smtpConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
    encryption: string;
    fromName: string;
  }): Promise<ApiResponse> => {
    const response = await apiClient.post("/admin/smtp-settings", {
      smtpConfig,
    });
    return response.data;
  },

  testSmtpConnection: async (smtpConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
    encryption: string;
    fromName: string;
  }): Promise<ApiResponse> => {
    const response = await apiClient.post("/admin/test-smtp", { smtpConfig });
    return response.data;
  },

  createEmailTemplate: async (templateData: {
    name: string;
    subject: string;
    html_content?: string;
    text_content?: string;
    status?: string;
    description?: string;
    variables?: string[];
  }): Promise<ApiResponse> => {
    const response = await apiClient.post(
      "/admin/email-templates",
      templateData
    );
    return response.data;
  },

  updateEmailTemplate: async (
    id: string,
    templateData: {
      name: string;
      subject: string;
      html_content?: string;
      text_content?: string;
      status?: string;
      description?: string;
      variables?: string[];
    }
  ): Promise<ApiResponse> => {
    const response = await apiClient.put(
      `/admin/email-templates/${id}`,
      templateData
    );
    return response.data;
  },

  deleteEmailTemplate: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/admin/email-templates/${id}`);
    return response.data;
  },

  testEmailTemplate: async (
    id: string,
    testData: {
      test_email: string;
      variables?: Record<string, any>;
    }
  ): Promise<ApiResponse> => {
    const response = await apiClient.post(
      `/admin/email-templates/${id}/test`,
      testData
    );
    return response.data;
  },
};

// Billing API
export const billingApi = {
  getBillingInfo: async (options?: {
    signal?: AbortSignal;
  }): Promise<ApiResponse> => {
    const response = await apiClient.get("/billing", {
      signal: options?.signal,
    });
    return response.data;
  },

  updateSubscription: async (
    tier: "free" | "pro" | "enterprise"
  ): Promise<ApiResponse> => {
    const response = await apiClient.post("/billing/subscription", { tier });
    return response.data;
  },

  cancelSubscription: async (): Promise<ApiResponse> => {
    const response = await apiClient.post("/billing/subscription/cancel");
    return response.data;
  },

  getInvoices: async (options?: {
    page?: number;
    limit?: number;
    signal?: AbortSignal;
  }): Promise<ApiResponse> => {
    const params = new URLSearchParams();
    if (options?.page) params.append("page", options.page.toString());
    if (options?.limit) params.append("limit", options.limit.toString());

    const response = await apiClient.get(
      `/billing/invoices?${params.toString()}`,
      {
        signal: options?.signal,
      }
    );
    return response.data;
  },

  getUsage: async (): Promise<ApiResponse> => {
    const response = await apiClient.get("/billing/usage");
    return response.data;
  },

  processPayment: async (paymentData: {
    plan: string;
    amount: number;
    currency: string;
    billing_cycle: string;
    customer: {
      email: string;
      name: string;
      company?: string;
    };
    payment_method: {
      card_number: string;
      expiry_date: string;
      cvv: string;
    };
  }): Promise<ApiResponse> => {
    const response = await apiClient.post(
      "/billing/process-payment",
      paymentData
    );
    return response.data;
  },

  createSubscription: async (subscriptionData: {
    plan: string;
    amount: number;
    currency: string;
    billing_cycle: string;
    customer: {
      email: string;
      name: string;
      company?: string;
    };
    payment_method: {
      card_number: string;
      expiry_date: string;
      cvv: string;
    };
  }): Promise<ApiResponse> => {
    const response = await apiClient.post(
      "/billing/subscribe",
      subscriptionData
    );
    return response.data;
  },

  createCheckoutSession: async (checkoutData: {
    plan: string;
    amount: number;
    currency: string;
    billing_cycle: string;
    success_url: string;
    cancel_url: string;
    trial_days?: number;
  }): Promise<ApiResponse> => {
    const response = await apiClient.post(
      "/billing/checkout-session",
      checkoutData
    );
    return response.data;
  },

  // Pay-as-you-go credits purchase
  createCreditsCheckoutSession: async (options: {
    credits: number;
    success_url: string;
    cancel_url: string;
  }): Promise<ApiResponse> => {
    const response = await apiClient.post(
      "/billing/credits/checkout-session",
      options
    );
    return response.data;
  },
};

// Profile API
export const profileApi = {
  getProfile: async (): Promise<ApiResponse> => {
    const response = await apiClient.get("/profile");
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
    const response = await apiClient.patch("/profile", profileData);
    return response.data;
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse> => {
    const response = await apiClient.post("/profile/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  deleteAccount: async (): Promise<ApiResponse> => {
    const response = await apiClient.delete("/profile/delete-account");
    return response.data;
  },

  // Mock achievements since there's no backend endpoint
  getAchievements: async (): Promise<ApiResponse> => {
    // Mock achievements data
    const mockAchievements = [
      {
        id: "first-upload",
        title: "First Upload",
        description: "Upload your first part image",
        icon: "🎯",
        color: "from-green-600 to-emerald-600",
        earned: true,
        earnedAt: new Date().toISOString(),
      },
      {
        id: "accuracy-master",
        title: "Accuracy Master",
        description: "Achieve 95% accuracy rate",
        icon: "🎯",
        color: "from-blue-600 to-cyan-600",
        earned: false,
      },
      {
        id: "speed-demon",
        title: "Speed Demon",
        description: "Complete 50 identifications",
        icon: "⚡",
        color: "from-yellow-600 to-orange-600",
        earned: false,
      },
      {
        id: "streak-master",
        title: "Streak Master",
        description: "Use the app for 7 consecutive days",
        icon: "🔥",
        color: "from-red-600 to-pink-600",
        earned: false,
      },
    ];

    const earned = mockAchievements.filter((a) => a.earned).length;

    return {
      success: true,
      data: {
        achievements: mockAchievements,
        totalEarned: earned,
        totalAvailable: mockAchievements.length,
      },
    };
  },

  getRecentActivities: async (limit: number = 5): Promise<ApiResponse> => {
    const response = await apiClient.get(
      `/dashboard/recent-activities?limit=${limit}`
    );
    return response.data;
  },
};

// Upload API
export const uploadApi = {
  image: async (
    file: File,
    keywords: string[] = [],
    options: {
      confidenceThreshold?: number;
      maxPredictions?: number;
      includeWebScraping?: boolean;
    } = {}
  ): Promise<ApiResponse> => {
    try {
      const formData = new FormData();
      formData.append("image", file);

      // Add keywords if provided
      if (keywords.length > 0) {
        formData.append("keywords", keywords.join(", "));
      }

      // Add metadata
      const metadata = {
        confidenceThreshold: options.confidenceThreshold || 0.3,
        maxPredictions: options.maxPredictions || 3,
        includeWebScraping: options.includeWebScraping || false,
      };
      formData.append("metadata", JSON.stringify(metadata));

      const response = await apiClient.post("/upload/image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 60 second timeout for image upload
      });

      return response.data;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  },

  saveResults: async (analysisResults: {
    success: boolean;
    predictions: Array<{
      class_name: string;
      confidence: number;
      description?: string;
      category?: string;
      manufacturer?: string;
      estimated_price?: string;
      part_number?: string;
      compatibility?: string[];
    }>;
    similar_images?: Array<{
      id: string;
      url: string;
      similarity: number;
      [key: string]: unknown;
    }>;
    model_version: string;
    processing_time: number;
    image_metadata: {
      content_type: string;
      size_bytes: number;
      base64_image?: string;
    };
    additional_details?: {
      full_analysis?: string;
      technical_specifications?: string;
      market_information?: string;
      confidence_reasoning?: string;
    };
    image_url?: string;
    image_name?: string;
  }): Promise<ApiResponse> => {
    try {
      const response = await apiClient.post(
        "/upload/save-results",
        analysisResults,
        {
          timeout: 30000, // 30 second timeout
        }
      );

      return response.data;
    } catch (error) {
      console.error("Save results error:", error);
      throw error;
    }
  },

  getHistory: async (options?: {
    page?: number;
    limit?: number;
    status?: string;
    web_scraping?: boolean;
    date_from?: string;
    date_to?: string;
  }): Promise<ApiResponse> => {
    try {
      const params = new URLSearchParams();
      if (options?.page) params.append("page", options.page.toString());
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.status) params.append("status", options.status);
      if (options?.web_scraping !== undefined)
        params.append("web_scraping", options.web_scraping.toString());
      if (options?.date_from) params.append("date_from", options.date_from);
      if (options?.date_to) params.append("date_to", options.date_to);

      // Align with backend route: /uploads
      const response = await apiClient.get(
        `/history/uploads?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error("Upload history error:", error);
      throw error;
    }
  },

  deleteUpload: async (uploadId: string): Promise<ApiResponse> => {
    try {
      // Backend exposes deletion at /uploads/:uploadId
      const response = await apiClient.delete(`/history/uploads/${uploadId}`);
      return response.data;
    } catch (error) {
      console.error("Delete upload error:", error);
      throw error;
    }
  },

  getStatistics: async (): Promise<ApiResponse> => {
    try {
      const response = await apiClient.get("/upload/statistics");
      return response.data;
    } catch (error) {
      console.error("Upload statistics error:", error);
      throw error;
    }
  },

  createCrewAnalysisJob: async (
    file: File,
    keywords: string = ""
  ): Promise<ApiResponse<{ jobId: string; imageUrl: string }>> => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (keywords) {
        formData.append("keywords", keywords);
      }

      const response = await apiClient.post("/upload/crew-analysis", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000, // 30 second timeout
      });

      return response.data;
    } catch (error) {
      console.error("Create Deep Research job error:", error);
      throw error;
    }
  },

  getCrewAnalysisJobs: async (): Promise<ApiResponse> => {
    try {
      const response = await apiClient.get("/upload/crew-analysis-jobs");
      return response.data;
    } catch (error) {
      console.error("Get Deep Research jobs error:", error);
      throw error;
    }
  },

  deleteCrewAnalysisJob: async (jobId: string): Promise<ApiResponse> => {
    try {
      const response = await apiClient.delete(`/upload/crew-analysis/${jobId}`);
      return response.data;
    } catch (error) {
      console.error("Delete Deep Research job error:", error);
      throw error;
    }
  },
};

// Statistics API
export const statisticsApi = {
  refresh: async (): Promise<ApiResponse> => {
    try {
      const response = await apiClient.post("/statistics/refresh");
      return response.data;
    } catch (error) {
      console.error("Statistics refresh error:", error);
      throw error;
    }
  },

  getStats: async (): Promise<ApiResponse> => {
    try {
      const response = await apiClient.get("/statistics");
      return response.data;
    } catch (error) {
      console.error("Statistics fetch error:", error);
      throw error;
    }
  },
};

// Notifications API
export const notificationsApi = {
  getNotifications: async (options?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> => {
    try {
      const params = new URLSearchParams();
      if (options?.page) params.append("page", options.page.toString());
      if (options?.limit) params.append("limit", options.limit.toString());

      const response = await apiClient.get(
        `/notifications?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error("Notifications fetch error:", error);
      throw error;
    }
  },

  markAsRead: async (notificationId: string): Promise<ApiResponse> => {
    try {
      const response = await apiClient.patch(
        `/notifications/${notificationId}/read`
      );
      return response.data;
    } catch (error) {
      console.error("Mark notification as read error:", error);
      throw error;
    }
  },

  markAllAsRead: async (): Promise<ApiResponse> => {
    try {
      const response = await apiClient.patch("/notifications/mark-all-read");
      return response.data;
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      throw error;
    }
  },

  deleteNotification: async (notificationId: string): Promise<ApiResponse> => {
    try {
      const response = await apiClient.delete(
        `/notifications/${notificationId}`
      );
      return response.data;
    } catch (error) {
      console.error("Delete notification error:", error);
      throw error;
    }
  },

  createNotification: async (notification: {
    title: string;
    message: string;
    type?: "info" | "success" | "warning" | "error";
    action_url?: string;
  }): Promise<ApiResponse> => {
    try {
      const response = await apiClient.post("/notifications", notification);
      return response.data;
    } catch (error) {
      console.error("Create notification error:", error);
      throw error;
    }
  },

  getStats: async (): Promise<ApiResponse> => {
    try {
      const response = await apiClient.get("/notifications/stats");
      return response.data;
    } catch (error) {
      console.error("Notifications stats error:", error);
      throw error;
    }
  },
};

// Credits API
export const creditsApi = {
  getBalance: async (): Promise<ApiResponse> => {
    try {
      const response = await apiClient.get("/credits/balance");
      return response.data;
    } catch (error) {
      console.error("Credits balance fetch error:", error);
      throw error;
    }
  },

  getTransactions: async (options?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> => {
    try {
      const params = new URLSearchParams();
      if (options?.page) params.append("page", options.page.toString());
      if (options?.limit) params.append("limit", options.limit.toString());

      const response = await apiClient.get(
        `/credits/transactions?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error("Credits transactions fetch error:", error);
      throw error;
    }
  },

  checkCredits: async (amount: number = 1): Promise<ApiResponse> => {
    try {
      const response = await apiClient.get(`/credits/check/${amount}`);
      return response.data;
    } catch (error) {
      console.error("Credits check error:", error);
      throw error;
    }
  },

  // Admin only
  addCredits: async (
    userId: string,
    amount: number,
    reason?: string
  ): Promise<ApiResponse> => {
    try {
      const response = await apiClient.post("/credits/add", {
        user_id: userId,
        amount,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error("Add credits error:", error);
      throw error;
    }
  },

  // Admin only
  getStatistics: async (): Promise<ApiResponse> => {
    try {
      const response = await apiClient.get("/credits/statistics");
      return response.data;
    } catch (error) {
      console.error("Credits statistics error:", error);
      throw error;
    }
  },
};

// Contact API
export const contactApi = {
  submitForm: async (formData: {
    name: string;
    email: string;
    company: string;
    subject: string;
    message: string;
    inquiryType: "support" | "sales" | "billing" | "technical" | "general";
  }): Promise<ApiResponse> => {
    try {
      const response = await apiClient.post("/contact", formData);
      return response.data;
    } catch (error) {
      console.error("Contact form submission error:", error);
      throw error;
    }
  },
};

// Reviews API
export const reviewsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<
    ApiResponse<{
      reviews: Array<{
        id: string;
        name: string;
        email: string;
        company?: string;
        rating: number;
        title: string;
        message: string;
        created_at: string;
        verified: boolean;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      stats: {
        averageRating: number;
        totalReviews: number;
      };
    }>
  > => {
    try {
      const response = await apiClient.get("/reviews", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching reviews:", error);
      throw error;
    }
  },

  create: async (reviewData: {
    name: string;
    email: string;
    company?: string;
    rating: number;
    title: string;
    message: string;
  }): Promise<
    ApiResponse<{
      review: {
        id: string;
        rating: number;
        title: string;
        submittedAt: string;
      };
      emailSent: boolean;
    }>
  > => {
    try {
      console.log("📤 Submitting review:", reviewData);
      const response = await apiClient.post("/reviews", reviewData);
      console.log("✅ Review submitted successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Review submission error:", error);
      throw error;
    }
  },

  getStats: async (): Promise<
    ApiResponse<{
      totalReviews: number;
      averageRating: number;
      ratingDistribution: Array<{
        rating: number;
        count: number;
        percentage: number;
      }>;
    }>
  > => {
    try {
      const response = await apiClient.get("/reviews/stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching review stats:", error);
      throw error;
    }
  },
};

// Export combined API
export const api = {
  auth: authApi,
  user: {
    getProfile: () => apiClient.get("/user/profile"),
    updateProfile: (profileData: {
      full_name?: string;
      company?: string;
      phone?: string;
      bio?: string;
      location?: string;
      website?: string;
      preferences?: {
        emailNotifications?: boolean;
        smsNotifications?: boolean;
        autoSave?: boolean;
        darkMode?: boolean;
        analytics?: boolean;
        marketing?: boolean;
      };
    }) => apiClient.put("/user/profile", profileData),
    changePassword: async (
      currentPassword: string,
      newPassword: string
    ): Promise<ApiResponse> => {
      const response = await apiClient.post("/profile/change-password", {
        currentPassword,
        newPassword,
      });
      return response.data;
    },
    deleteAccount: async (): Promise<ApiResponse> => {
      const response = await apiClient.delete("/profile/delete-account");
      return response.data;
    },
    getAchievements: async (): Promise<ApiResponse> => {
      // Mock achievements data
      const mockAchievements = [
        {
          id: "first-upload",
          title: "First Upload",
          description: "Upload your first part image",
          icon: "🎯",
          color: "from-green-600 to-emerald-600",
          earned: true,
          earnedAt: new Date().toISOString(),
        },
        {
          id: "accuracy-master",
          title: "Accuracy Master",
          description: "Achieve 95% accuracy rate",
          icon: "🎯",
          color: "from-blue-600 to-cyan-600",
          earned: false,
        },
        {
          id: "speed-demon",
          title: "Speed Demon",
          description: "Complete 50 identifications",
          icon: "⚡",
          color: "from-yellow-600 to-orange-600",
          earned: false,
        },
        {
          id: "streak-master",
          title: "Streak Master",
          description: "Use the app for 7 consecutive days",
          icon: "🔥",
          color: "from-red-600 to-pink-600",
          earned: false,
        },
      ];

      const earned = mockAchievements.filter((a) => a.earned).length;

      return {
        success: true,
        data: {
          achievements: mockAchievements,
          totalEarned: earned,
          totalAvailable: mockAchievements.length,
        },
      };
    },
    getRecentActivities: async (limit: number = 5): Promise<ApiResponse> => {
      const response = await apiClient.get(
        `/dashboard/recent-activities?limit=${limit}`
      );
      return response.data;
    },
  },
  upload: uploadApi,
  admin: adminApi,
  notifications: notificationsApi,
  billing: billingApi,
  statistics: statisticsApi,
  credits: creditsApi,
  contact: contactApi,
  reviews: reviewsApi,
};

// Export individual APIs for backward compatibility
export { apiClient, tokenStorage };
export default api;
