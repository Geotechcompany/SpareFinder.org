import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiClient, api } from '@/lib/api'
import { toast } from 'sonner'

// Types for compatibility with existing code
interface AuthUser {
  id: string
  email: string
  full_name: string
  company?: string
  role: string
  avatar_url?: string
  created_at: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
    subscription_tier?: string
    [key: string]: any
  }
}

interface AuthSession {
  access_token: string
  user: AuthUser
}

interface AuthError {
  message: string
  status?: number
}

interface Profile extends AuthUser {}

interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  error: AuthError | null
  isAdmin: boolean
  isSuperAdmin: boolean
  signUp: (email: string, password: string, metadata?: { [key: string]: any }) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithOAuth: (provider: 'google' | 'github' | 'discord') => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authSession, setAuthSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  const isAdmin = user?.role === 'admin'
  const isSuperAdmin = user?.role === 'super_admin'

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check for existing token
        const token = localStorage.getItem('auth_token')
        if (token) {
          // Try to get current user from backend
          try {
            const response = await api.user.getProfile()
            if (response.success && response.data?.profile) {
              const authUser = mapApiUserToAuthUser(response.data.profile)
              setUser(authUser)
              setAuthSession({
                access_token: token,
                user: authUser
              })
              console.log('Session restored from backend:', authUser.email, 'role:', authUser.role)
            }
          } catch (backendError) {
            console.log('Backend session check failed, trying Supabase:', backendError)
          }
        }

        // Check Supabase session
        try {
          const { auth } = await import('../lib/supabase/client')
          const { session, error } = await auth.getSession()
          
          if (session?.user) {
            await handleOAuthSession(session)
          }
        } catch (supabaseError) {
          console.log('Supabase session check failed:', supabaseError)
        }
      } catch (error) {
        console.error('Session check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const setupAuthListener = async () => {
      try {
        const { auth } = await import('../lib/supabase/client')
        
        auth.onAuthStateChange(async (event, supabaseSession) => {
          console.log('Supabase auth state change:', event, supabaseSession?.user?.email)
          
          if (event === 'SIGNED_IN' && supabaseSession) {
            await handleOAuthSession(supabaseSession)
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
            setAuthSession(null)
            setError(null)
          }
        })
      } catch (error) {
        console.error('Failed to setup auth listener:', error)
      }
    }

    checkSession()
    setupAuthListener()
  }, [])

  const handleOAuthSession = async (supabaseSession: any) => {
    try {
      const supabaseUser = supabaseSession.user
      
      // Map Supabase user to our AuthUser format
      const authUser: AuthUser = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        company: supabaseUser.user_metadata?.company,
        role: supabaseUser.user_metadata?.role || 'user',
        avatar_url: supabaseUser.user_metadata?.avatar_url,
        created_at: supabaseUser.created_at,
        user_metadata: supabaseUser.user_metadata
      }

      setUser(authUser)
      setAuthSession({
        access_token: supabaseSession.access_token,
        user: authUser
      })

      // Try to sync with backend if we have a backend token
      const backendToken = localStorage.getItem('auth_token')
      if (backendToken) {
        try {
          await api.user.updateProfile({
            full_name: authUser.full_name,
            company: authUser.company
          })
        } catch (backendError) {
          console.log('Backend profile sync failed:', backendError)
        }
      }

      console.log('OAuth session established:', authUser.email, 'role:', authUser.role)
    } catch (error) {
      console.error('Failed to handle OAuth session:', error)
      setError({
        message: 'Failed to process OAuth session'
      })
    }
  }

  const mapApiUserToAuthUser = (apiUser: any): AuthUser => {
    return {
      id: apiUser.id,
      email: apiUser.email,
      full_name: apiUser.full_name,
      company: apiUser.company,
      role: apiUser.role,
      avatar_url: apiUser.avatar_url,
      created_at: apiUser.created_at,
      user_metadata: apiUser.user_metadata
    }
  }

  const handleAuthSuccess = (authResponse: any) => {
    const authUser = mapApiUserToAuthUser(authResponse.user)
    setUser(authUser)
    setAuthSession({
      access_token: authResponse.token,
      user: authUser
    })
    
    // Ensure token is saved to localStorage for API client
    localStorage.setItem('auth_token', authResponse.token)
    setError(null)
  }

  const signUp = async (email: string, password: string, metadata?: { [key: string]: any }) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await api.auth.register({ email, password, name: metadata?.full_name || email })

      if (response.success && response.data) {
        handleAuthSuccess(response.data)
        toast.success('Account created successfully!')
      } else {
        throw new Error(response.error || 'Registration failed')
      }
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'Registration failed'
      }
      setError(authError)
      toast.error(authError.message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await api.auth.login(email, password)

      if (response.success && response.data) {
        handleAuthSuccess(response.data)
        toast.success('Signed in successfully!')
      } else {
        throw new Error(response.error || 'Login failed')
      }
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'Login failed'
      }
      setError(authError)
      toast.error(authError.message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithOAuth = async (provider: 'google' | 'github' | 'discord') => {
    try {
      setIsLoading(true)
      setError(null)

      // Import the auth helper from Supabase client
      const { auth } = await import('../lib/supabase/client')
      
      const { data, error } = await auth.signInWithOAuth(provider)

      if (error) {
        throw new Error(error.message || `${provider} OAuth failed`)
      }

      // The OAuth flow will redirect to the provider's login page
      // After successful authentication, the user will be redirected back
      // and the session will be handled by Supabase's auth state change
      toast.success(`Redirecting to ${provider} login...`)
      
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : `${provider} OAuth failed`
      }
      setError(authError)
      toast.error(authError.message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setIsLoading(true)
      
      // Clear backend session if exists
      await api.auth.logout()
      
      // Clear Supabase session if exists  
      try {
        const { auth } = await import('../lib/supabase/client')
        await auth.signOut()
      } catch (supabaseError) {
        console.log('Supabase signout not needed or failed:', supabaseError)
      }
      
      // Clear local state
      setUser(null)
      setAuthSession(null)
      setError(null)
      
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if logout fails on backend, clear local state
      setUser(null)
      setAuthSession(null)
      localStorage.removeItem('auth_token')
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // This would need to be implemented in your backend
      toast.info('Password reset feature coming soon')
      throw new Error('Password reset not yet implemented')
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'Password reset failed'
      }
      setError(authError)
      toast.error(authError.message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updatePassword = async (password: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // This endpoint might need to be added to your backend
      toast.info('Password update feature coming soon')
      throw new Error('Password update not yet implemented')
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'Password update failed'
      }
      setError(authError)
      toast.error(authError.message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await api.user.updateProfile(updates)

      if (response.success && response.data?.profile) {
        const updatedUser = mapApiUserToAuthUser(response.data.profile)
        setUser(updatedUser)
        if (authSession) {
          setAuthSession({
            ...authSession,
            user: updatedUser
          })
        }
        toast.success('Profile updated successfully!')
      } else {
        throw new Error(response.error || 'Profile update failed')
      }
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'Profile update failed'
      }
      setError(authError)
      toast.error(authError.message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const refreshProfile = async () => {
    try {
      const response = await api.user.getProfile()
      if (response.success && response.data?.profile) {
        const refreshedUser = mapApiUserToAuthUser(response.data.profile)
        setUser(refreshedUser)
        if (authSession) {
          setAuthSession({
            ...authSession,
            user: refreshedUser
          })
        }
        console.log('Profile refreshed with backend data:', refreshedUser.email, 'role:', refreshedUser.role)
      }
    } catch (error) {
      console.error('Profile refresh failed:', error)
    }
  }

  const value: AuthContextType = {
    user,
    session: authSession,
    isLoading,
    error,
    isAdmin,
    isSuperAdmin,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}