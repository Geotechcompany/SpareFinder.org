import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../server';
import { AuthRequest, JWTPayload } from '../types/auth';

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Auth check - hasToken:', !!token);

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // First try to verify as our custom JWT
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      
      // Verify user still exists and is active
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', decoded.userId)
        .single();

      if (error || !profile) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'User not found or inactive'
        });
      }

      // Add user info to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      return next();
    } catch (jwtError) {
      console.log('JWT verification failed, trying Supabase token...');
      
      // If JWT fails, try to verify as Supabase token
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
          console.log('Supabase token verification failed:', error?.message);
          return res.status(403).json({ 
            error: 'Invalid token', 
            message: 'Token is not valid' 
          });
        }

        // Get user profile from database, create if doesn't exist
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // If profile doesn't exist, create it (common for OAuth users)
        if (profileError && profileError.code === 'PGRST116') {
          console.log('Creating profile for OAuth user:', user.email);
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                id: user.id,
                email: user.email!,
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                role: 'user'
              }
            ])
            .select()
            .single();

          if (createError) {
            console.error('Profile creation error:', createError);
            return res.status(500).json({
              error: 'Profile creation failed',
              message: 'Failed to create user profile'
            });
          }

          profile = newProfile;
        } else if (profileError) {
          console.error('Profile fetch error:', profileError);
          return res.status(500).json({
            error: 'Profile fetch failed',
            message: 'Failed to retrieve user profile'
          });
        }

        req.user = {
          userId: user.id,
          email: user.email || '',
          role: profile?.role || 'user'
        };
        
        console.log('Supabase token verified for user:', user.email);
        return next();
      } catch (supabaseError) {
        console.log('Supabase token verification error:', supabaseError);
        return res.status(403).json({ 
          error: 'Invalid token', 
          message: 'Token is not valid' 
        });
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
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