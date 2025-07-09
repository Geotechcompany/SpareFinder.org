import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

type User = {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  created_at?: string;
  full_name?: string;
  avatar_url?: string;  // Add this line
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  profile?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  checkAuthStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { toast } = useToast();

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      // If no token, immediately stop loading and allow login page
      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.auth.getCurrentUser();

        if (response.success && response.data) {
          setUser(response.data);
          setIsAuthenticated(true);
          
          // Set admin status based on user role
          setIsAdmin(response.data.role === 'admin');
          setIsSuperAdmin(response.data.role === 'super_admin');
        } else {
          // Clear token if user fetch fails
          localStorage.removeItem('token');
          setUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      } catch (error) {
        // Network or server error
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.auth.signIn(email, password);
      
      // Set user data from the response
      setUser({
        id: response.user.id,
        email: response.user.email,
        role: response.user.role,
        full_name: response.user.full_name,
        avatar_url: response.user.avatar_url,
        created_at: response.user.created_at,
        user_metadata: {
          full_name: response.user.full_name,
          avatar_url: response.user.avatar_url
        }
      });
      
      setIsAuthenticated(true);
      setIsAdmin(response.user.role === 'admin');
      setIsSuperAdmin(response.user.role === 'super_admin');
      setIsLoading(false);
      
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
        variant: 'default'
      });
    } catch (error: any) {
      setIsLoading(false);
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      
      toast({
        title: 'Login Failed',
        description: error.error || 'Unable to log in',
        variant: 'destructive'
      });
      
      throw error; // Re-throw to allow component to handle if needed
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await api.auth.signOut();
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      window.location.href = '/login';
    } catch (error) {
      toast({
        title: 'Logout Error',
        description: 'An error occurred while logging out',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      const response = await api.auth.signUp(email, password, metadata);
      
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        // Fetch user details after successful signup
        await checkAuthStatus();
        
        // Navigate to dashboard
        window.location.href = '/dashboard';
      } else {
        // Signup failed
        toast({
          title: 'Signup Failed',
          description: response.error || 'Unable to create account. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      toast({
        title: 'Signup Error',
        description: 'An unexpected error occurred during signup.',
        variant: 'destructive'
      });
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    try {
      const response = await api.auth.signInWithOAuth(provider);
      
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        // Fetch user details after successful OAuth login
        await checkAuthStatus();
        
        // Navigate to dashboard
        window.location.href = '/dashboard';
      } else {
        // OAuth login failed
        toast({
          title: 'OAuth Login Failed',
          description: response.error || 'Unable to log in with OAuth. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('OAuth login error:', error);
      
      toast({
        title: 'OAuth Login Error',
        description: 'An unexpected error occurred during OAuth login.',
        variant: 'destructive'
      });
    }
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    isSuperAdmin,
    login,
    logout,
    signup,
    signInWithOAuth,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};