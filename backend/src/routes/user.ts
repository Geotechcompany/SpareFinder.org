import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../server';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';

const router = Router();

// Get user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
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
      profile: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
        phone: profile.phone,
        company: profile.company,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching profile'
    });
  }
});

// Update user profile
router.put('/profile', [
  authenticateToken,
  body('full_name').optional().trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters long'),
  body('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  body('phone').optional().trim().isMobilePhone('any').withMessage('Please provide a valid phone number'),
  body('website').optional().trim().isURL().withMessage('Please provide a valid website URL'),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { full_name, username, phone, company, bio, location, website } = req.body;

    // Check if username is already taken (if provided)
    if (username) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', req.user!.userId)
        .single();

      if (existingUser) {
        return res.status(409).json({
          error: 'Username taken',
          message: 'This username is already in use'
        });
      }
    }

    // Update profile
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        full_name,
        username,
        phone,
        company,
        bio,
        location,
        website,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user!.userId)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({
        error: 'Profile update failed',
        message: 'Failed to update profile'
      });
    }

    return res.json({
      message: 'Profile updated successfully',
      profile: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        username: updatedProfile.username,
        full_name: updatedProfile.full_name,
        avatar_url: updatedProfile.avatar_url,
        role: updatedProfile.role,
        phone: updatedProfile.phone,
        company: updatedProfile.company,
        bio: updatedProfile.bio,
        location: updatedProfile.location,
        website: updatedProfile.website,
        updated_at: updatedProfile.updated_at
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while updating profile'
    });
  }
});

// Get user's search history
router.get('/searches', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data: searches, error, count } = await supabase
      .from('part_searches')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user!.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Searches fetch error:', error);
      return res.status(500).json({
        error: 'Searches fetch failed',
        message: 'Failed to retrieve search history'
      });
    }

    return res.json({
      searches,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get searches error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching searches'
    });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Delete user from Supabase Auth (this will cascade delete profile due to foreign key)
    const { error } = await supabase.auth.admin.deleteUser(req.user!.userId);

    if (error) {
      console.error('Account deletion error:', error);
      return res.status(500).json({
        error: 'Account deletion failed',
        message: 'Failed to delete account'
      });
    }

    return res.json({
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while deleting account'
    });
  }
});

export default router; 