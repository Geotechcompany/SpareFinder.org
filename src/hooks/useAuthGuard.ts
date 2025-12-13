import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface AuthGuardOptions {
  requiredRole?: 'user' | 'admin'
  redirectTo?: string
  showToast?: boolean
}

export const useAuthGuard = (options: AuthGuardOptions = {}) => {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    requiredRole,
    redirectTo = '/login',
    showToast = true,
  } = options

  useEffect(() => {
    if (isLoading) return

    // Check if user is authenticated
    if (!user) {
      if (showToast) {
        toast.error('Please sign in to access this page')
      }
      navigate(redirectTo, { 
        state: { from: location },
        replace: true 
      })
      return
    }

    // Check role requirements
    if (requiredRole && user.role !== requiredRole) {
      if (showToast) {
        toast.error('You do not have permission to access this page')
      }
      navigate('/dashboard', { replace: true })
      return
    }
  }, [user, isLoading, requiredRole, redirectTo, showToast, navigate, location])

  return {
    user,
    loading: isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    hasRole: (role: 'user' | 'admin') => user?.role === role,
  }
}

export const usePermissions = () => {
  const { user } = useAuth()

  return {
    canAccessAdmin: user?.role === 'admin',
    canUploadFiles: !!user,
    canViewHistory: !!user,
    canManageProfile: !!user,
    canAccessBilling: !!user,
    isLoggedIn: !!user,
  }
}

export default useAuthGuard 