import { Response, NextFunction } from 'express';
import { supabase } from '../server';
import { AuthRequest } from '../types/auth';

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Auth Check - Token Present:', !!token);

    if (!token) {
      console.warn('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Authentication token is required'
      });
    }

    // Use Supabase to verify the token
    console.log('🔍 Verifying token with Supabase...');
    
    // Try to get user with the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
          
    if (authError || !user) {
      console.warn('❌ Supabase token verification failed:', authError?.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Authentication token is invalid or expired. Please log in again.'
      });
    }

          console.log('✅ Supabase User Verified:', {
            id: user.id,
      email: user.email
          });

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('🆕 Creating profile for user:', user.email);
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([{
                id: user.id,
                email: user.email!,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          company: user.user_metadata?.company || null,
                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          role: 'user', // Default role for new users
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
              }])
              .select()
              .single();

            if (createError) {
        console.error('❌ Profile creation error:', createError);
        return res.status(500).json({
          success: false,
          error: 'Profile creation failed',
          message: 'Failed to create user profile'
        });
          }

      req.user = {
            userId: user.id,
            email: user.email || '',
        role: newProfile.role || 'user'
          };
    } else if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      return res.status(500).json({
        success: false,
        error: 'Profile fetch failed',
        message: 'Failed to retrieve user profile'
      });
    } else {
      req.user = {
        userId: user.id,
        email: user.email || '',
        role: profile.role || 'user'
      };
        }

    console.log('🎉 User Successfully Authenticated:', req.user);
        return next();

  } catch (error) {
    console.error('🚨 Unexpected Authentication Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in first'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'You do not have permission to access this resource'
      });
    }

    return next();
  };
};

export const requireAdmin = requireRole(['admin', 'super_admin']);
export const requireSuperAdmin = requireRole(['super_admin']);

// Middleware specifically for admin console access
export const requireAdminLogin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in first'
    });
  }

  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Admin privileges required'
    });
  }

  return next();
}; 