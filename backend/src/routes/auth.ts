import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../server';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';

const router = Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Full name must be at least 2 characters long'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('company').optional().trim().isLength({ min: 2 }).withMessage('Company name must be at least 2 characters long')
].concat([
  // Custom validation to ensure either 'name' or 'full_name' is provided
  body().custom((body) => {
    if (!body.full_name && !body.name) {
      throw new Error('Either full_name or name is required');
    }
    if (body.full_name && body.full_name.trim().length < 2) {
      throw new Error('Full name must be at least 2 characters long');
    }
    if (body.name && body.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }
    return true;
  })
]);

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
        success: false,
        error: 'Validation failed',
        message: errors.array()[0].msg
      });
    }

    const { 
      email, 
      password, 
      full_name = '', 
      name = '', 
      company = null 
    } = req.body;

    // Use full_name if provided, otherwise use name (for backward compatibility)
    const userName = full_name || name || 'User';

    console.log('📝 Registration request:', {
      email,
      userName,
      company: company || 'None',
      hasPassword: !!password
    });

    // Check if profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (profileCheckError && profileCheckError.code !== 'PGRST116') { 
      console.error('Profile check error:', profileCheckError);
      return res.status(500).json({
        success: false,
        error: 'Registration failed',
        message: 'Failed to check existing profile'
      });
    }

    // If profile exists, return error
    if (existingProfile) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userName,
          company: company || null
        }
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      
      // Handle specific error types
      let errorMessage = 'Registration failed. Please try again.';
      
      if (authError.message?.includes('Password should contain')) {
        errorMessage = 'Password must contain at least: one lowercase letter, one uppercase letter, one number, and one special character (!@#$%^&*).';
      } else if (authError.message?.includes('Email address')) {
        errorMessage = 'Please use a valid email address format (e.g., user@domain.com).';
      } else if (authError.message?.includes('weak_password')) {
        errorMessage = 'Password is too weak. Please use a stronger password with mixed case letters, numbers, and special characters.';
      } else {
        errorMessage = authError.message || 'Registration failed. Please try again.';
      }
      
      return res.status(400).json({
        success: false,
        error: 'Registration failed',
        message: errorMessage
      });
    }

    // Ensure we have a user ID
    if (!authData?.user?.id) {
      return res.status(500).json({
        success: false,
        error: 'Registration failed',
        message: 'Failed to create user account'
      });
    }

    // Create profile 
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: userName,
        company: company || null,
        role: 'user', // Default role for new registrations
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // Clean up auth user if profile creation fails
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      
      return res.status(500).json({
        success: false,
        error: 'Registration failed',
        message: 'Failed to create user profile'
      });
    }

    // Return the Supabase session token
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
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
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred during registration'
    });
  }
});

// Login endpoint
router.post('/login', loginValidation, async (req: Request, res: Response) => {
  try {
    console.log('🔐 Login Request Received:', {
      email: req.body.email,
      hasPassword: !!req.body.password
    });

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('🚫 Login Validation Error:', errors.array());
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: errors.array()[0].msg
      });
    }

    const { email, password } = req.body;

    // Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('🔒 Login Authentication Error:', authError);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: authError.message || 'Invalid email or password'
      });
    }

    if (!authData.session?.access_token) {
      return res.status(500).json({
        success: false,
        error: 'Login failed',
        message: 'Failed to create session'
      });
    }

    // Fetch user profile with more robust error handling
    let userProfile: any = null;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('👤 Profile Fetch Error:', profileError);
      
      // Create profile if it doesn't exist
      const { data: newProfile, error: newProfileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User',
          company: authData.user.user_metadata?.company || null,
          avatar_url: authData.user.user_metadata?.avatar_url || authData.user.user_metadata?.picture || null,
          role: 'user', // Default role for new profiles
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (newProfileError) {
        console.error('Failed to create profile:', newProfileError);
        return res.status(500).json({
          success: false,
          error: 'Login failed',
          message: 'Unable to create user profile'
        });
      }

      userProfile = newProfile;
    } else {
      userProfile = profile;
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.full_name,
        company: userProfile.company,
        role: userProfile.role || 'user',
        created_at: userProfile.created_at
      }
    });

  } catch (error) {
    console.error('Unexpected login error:', error);
    return res.status(500).json({
      success: false,
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
      await supabase.auth.signOut();
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin privileges required'
      });
    }

    // Update last login
    await supabase
      .from('profiles')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id);

    return res.json({
      message: 'Admin login successful',
      token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
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
    const { error } = await supabase.auth.signOut();
    
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
      console.error('Supabase Google auth error:', authError);
      return res.status(401).json({
        error: 'Bad ID token',
        message: `Google authentication failed: ${authError.message}`
      });
    }

    if (!authData?.user) {
      console.error('No user data from Supabase Google auth');
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

    return res.json({
      message: 'Google login successful',
      token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
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
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
    }
    
    console.log('✅ User logged out successfully:', {
      userId: req.user?.userId,
      email: req.user?.email
    });

    return res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
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

    // Refresh the session with Supabase
    const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (refreshError) {
      console.error('Token refresh error:', refreshError);
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Token is invalid or expired'
      });
    }

    if (!sessionData.session) {
      return res.status(401).json({
        error: 'Refresh failed',
        message: 'Unable to refresh session'
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionData.user?.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(401).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
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

// Get current user profile
router.get('/current-user', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // The authenticateToken middleware should have added the userId to the request
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid user authentication'
      });
    }

    // Fetch user profile with more robust error handling
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('👤 Current User Profile Fetch Error:', profileError);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Unable to retrieve user profile'
      });
    }

    // Return user profile without sensitive information
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          company: profile.company,
          role: profile.role,
          created_at: profile.created_at,
          avatar_url: profile.avatar_url
        }
      }
    });
  } catch (error) {
    console.error('Current User Retrieval Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving user profile'
    });
  }
});

export default router; 