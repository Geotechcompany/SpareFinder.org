import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";
import { type ApiResponse, api, setAuthFailureHandler, setAuthTokenProvider, tokenStorage } from "@/lib/api";

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
  isAdmin: boolean;
  isSuperAdmin: boolean;
  // Legacy methods kept for compatibility with existing pages.
  // With Clerk enabled, Login/Register pages should use Clerk UI instead of these.
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  const [user, setUser] = useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Check if user is authenticated on app load
  const checkAuth = async () => {
    try {
      if (!isLoaded) return;

      if (!isSignedIn) {
        setUser(null);
        tokenStorage.clearAll(); // legacy cleanup
        return;
      }

      // Wait a bit to ensure token provider is set
      // This prevents race condition where checkAuth runs before token provider is configured
      await new Promise(resolve => setTimeout(resolve, 100));

      setIsProfileLoading(true);

      // Verify / sync app profile via backend (also performs Clerk→profiles linking server-side)
      const response = await api.auth.getCurrentUser<{ user: User }>();

      if (response.success && response.data?.user) {
        setUser(response.data.user);
      } else {
        console.warn("❌ Failed to load app profile:", response.error || response.message);
        setUser(null);
      }
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      setUser(null);
    } finally {
      setIsProfileLoading(false);
    }
  };

  // Legacy login (Supabase) kept for compatibility during migration. Prefer Clerk UI.
  const login = async (): Promise<{ success: boolean; error?: string }> => {
    return {
      success: false,
      error: "This app now uses Clerk. Please sign in using the Clerk sign-in form.",
    };
  };

  // Legacy signup (Supabase) kept for compatibility during migration. Prefer Clerk UI.
  const signup = async (userData: {
    email: string;
    password: string;
    full_name: string;
    company?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    return {
      success: false,
      error: "This app now uses Clerk. Please sign up using the Clerk sign-up form.",
    };
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      console.log("🚪 Logging out user...");
      await signOut();
    } catch (error) {
      console.error("❌ Logout error:", error);
      // Even if backend logout fails, clear local state
    } finally {
      // Always clear local state
      setUser(null);
      tokenStorage.clearAll();
    }
  };

  // Configure Axios token injection to use Clerk getToken()
  // This must run BEFORE checkAuth to ensure token provider is set
  useEffect(() => {
    if (!isLoaded) {
      // Clear token provider while Clerk is loading
      setAuthTokenProvider(null);
      return;
    }
    
    setAuthTokenProvider(
      isSignedIn
        ? async () => {
            try {
              // Get token from Clerk - this will automatically refresh if expired
              // Don't use template option as it may not be configured
              const token = await getToken();
              return token || null;
            } catch (error) {
              console.warn("⚠️ Failed to get Clerk token:", error);
              return null;
            }
          }
        : null
    );

    // legacy cleanup: if Clerk is enabled, don't keep Supabase tokens around
    if (isSignedIn) tokenStorage.clearAll();
  }, [getToken, isLoaded, isSignedIn]);

  // Handle auth failures - but don't auto-logout on token expiration
  // Token refresh is handled in the API interceptor
  useEffect(() => {
    if (!isLoaded) return;
    setAuthFailureHandler(async ({ status, message }) => {
      // Check if this is a token expiration error that should be handled by refresh
      const isTokenExpired = message?.includes("expired") || 
                            message?.includes("Token_expired") ||
                            message?.includes("session has expired");
      
      if (isTokenExpired) {
        console.warn("🔒 Token expired - refresh should handle this, not logging out");
        // Don't logout - let the token refresh handle it
        return;
      }
      
      console.warn("🔒 Auth failure handler triggered (non-expiration):", { status, message });
      // Only logout for truly invalid sessions, not expired tokens
      setUser(null);
      try {
        await signOut();
      } catch {
        // ignore
      } finally {
        tokenStorage.clearAll();
        // Hard navigate because AuthProvider is outside the Router.
        window.location.href = "/login";
      }
    });

    return () => setAuthFailureHandler(null);
  }, [isLoaded, signOut]);

  // Fetch profile when Clerk session changes
  useEffect(() => {
    checkAuth();
  }, [isLoaded, isSignedIn, clerkUser?.id]);

  // Note: Clerk session state is shared across tabs by Clerk itself.

  const isLoading = !isLoaded || isProfileLoading;
  const isAuthenticated = !!isSignedIn;

  const value: AuthContextType = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      isAdmin: user?.role === "admin" || user?.role === "super_admin",
      isSuperAdmin: user?.role === "super_admin",
      login,
      signup,
      logout,
      checkAuth,
    }),
    [user, isLoading, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
