import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'super_admin';
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ 
  children, 
  requiredRole = 'admin' 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      console.log('🛡️ Admin Auth Check Started');
      setIsLoading(true);
      setError(null);

      // Check if we have a token
      const token = localStorage.getItem('auth_token');
      console.log('🛡️ Auth Token Present:', !!token);
      if (!token) {
        console.log('🛡️ No auth token found');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Check if we have admin session info
      const adminSessionStr = localStorage.getItem('admin_session');
      const adminSession = adminSessionStr ? JSON.parse(adminSessionStr) : null;
      
      console.log('🛡️ Admin Session:', {
        exists: !!adminSession,
        isAdminLogin: adminSession?.isAdminLogin,
        role: adminSession?.role
      });
      
      if (!adminSession || !adminSession.isAdminLogin) {
        console.log('🛡️ Invalid admin session');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Verify the token is still valid by calling the API
      console.log('🛡️ Verifying user profile');
      const response = await api.user.getProfile();
      
      console.log('🛡️ Profile Response:', {
        success: response.success,
        data: response.data
      });
      
      // More flexible profile validation
      const user = response.data;
      
      console.log('🛡️ Extracted User:', user);
      
      if (response.success && user) {
        console.log('🛡️ User Profile:', {
          id: user.id,
          email: user.email,
          role: user.role
        });
        
        setUserRole(user.role);
        
        // Check if user has required admin role
        const hasRequiredRole = requiredRole === 'super_admin' 
          ? user.role === 'super_admin'
          : ['admin', 'super_admin'].includes(user.role);
        
        console.log('🛡️ Role Check:', {
          requiredRole,
          userRole: user.role,
          hasRequiredRole
        });
        
        if (hasRequiredRole) {
          setIsAuthenticated(true);
        } else {
          console.log('🛡️ Insufficient admin privileges');
          setError('Insufficient admin privileges');
          setIsAuthenticated(false);
        }
      } else {
        console.log('🛡️ Invalid token or profile');
        // Token is invalid, clear admin session
        localStorage.removeItem('admin_session');
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('🛡️ Admin Auth Check Failed:', err);
      // Clear invalid session data
      localStorage.removeItem('admin_session');
      localStorage.removeItem('auth_token');
      setError('Authentication verification failed');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900/20 to-orange-900/20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900/20 to-orange-900/20">
        <Card className="w-full max-w-md mx-4 bg-black/40 backdrop-blur-xl border-red-500/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-red-200">
              Access Denied
            </CardTitle>
            <CardDescription className="text-gray-400">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-400 text-sm">
              You need admin privileges to access this area.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.href = '/admin/login'}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin Login
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to admin login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
};

export default AdminProtectedRoute; 