import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, tokenStorage } from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  company?: string;
  role: string;
  avatar_url?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: { email: string; password: string; full_name: string; company?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
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
        console.log('🔍 No token found in sessionStorage');
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      console.log('🔍 Token found, verifying with backend...');
      
      // Verify token with backend
      const response = await api.auth.getCurrentUser();
      
      if (response.success && response.data?.user) {
        console.log('✅ User authenticated successfully:', response.data.user);
        setUser(response.data.user);
        setIsAuthenticated(true);
      } else {
        console.warn('❌ Token verification failed:', response.error);
        // Clear invalid tokens
        tokenStorage.clearAll();
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      // Clear tokens on error
      tokenStorage.clearAll();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log('🔐 Attempting login for:', email);
      
      const response = await api.auth.login({ email, password });
      
      if (response.success && response.user) {
        console.log('✅ Login successful:', response.user);
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        console.error('❌ Login failed:', response.error || response.message);
        return { 
          success: false, 
          error: response.message || response.error || 'Login failed' 
        };
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
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
    company?: string 
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log('📝 Attempting signup for:', userData.email);
      
      const response = await api.auth.register(userData);
      
      if (response.success && response.user) {
        console.log('✅ Signup successful:', response.user);
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        console.error('❌ Signup failed:', response.error || response.message);
        return { 
          success: false, 
          error: response.message || response.error || 'Registration failed' 
        };
      }
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 Logging out user...');
      
      // Call backend logout (this will also clear tokens)
      await api.auth.logout();
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
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

  // Listen for storage changes (logout in other tabs) - Note: sessionStorage doesn't sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' && !e.newValue) {
        // Token was removed in another tab (this won't work with sessionStorage but keeping for localStorage compatibility)
        console.log('🔄 Token removed in another tab, logging out...');
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};