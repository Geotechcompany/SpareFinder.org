import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { api, tokenStorage, type ApiResponse } from "@/lib/api";

interface User {
  id: string;
  email: string;
  full_name: string;
  company?: string;
  role: string;
  avatar_url?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: {
    email: string;
    password: string;
    full_name: string;
    company?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on app load
  const checkAuth = async () => {
    try {
      setIsLoading(true);

      const token = tokenStorage.getToken();
      if (!token) {
        console.log("🔍 No token found in localStorage");
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      console.log("🔍 Token found, verifying with backend...");

      // Verify token with backend
      const response = await api.auth.getCurrentUser() as ApiResponse<{ user: User }>;

      if (response.success && response.data?.user) {
        console.log("✅ User authenticated successfully:", response.data.user);
        const userData = response.data.user;
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        console.warn("❌ Token verification failed:", response.error);
        // Clear invalid tokens
        tokenStorage.clearAll();
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      // Clear tokens on error
      tokenStorage.clearAll();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log("🔐 Attempting login for:", email);

      const response = await api.auth.login({ email, password });

      if (response.success && response.user) {
        console.log("✅ Login successful:", response.user);
        const userData = response.user;
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        console.error("❌ Login failed:", response.error || response.message);
        const backendMessage = response.message || response.error || "";
        const isInvalidCredentials =
          (/invalid/i.test(backendMessage) &&
            /(credential|password|email)/i.test(backendMessage));
        return {
          success: false,
          error: isInvalidCredentials
            ? "Invalid email or password"
            : backendMessage || "Login failed",
        };
      }
    } catch (error: unknown) {
      console.error("❌ Login error:", error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      const backendMessage =
        (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (error as { message?: string })?.message ||
        "";
      const isInvalidCredentials =
        status === 401 ||
        (/invalid/i.test(backendMessage) &&
          /(credential|password|email|login)/i.test(backendMessage));
      const errorMessage = isInvalidCredentials
        ? "Invalid email or password"
        : backendMessage || "Login failed";
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Signup function
  const signup = async (userData: {
    email: string;
    password: string;
    full_name: string;
    company?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log("📝 Attempting signup for:", userData.email);

      const response = await api.auth.register(userData);

      if (response.success && response.user) {
        console.log("✅ Signup successful:", response.user);
        const userDataResult = response.user;
        setUser(userDataResult);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        console.error("❌ Signup failed:", response.error || response.message);
        return {
          success: false,
          error: response.message || response.error || "Registration failed",
        };
      }
    } catch (error: unknown) {
      console.error("❌ Signup error:", error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (error as { message?: string })?.message ||
        "Registration failed";
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      console.log("🚪 Logging out user...");

      // Call backend logout (this will also clear tokens)
      await api.auth.logout();

      console.log("✅ Logout successful");
    } catch (error) {
      console.error("❌ Logout error:", error);
      // Even if backend logout fails, clear local state
    } finally {
      // Always clear local state
      setUser(null);
      setIsAuthenticated(false);
      tokenStorage.clearAll();
    }
  };

  // Check auth on mount and when tokens change
  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for storage changes (login/logout in other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Handle token changes
      if (e.key === "auth_token") {
        if (e.newValue) {
          // Token was added/updated in another tab - verify it
          console.log("🔄 Token updated in another tab, checking auth...");
          checkAuth();
        } else {
          // Token was removed in another tab
          console.log("🔄 Token removed in another tab, logging out...");
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      // Check auth when tab becomes visible (handles browser tab switching)
      if (!document.hidden && tokenStorage.getToken()) {
        console.log("🔄 Tab became visible, checking auth...");
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    login,
    signup,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
