import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";
import { type ApiResponse, api, setAuthFailureHandler, setAuthTokenProvider, tokenStorage } from "@/lib/api";
import { isAdminAppRole, isSuperAdminAppRole, normalizeAppRole } from "@/lib/roles";

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

function buildUserFromClerk(clerkUser: NonNullable<ReturnType<typeof useClerkUser>["user"]>): User {
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress ||
    "";
  const role = normalizeAppRole(
    typeof clerkUser.publicMetadata?.role === "string"
      ? clerkUser.publicMetadata.role
      : "user"
  );

  return {
    id: clerkUser.id,
    email,
    full_name:
      clerkUser.fullName ||
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      email.split("@")[0] ||
      "User",
    company:
      typeof clerkUser.publicMetadata?.company === "string"
        ? clerkUser.publicMetadata.company
        : undefined,
    role,
    avatar_url: clerkUser.imageUrl ?? undefined,
    created_at: clerkUser.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  const [user, setUser] = useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const applyClerkFallbackUser = () => {
    if (clerkUser) {
      const fallback = buildUserFromClerk(clerkUser);
      setUser((prev) => {
        if (!prev) return fallback;
        const sameClerkIdentity =
          prev.email &&
          fallback.email &&
          prev.email.toLowerCase() === fallback.email.toLowerCase();
        if (!sameClerkIdentity) return fallback;
        return {
          ...fallback,
          id: prev.id || fallback.id,
          role: fallback.role,
        };
      });
      return true;
    }
    setUser(null);
    return false;
  };

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
      await new Promise(resolve => setTimeout(resolve, 100));

      // Avoid flashing the whole app on background profile refreshes (workspace switch, etc.)
      if (!user) {
        setIsProfileLoading(true);
      }

      // Short timeout so we don't hang when backend is busy (e.g. Crew AI running)
      const authTimeoutMs = 10000;
      let response: ApiResponse<{ user: User }> | null = null;

      try {
        response = await api.auth.getCurrentUser<{ user: User }>({
          timeout: authTimeoutMs,
        });
      } catch (firstError) {
        // One retry after 2s so transient slowness doesn't block login
        const isTimeout =
          firstError instanceof Error &&
          (firstError.message.includes("timeout") ||
            (firstError as any)?.code === "ECONNABORTED");
        if (isTimeout) {
          await new Promise((r) => setTimeout(r, 2000));
          response = await api.auth.getCurrentUser<{ user: User }>({
            timeout: authTimeoutMs,
          }).catch(() => null);
        } else {
          throw firstError;
        }
      }

      if (response?.success && response.data?.user) {
        const profile = response.data.user;
        setUser({
          ...profile,
          role: normalizeAppRole(profile.role),
        });
        // Apply pending referral code (from invite link) if any
        try {
          const pendingRef = sessionStorage.getItem("sparefinder_pending_referral");
          if (pendingRef && pendingRef.trim()) {
            sessionStorage.removeItem("sparefinder_pending_referral");
            api.referrals.apply(pendingRef.trim()).catch(() => {});
          }
        } catch {
          /* ignore */
        }
      } else {
        console.warn("❌ Failed to load app profile:", response?.error || response?.message);
        applyClerkFallbackUser();
      }
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      applyClerkFallbackUser();
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

  // Only block the app on profile fetch when Clerk says the user is signed in.
  // Public routes (login/register) stay interactive while Crew AI runs on the server.
  const isLoading = !isLoaded || (isSignedIn && isProfileLoading);
  const isAuthenticated = !!isSignedIn;

  const value: AuthContextType = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      isAdmin: isAdminAppRole(user?.role),
      isSuperAdmin: isSuperAdminAppRole(user?.role),
      login,
      signup,
      logout,
      checkAuth,
    }),
    [user, isLoading, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
