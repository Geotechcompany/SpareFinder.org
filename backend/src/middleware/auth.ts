import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../server';
import { AuthRequest, JWTPayload } from '../types/auth';

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Auth Check - Token Present:', !!token);
    console.log('🔐 Full Authorization Header:', authHeader);

    if (!token) {
      console.warn('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Authentication token is required'
      });
    }

    // Enhanced logging for token verification
    const verificationAttempts = [
      // 1. Supabase Token Verification
      async () => {
        try {
          console.log('🔍 Attempting Supabase Token Verification');
          const { data: { user }, error: supabaseError } = await supabase.auth.getUser(token);
          
          if (supabaseError) {
            console.warn('❌ Supabase Token Error:', supabaseError);
            return null;
          }

          if (!user) {
            console.warn('❌ No Supabase User Found');
            return null;
          }

          // Detailed Supabase user logging
          console.log('✅ Supabase User Verified:', {
            id: user.id,
            email: user.email,
            metadata: Object.keys(user.user_metadata || {})
          });

          // Get or create profile with more robust error handling
          let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            console.log('🆕 Creating Profile for New Supabase User');
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([{
                id: user.id,
                email: user.email!,
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                role: 'user'
              }])
              .select()
              .single();

            if (createError) {
              console.error('❌ Profile Creation Error:', createError);
              return null;
            }

            profile = newProfile;
          }

          return {
            userId: user.id,
            email: user.email || '',
            role: profile?.role || 'user'
          };
        } catch (error) {
          console.error('❌ Supabase Token Verification Unexpected Error:', error);
          return null;
        }
      },

      // 2. Custom JWT Token Verification
      async () => {
        try {
          console.log('🔍 Attempting Custom JWT Token Verification');
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
          
          console.log('✅ JWT Token Decoded:', {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
          });

          // Verify user still exists and is active
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, email, role')
            .eq('id', decoded.userId)
            .single();

          if (error || !profile) {
            console.warn('❌ JWT User Verification Failed:', error);
            return null;
          }

          return {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role || profile.role
          };
        } catch (error) {
          console.warn('❌ JWT Verification Failed:', error);
          return null;
        }
      }
    ];

    // Try verification methods sequentially with detailed logging
    for (const verify of verificationAttempts) {
      const verifiedUser = await verify();
      
      if (verifiedUser) {
        console.log('🎉 User Successfully Authenticated:', verifiedUser);
        req.user = verifiedUser;
        return next();
      }
    }

    // If all verification methods fail
    console.error('❌ All Token Verification Methods Failed');
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Authentication token is invalid or expired. Please log in again.'
    });
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

// Middleware specifically for admin console access (requires admin login)
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

  // For enhanced security, we can check if this was an admin login session
  // This is optional but adds an extra layer of security
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      // If isAdminLogin flag is present and false, require admin login
      if (decoded.isAdminLogin === false) {
        return res.status(403).json({
          error: 'Admin login required',
          message: 'Please use admin login for console access'
        });
      }
    } catch (error) {
      // Token verification already handled by authenticateToken middleware
    }
  }

  return next();
}; 