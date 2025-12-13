import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { SpinningLogoLoader } from "@/components/brand/spinning-logo-loader";

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredRole?: 'user' | 'admin'
  redirectTo?: string
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredRole,
  redirectTo = '/login',
}) => {
  const { user, isLoading, isAdmin, isSuperAdmin } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <SpinningLogoLoader label="Loading…" />
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    )
  }

  // If specific role is required but user doesn't have it
  if (requiredRole && (!user || (requiredRole === 'admin' && !isAdmin))) {
    return (
      <Navigate
        to="/unauthorized"
        state={{ from: location, requiredRole }}
        replace
      />
    )
  }

  // If user is logged in but trying to access login/register pages
  if (!requireAuth && user && (location.pathname === '/login' || location.pathname === '/register')) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    )
  }

  return <>{children}</>
}

export default ProtectedRoute 