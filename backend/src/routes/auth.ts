import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { supabase } from '../server';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';

const router = Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('full_name').trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters long'),
  body('company').optional().trim().isLength({ min: 2 }).withMessage('Company name must be at least 2 characters long')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Register endpoint
router.post('/register', registerValidation, async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, full_name, company } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name,
        company: company || null
      },
      email_confirm: true // Auto-confirm for now
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return res.status(400).json({
        error: 'Registration failed',
        message: authError.message
      });
    }

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email,
          full_name,
          company: company || null,
          role: 'user'
        }
      ])
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        error: 'Registration failed',
        message: 'Failed to create user profile'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: authData.user.id,
        email: authData.user.email,
        role: profile.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        company: profile.company,
        role: profile.role,
        created_at: profile.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during registration'
    });
  }
});

// Login endpoint
router.post('/login', loginValidation, async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(500).json({
        error: 'Login failed',
        message: 'Failed to retrieve user profile'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: authData.user.id,
        email: authData.user.email,
        role: profile.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Update last login
    await supabase
      .from('profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', authData.user.id);

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        company: profile.company,
        role: profile.role,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during login'
    });
  }
});

// Admin Login endpoint - separate from regular user login
router.post('/admin/login', loginValidation, async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid admin credentials'
      });
    }

    // Get user profile and verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(500).json({
        error: 'Login failed',
        message: 'Failed to retrieve admin profile'
      });
    }

    // Check if user has admin privileges
    if (!profile.role || !['admin', 'super_admin'].includes(profile.role)) {
      // Sign out the user since they don't have admin access
      await supabase.auth.admin.signOut(authData.user.id);
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin privileges required'
      });
    }

    // Generate JWT token with admin context
    const token = jwt.sign(
      { 
        userId: authData.user.id,
        email: authData.user.email,
        role: profile.role,
        isAdminLogin: true // Flag to indicate this is an admin session
      },
      process.env.JWT_SECRET!,
      { expiresIn: '12h' } // Shorter session for admin security
    );

    // Update last login
    await supabase
      .from('profiles')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id);

    return res.json({
      message: 'Admin login successful',
      token,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        company: profile.company,
        role: profile.role,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        isAdmin: true
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during admin login'
    });
  }
});

// Admin logout endpoint
router.post('/admin/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Verify admin role
    if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin privileges required'
      });
    }

    // Sign out from Supabase
    const { error } = await supabase.auth.admin.signOut(req.user.userId);
    
    if (error) {
      console.error('Admin logout error:', error);
    }

    return res.json({
      message: 'Admin logout successful'
    });

  } catch (error) {
    console.error('Admin logout error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during admin logout'
    });
  }
});

// Google OAuth callback endpoint
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { access_token, id_token } = req.body;

    if (!access_token && !id_token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Google access token or ID token is required'
      });
    }

    // Use ID token first, then fall back to access token
    const googleToken = id_token || access_token;
    
    // Sign in with Google using the token
    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleToken
    });

    if (authError) {
      return res.status(401).json({
        error: 'Bad ID token',
        message: `Google authentication failed: ${authError.message}`
      });
    }

    if (!authData?.user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'No user data received from Google'
      });
    }

    // Get or create profile
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: authData.user.email!,
            full_name: authData.user.user_metadata?.full_name || '',
            avatar_url: authData.user.user_metadata?.avatar_url || null,
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

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: authData.user.id,
        email: authData.user.email,
        role: profile!.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Google login successful',
      token,
      user: {
        id: profile!.id,
        email: profile!.email,
        full_name: profile!.full_name,
        company: profile!.company,
        role: profile!.role,
        avatar_url: profile!.avatar_url,
        created_at: profile!.created_at
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during Google authentication'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.admin.signOut(req.user!.userId);
    
    if (error) {
      console.error('Logout error:', error);
    }

    return res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during logout'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Missing refresh token',
        message: 'Refresh token is required'
      });
    }

    // Refresh token with Supabase
    const { data: authData, error: authError } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (authError || !authData.user || !authData.session) {
      return res.status(401).json({
        error: 'Token refresh failed',
        message: authError?.message || 'Invalid session data'
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(500).json({
        error: 'Profile fetch failed',
        message: 'Failed to retrieve user profile'
      });
    }

    // Generate new JWT token
    const token = jwt.sign(
      { 
        userId: authData.user.id,
        email: authData.user.email,
        role: profile.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Token refreshed successfully',
      token,
      refresh_token: authData.session.refresh_token,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        company: profile.company,
        role: profile.role,
        avatar_url: profile.avatar_url
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during token refresh'
    });
  }
});

// Reset password endpoint
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email } = req.body;

    // Send reset password email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({
        error: 'Password reset failed',
        message: error.message
      });
    }

    return res.json({
      message: 'Password reset email sent successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during password reset'
    });
  }
});

// Get current user endpoint
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user!.userId)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return res.status(500).json({
        error: 'Profile fetch failed',
        message: 'Failed to retrieve user profile'
      });
    }

    return res.json({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        company: profile.company,
        role: profile.role,
        avatar_url: profile.avatar_url,
        phone: profile.phone,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching user data'
    });
  }
});

export default router; 