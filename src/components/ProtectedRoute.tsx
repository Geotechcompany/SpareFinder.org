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
  const { user, isLoading, isAuthenticated, isAdmin, isSuperAdmin } = useAuth()
  const location = useLocation()

  // Wait for Clerk (and profile hydration when signed in) before routing decisions.
  if (requireAuth && isLoading) {
    return <SpinningLogoLoader label="Loading…" />
  }

  if (requireAuth && !isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    )
  }

  // Signed-in session can hydrate before the app profile is available.
  if (requireAuth && isAuthenticated && !user) {
    return <SpinningLogoLoader label="Loading profile…" />
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

  // Signed-in users should not stay on login/register
  if (
    !requireAuth &&
    isAuthenticated &&
    (location.pathname === '/login' || location.pathname === '/register')
  ) {
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