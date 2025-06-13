import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { auth, db, Profile, AuthUser } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  error: AuthError | null
  signUp: (email: string, password: string, metadata?: { [key: string]: any }) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithOAuth: (provider: 'google' | 'github' | 'discord') => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  refreshProfile: () => Promise<void>
}

// Create and export the context
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create and export the hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Create and export the provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      try {
        const { session, error } = await auth.getSession()
        if (error) {
          console.warn('Session check error:', error)
          setUser(null)
          setSession(null)
          return
        }
        
        if (session) {
          await handleUserSession(session)
        } else {
          setUser(null)
          setSession(null)
        }
      } catch (error) {
        console.error('Error checking session:', error)
        setUser(null)
        setSession(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Subscribe to auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      setIsLoading(true)
      try {
        if (session) {
          await handleUserSession(session)
        } else {
          setUser(null)
          setSession(null)
        }
      } catch (error) {
        console.error('Error handling auth change:', error)
        setUser(null)
        setSession(null)
      } finally {
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleUserSession = async (session: Session) => {
    try {
      // Always set basic user info first to ensure authentication works
      const basicUser: AuthUser = {
        id: session.user.id,
        email: session.user.email!,
        role: 'user',
        user_metadata: session.user.user_metadata,
      }
      
      setUser(basicUser)
      setSession(session)

      // Try to get/create profile, but don't block authentication if it fails
      try {
        const { data: profile, error: profileError } = await db.profiles.get(session.user.id)
        
        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.warn('Profile fetch error (non-critical):', profileError)
        }

        // If no profile exists, try to create one
        if (!profile) {
          const newProfile: Omit<Profile, 'created_at' | 'updated_at'> = {
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '',
            avatar_url: session.user.user_metadata?.avatar_url || '',
            role: 'user', // Default role
          }

          const { data: createdProfile, error: createError } = await db.profiles.create(newProfile)
          
          if (createError) {
            console.warn('Profile creation error (non-critical):', createError)
          } else if (createdProfile) {
            setUser(prev => prev ? {
              ...prev,
              role: createdProfile.role,
              profile: createdProfile,
            } : basicUser)
          }
        } else {
          setUser(prev => prev ? {
            ...prev,
            role: profile.role,
            profile,
          } : basicUser)
        }
      } catch (profileErr) {
        console.warn('Profile operations failed (non-critical):', profileErr)
        // Continue with basic user info - authentication still works
      }

    } catch (err) {
      console.error('Critical session handling error:', err)
      // Set basic user info even if everything else fails
      setUser({
        id: session.user.id,
        email: session.user.email!,
        role: 'user',
        user_metadata: session.user.user_metadata,
      })
      setSession(session)
    }
  }

  const signUp = async (email: string, password: string, metadata?: { [key: string]: any }) => {
    try {
      setError(null)
      setIsLoading(true)
      
      const { data, error } = await auth.signUp(email, password, metadata)
      
      if (error) {
        setError(error)
        toast.error(error.message || 'Failed to sign up')
        throw error
      }

      if (data.user && !data.user.email_confirmed_at) {
        toast.success('Please check your email for verification link')
      } else {
        toast.success('Account created successfully!')
      }
    } catch (err) {
      console.error('Sign up error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      setIsLoading(true)
      
      const { data, error } = await auth.signIn(email, password)
      
      if (error) {
        setError(error)
        toast.error(error.message || 'Failed to sign in')
        throw error
      }

      if (data?.session) {
        await handleUserSession(data.session)
        toast.success('Welcome back!')
      } else {
        throw new Error('No session returned from sign in')
      }
    } catch (err) {
      console.error('Sign in error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithOAuth = async (provider: 'google' | 'github' | 'discord') => {
    try {
      setError(null)
      setIsLoading(true)
      
      const { data, error } = await auth.signInWithOAuth(provider)
      
      if (error) {
        setError(error)
        toast.error(error.message || 'Failed to sign in with OAuth')
        throw error
      }
    } catch (err) {
      console.error('OAuth sign in error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      const { error } = await auth.signOut()
      if (error) throw error
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setError(null)
      
      const { data, error } = await auth.resetPassword(email)
      
      if (error) {
        setError(error)
        toast.error(error.message || 'Failed to send reset email')
        throw error
      }

      toast.success('Password reset email sent!')
    } catch (err) {
      console.error('Reset password error:', err)
      throw err
    }
  }

  const updatePassword = async (password: string) => {
    try {
      setError(null)
      
      const { data, error } = await auth.updatePassword(password)
      
      if (error) {
        setError(error)
        toast.error(error.message || 'Failed to update password')
        throw error
      }

      toast.success('Password updated successfully!')
    } catch (err) {
      console.error('Update password error:', err)
      throw err
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      throw new Error('No user logged in')
    }

    try {
      setError(null)
      
      const { data, error } = await db.profiles.update(user.id, updates)
      
      if (error) {
        console.error('Profile update error:', error)
        toast.error(error.message || 'Failed to update profile')
        throw error
      }

      // Update local user state
      if (data && user.profile) {
        const updatedProfile = { ...user.profile, ...data } as Profile
        setUser(prev => prev ? {
          ...prev,
          profile: updatedProfile,
        } : null)
      }

      toast.success('Profile updated successfully!')
    } catch (err) {
      console.error('Update profile error:', err)
      throw err
    }
  }

  const refreshProfile = async () => {
    if (!user) return

    try {
      const { data: profile, error } = await db.profiles.get(user.id)
      
      if (error) {
        console.error('Refresh profile error:', error)
        return
      }

      if (profile) {
        setUser(prev => prev ? {
          ...prev,
          role: profile.role,
          profile,
        } : null)
      }
    } catch (err) {
      console.error('Refresh profile error:', err)
    }
  }

  const value = {
    user,
    session,
    isLoading,
    error,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}