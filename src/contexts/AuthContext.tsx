import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";
import { type ApiResponse, api, setAuthTokenProvider, tokenStorage } from "@/lib/api";

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
  useEffect(() => {
    if (!isLoaded) return;
    setAuthTokenProvider(
      isSignedIn
        ? async () => {
            const token = await getToken();
            return token || null;
          }
        : null
    );

    // legacy cleanup: if Clerk is enabled, don't keep Supabase tokens around
    if (isSignedIn) tokenStorage.clearAll();
  }, [getToken, isLoaded, isSignedIn]);

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
