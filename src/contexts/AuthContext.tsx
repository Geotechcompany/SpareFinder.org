import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiClient, type User as ApiUser, type AuthResponse } from '@/lib/api'
import { toast } from 'sonner'

// Types for compatibility with existing code
interface AuthUser extends ApiUser {
  user_metadata?: {
    full_name?: string
    avatar_url?: string
    subscription_tier?: string
    [key: string]: any
  }
}

interface Session {
  access_token: string
  user: AuthUser
}

interface AuthError {
  message: string
  status?: number
}

interface Profile extends ApiUser {}

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
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

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  // Computed admin role checks
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isSuperAdmin = user?.role === 'super_admin'

  // Check for existing session on mount and listen for auth state changes
  useEffect(() => {
    const checkSession = async () => {
      try {
        // First check for regular API token
        const token = localStorage.getItem('auth_token')
        if (token) {
          const response = await apiClient.getCurrentUser()
          if (response.success && response.data?.user) {
            const authUser = mapApiUserToAuthUser(response.data.user)
            setUser(authUser)
            setSession({
              access_token: token,
              user: authUser
            })
            setIsLoading(false)
            return
          } else {
            // Invalid token, clear it
            localStorage.removeItem('auth_token')
            apiClient.setToken(null)
          }
        }

        // Check for Supabase OAuth session
        const { auth } = await import('../lib/supabase/client')
        const { session } = await auth.getSession()
        
        if (session?.user) {
          console.log('Found existing Supabase session, processing...')
          // Handle OAuth session - create/sync user with backend
          await handleOAuthSession(session)
        } else {
          console.log('No existing session found')
        }
      } catch (error) {
        console.error('Session check failed:', error)
        localStorage.removeItem('auth_token')
        apiClient.setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    // Set up Supabase auth state listener for OAuth
    const setupAuthListener = async () => {
      const { auth } = await import('../lib/supabase/client')
      const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session)
        
        if (event === 'SIGNED_IN' && session?.user) {
          await handleOAuthSession(session)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setSession(null)
          setError(null)
          localStorage.removeItem('auth_token')
          apiClient.setToken(null)
        }
      })
      
      return subscription
    }

    checkSession()
    let authSubscription: any = null
    
    setupAuthListener().then(subscription => {
      authSubscription = subscription
    })

    // Cleanup
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [])

  // Handle OAuth session from Supabase
  const handleOAuthSession = async (supabaseSession: any) => {
    try {
      const supabaseUser = supabaseSession.user
      
      console.log('Processing OAuth session for user:', supabaseUser.email)
      
      // Create or sync user with your backend using direct user data
      const userData = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
        avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || '',
        provider: supabaseUser.app_metadata?.provider || 'google'
      }

      try {
        // First check if profile exists in profiles table
        const { createClient } = await import('../lib/supabase/client')
        const supabase = createClient()
        let existingProfile = null
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
          console.error('Error checking profile:', profileError)
          throw new Error('Failed to check user profile')
        }

        existingProfile = profileData

        // If profile doesn't exist, create it
        if (!existingProfile) {
          console.log('Creating new profile for OAuth user:', userData.email)
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: userData.id,
                email: userData.email,
                full_name: userData.full_name,
                avatar_url: userData.avatar_url,
                role: 'user',
                provider: userData.provider
              }
            ])
            .select()
            .single()

          if (insertError) {
            console.error('Error creating profile:', insertError)
            throw new Error('Failed to create user profile')
          }

          existingProfile = newProfile
        }

        // Create auth user from profile data
        const authUser: AuthUser = {
          id: existingProfile.id,
          email: existingProfile.email,
          role: existingProfile.role,
          full_name: existingProfile.full_name,
          avatar_url: existingProfile.avatar_url,
          created_at: existingProfile.created_at || supabaseUser.created_at,
          user_metadata: {
            full_name: existingProfile.full_name,
            avatar_url: existingProfile.avatar_url,
            subscription_tier: existingProfile.subscription_tier || 'free'
          }
        }
        
        setUser(authUser)
        setSession({
          access_token: supabaseSession.access_token,
          user: authUser
        })
        
        // Set the Supabase access token for API calls
        localStorage.setItem('auth_token', supabaseSession.access_token)
        apiClient.setToken(supabaseSession.access_token)
        
        console.log('OAuth session completed - token set:', supabaseSession.access_token.substring(0, 20) + '...')
        
        // Update profile with latest OAuth data if needed
        if (
          existingProfile.avatar_url !== userData.avatar_url ||
          existingProfile.full_name !== userData.full_name
        ) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              avatar_url: userData.avatar_url,
              full_name: userData.full_name,
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id)

          if (updateError) {
            console.error('Error updating profile:', updateError)
          }
        }
        
        toast.success('Successfully signed in with Google!')
        
      } catch (error) {
        console.error('OAuth profile setup failed:', error)
        toast.error('Failed to setup user profile')
        throw error
      }
    } catch (error) {
      console.error('OAuth session handling failed:', error)
      toast.error('OAuth sign-in failed')
      throw error
    }
  }

  const mapApiUserToAuthUser = (apiUser: ApiUser): AuthUser => {
    return {
      ...apiUser,
      user_metadata: {
        full_name: apiUser.full_name,
        avatar_url: apiUser.avatar_url,
        subscription_tier: 'free', // Default value, can be enhanced later
      }
    }
  }

  const handleAuthSuccess = (authResponse: AuthResponse) => {
    const authUser = mapApiUserToAuthUser(authResponse.user)
    setUser(authUser)
    setSession({
      access_token: authResponse.token,
      user: authUser
    })
    setError(null)
    
    // Ensure the API client has the token
    apiClient.setToken(authResponse.token)
  }

  const signUp = async (email: string, password: string, metadata?: { [key: string]: any }) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.register({
        email,
        password,
        full_name: metadata?.full_name || '',
        company: metadata?.company
      })

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

      const response = await apiClient.login({ email, password })

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
      await apiClient.logout()
      
      // Clear Supabase session if exists  
      try {
        const { auth } = await import('../lib/supabase/client')
        await auth.signOut()
      } catch (supabaseError) {
        console.log('Supabase signout not needed or failed:', supabaseError)
      }
      
      // Clear local state
      setUser(null)
      setSession(null)
      setError(null)
      
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if logout fails on backend, clear local state
      setUser(null)
      setSession(null)
      apiClient.setToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.resetPassword(email)

      if (response.success) {
        toast.success('Password reset email sent!')
      } else {
        throw new Error(response.error || 'Password reset failed')
      }
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

      const response = await apiClient.updateProfile(updates)

      if (response.success && response.data?.user) {
        const updatedUser = mapApiUserToAuthUser(response.data.user)
        setUser(updatedUser)
        if (session) {
          setSession({
            ...session,
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
      const response = await apiClient.getCurrentUser()
      if (response.success && response.data?.user) {
        const refreshedUser = mapApiUserToAuthUser(response.data.user)
        setUser(refreshedUser)
        if (session) {
          setSession({
            ...session,
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
    session,
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