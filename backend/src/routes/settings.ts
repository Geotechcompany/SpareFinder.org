import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { supabase } from '../server';

const router = Router();

// Default settings structure
const defaultSettings = {
  notifications: {
    email: true,
    push: true,
    marketing: false
  },
  privacy: {
    profileVisibility: 'private' as 'public' | 'private',
    dataSharing: false
  },
  preferences: {
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'en',
    timezone: 'UTC'
  }
};

// Get user settings
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({
        error: 'Failed to fetch settings'
      });
    }

    // Merge with default settings
    const userSettings = profile?.preferences || {};
    const settings = {
      notifications: {
        ...defaultSettings.notifications,
        ...userSettings.notifications
      },
      privacy: {
        ...defaultSettings.privacy,
        ...userSettings.privacy
      },
      preferences: {
        ...defaultSettings.preferences,
        ...userSettings.preferences
      }
    };

    return res.json({
      settings
    });

  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({
      error: 'Failed to fetch settings'
    });
  }
});

// Update user settings
router.patch('/', authenticateToken, [
  body('notifications.email').optional().isBoolean(),
  body('notifications.push').optional().isBoolean(),
  body('notifications.marketing').optional().isBoolean(),
  body('privacy.profileVisibility').optional().isIn(['public', 'private']),
  body('privacy.dataSharing').optional().isBoolean(),
  body('preferences.theme').optional().isIn(['light', 'dark', 'system']),
  body('preferences.language').optional().isLength({ min: 2, max: 5 }),
  body('preferences.timezone').optional().isString()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user!.userId;
    const newSettings = req.body;

    // Get current settings
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching current settings:', fetchError);
      return res.status(500).json({
        error: 'Failed to fetch current settings'
      });
    }

    const currentSettings = profile?.preferences || {};

    // Deep merge settings
    const updatedSettings = {
      notifications: {
        ...currentSettings.notifications,
        ...newSettings.notifications
      },
      privacy: {
        ...currentSettings.privacy,
        ...newSettings.privacy
      },
      preferences: {
        ...currentSettings.preferences,
        ...newSettings.preferences
      }
    };

    // Update in database
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ preferences: updatedSettings })
      .eq('id', userId)
      .select('preferences')
      .single();

    if (updateError) {
      console.error('Error updating settings:', updateError);
      return res.status(500).json({
        error: 'Failed to update settings'
      });
    }

    return res.json({
      message: 'Settings updated successfully',
      settings: updatedProfile.preferences
    });

  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({
      error: 'Failed to update settings'
    });
  }
});

// Reset settings to default
router.post('/reset', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({ preferences: defaultSettings })
      .eq('id', userId)
      .select('preferences')
      .single();

    if (error) {
      console.error('Error resetting settings:', error);
      return res.status(500).json({
        error: 'Failed to reset settings'
      });
    }

    return res.json({
      message: 'Settings reset to default successfully',
      settings: updatedProfile.preferences
    });

  } catch (error) {
    console.error('Reset settings error:', error);
    return res.status(500).json({
      error: 'Failed to reset settings'
    });
  }
});

export default router; 