import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { auth, db, Profile, AuthUser } from '@/lib/supabase'
import { toast } from 'sonner'

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
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

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { session, error: sessionError } = await auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError)
          setLoading(false)
          return
        }

        if (session?.user) {
          await handleUserSession(session)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        setError(err as AuthError)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          await handleUserSession(session)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        setError(null)
      }
      
      if (event !== 'INITIAL_SESSION') {
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleUserSession = async (session: Session) => {
    setSession(session)
    
    try {
      // Get or create user profile
      const { data: profile, error: profileError } = await db.profiles.get(session.user.id)
      
      if (profileError && profileError.code !== 'PGSQL_ERROR') {
        console.error('Profile fetch error:', profileError)
      }

      // If no profile exists, create one
      if (!profile) {
        const newProfile: Omit<Profile, 'created_at' | 'updated_at'> = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || '',
          username: session.user.user_metadata?.username || '',
          avatar_url: session.user.user_metadata?.avatar_url || '',
          role: 'user', // Default role
        }

        const { data: createdProfile, error: createError } = await db.profiles.create(newProfile)
        
        if (createError) {
          console.error('Profile creation error:', createError)
          // Continue without profile if creation fails
        }

        const fallbackProfile: Profile = {
          ...newProfile,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: 'user',
          profile: createdProfile || fallbackProfile,
        })
      } else {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: profile.role,
          profile,
        })
      }
    } catch (err) {
      console.error('Profile handling error:', err)
      // Set basic user info even if profile operations fail
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        role: 'user',
      })
    }
  }

  const signUp = async (email: string, password: string, metadata?: { [key: string]: any }) => {
    try {
      setError(null)
      setLoading(true)
      
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
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      
      const { data, error } = await auth.signIn(email, password)
      
      if (error) {
        setError(error)
        toast.error(error.message || 'Failed to sign in')
        throw error
      }

      toast.success('Welcome back!')
    } catch (err) {
      console.error('Sign in error:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signInWithOAuth = async (provider: 'google' | 'github' | 'discord') => {
    try {
      setError(null)
      setLoading(true)
      
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
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      setLoading(true)
      
      const { error } = await auth.signOut()
      
      if (error) {
        setError(error)
        toast.error(error.message || 'Failed to sign out')
        throw error
      }

      toast.success('Signed out successfully')
    } catch (err) {
      console.error('Sign out error:', err)
      throw err
    } finally {
      setLoading(false)
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

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
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

export default AuthProvider 