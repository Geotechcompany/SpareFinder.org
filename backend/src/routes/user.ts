import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../server';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';

const router = Router();

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

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
        preferences: profile.preferences,
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
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
  // preferences is a JSON blob; validate lightly so we don't reject future keys
  body('preferences').optional()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { full_name, username, phone, company, bio, location, website, preferences } = req.body;

    // Merge preferences so partial updates don't clobber existing values.
    let mergedPreferences: unknown = undefined;
    if (typeof preferences !== "undefined") {
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", req.user!.userId)
        .single();

      const currentPreferences = (currentProfile as any)?.preferences;
      if (isPlainObject(currentPreferences) && isPlainObject(preferences)) {
        const currentOnboarding = (currentPreferences as any).onboarding;
        const nextOnboarding = (preferences as any).onboarding;

        mergedPreferences = {
          ...currentPreferences,
          ...preferences,
          ...(isPlainObject(currentOnboarding) && isPlainObject(nextOnboarding)
            ? { onboarding: { ...currentOnboarding, ...nextOnboarding } }
            : {}),
        };
      } else {
        mergedPreferences = preferences;
      }
    }

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
        ...(typeof mergedPreferences !== "undefined" ? { preferences: mergedPreferences } : {}),
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
        preferences: updatedProfile.preferences,
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

// Store onboarding survey submission (for admin analysis)
router.post(
  "/onboarding-survey",
  [
    authenticateToken,
    body("company").optional().trim().isLength({ min: 1 }).withMessage("Company is required"),
    body("role").optional().isString(),
    body("companySize").optional().isString(),
    body("primaryGoal").optional().isString(),
    body("interests").optional().isArray(),
    body("referralSource").trim().isLength({ min: 1 }).withMessage("Referral source is required"),
    body("referralSourceOther").optional().isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const {
        company,
        role,
        companySize,
        primaryGoal,
        interests,
        referralSource,
        referralSourceOther,
      } = req.body ?? {};

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", req.user!.userId)
        .single();

      const metadata = {
        user_agent: req.headers["user-agent"] || null,
        origin: req.headers["origin"] || null,
        referer: req.headers["referer"] || null,
        ip: req.ip || null,
        submitted_via: "post_onboarding_v1",
      };

      const { error } = await supabase.from("onboarding_surveys").insert({
        user_id: req.user!.userId,
        email: (profile as any)?.email ?? null,
        company: typeof company === "string" ? company : null,
        role: typeof role === "string" ? role : null,
        company_size: typeof companySize === "string" ? companySize : null,
        primary_goal: typeof primaryGoal === "string" ? primaryGoal : null,
        interests: Array.isArray(interests)
          ? interests.filter((v: unknown) => typeof v === "string")
          : null,
        referral_source: referralSource,
        referral_source_other:
          typeof referralSourceOther === "string" ? referralSourceOther : null,
        metadata,
      });

      if (error) {
        console.error("Onboarding survey insert error:", error);
        return res.status(500).json({
          success: false,
          error: "Survey insert failed",
          message: "Failed to store onboarding survey",
        });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Onboarding survey error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred while storing onboarding survey",
      });
    }
  }
);

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