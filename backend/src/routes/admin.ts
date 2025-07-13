import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../server';
import { authenticateToken, requireAdmin, requireSuperAdmin } from '../middleware/auth';
import { AuthRequest } from '../types/auth';

const router = Router();

// Get all users (admin only)
router.get('/users', [authenticateToken, requireAdmin], async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const roleFilter = req.query.role as string;
    const offset = (page - 1) * limit;

    console.log('📋 Fetching users with filters:', { page, limit, search, roleFilter });

    // First, ensure all auth.users are synced to profiles
    await syncAuthUsersToProfiles();

    // Try the admin_user_management view first
    let query = supabase
      .from('admin_user_management')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply search filter if provided
    if (search && search.trim()) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,company.ilike.%${search}%`);
    }

    // Apply role filter if provided
    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Admin view error:', error);
      console.log('📋 Falling back to enhanced profiles query...');
      
      // Enhanced fallback query with auth.users data
      const { data: profilesWithAuth, error: enhancedError, count: enhancedCount } = await supabase
        .rpc('get_users_with_stats', {
          search_term: search || '',
          role_filter: roleFilter === 'all' ? '' : roleFilter || '',
          offset_val: offset,
          limit_val: limit
        });

      if (enhancedError) {
        console.error('Enhanced query failed, using basic profiles:', enhancedError);
        
        // Basic fallback to profiles table
        let fallbackQuery = supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (search && search.trim()) {
          fallbackQuery = fallbackQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,company.ilike.%${search}%`);
        }

        if (roleFilter && roleFilter !== 'all') {
          fallbackQuery = fallbackQuery.eq('role', roleFilter);
        }

        fallbackQuery = fallbackQuery.range(offset, offset + limit - 1);

        const { data: fallbackUsers, error: fallbackError, count: fallbackCount } = await fallbackQuery;

        if (fallbackError) {
          console.error('All fallbacks failed:', fallbackError);
          return res.status(500).json({
            success: false,
            error: 'Users fetch failed',
            message: 'Failed to retrieve users from database'
          });
        }

        return res.json({
          success: true,
          data: {
            users: fallbackUsers || [],
            pagination: {
              page,
              limit,
              total: fallbackCount || 0,
              pages: Math.ceil((fallbackCount || 0) / limit)
            }
          }
        });
      }

      return res.json({
        success: true,
        data: {
          users: profilesWithAuth || [],
          pagination: {
            page,
            limit,
            total: enhancedCount || 0,
            pages: Math.ceil((enhancedCount || 0) / limit)
          }
        }
      });
    }

    console.log('📋 Successfully fetched users from view:', users?.length || 0);

    return res.json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching users'
    });
  }
});

// Helper function to sync auth.users to profiles
async function syncAuthUsersToProfiles() {
  try {
    console.log('🔄 Syncing auth.users to profiles...');
    
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return;
    }

    // Sync each user to profiles - only create new profiles, don't overwrite existing ones
    for (const user of authUsers.users) {
      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`Error checking existing profile for ${user.email}:`, checkError);
        continue;
      }

      // If profile doesn't exist, create it with default role
      if (!existingProfile) {
        const defaultRole = user.email === 'tps@tpsinternational.org' ? 'super_admin' : 
                           user.email === 'gaudia@geotech.com' ? 'admin' : 'user';

        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email,
            created_at: user.created_at,
            updated_at: user.updated_at,
            is_verified: user.email_confirmed_at ? true : false,
            role: defaultRole
          });

        if (insertError) {
          console.error(`Error creating profile for ${user.email}:`, insertError);
        } else {
          console.log(`✅ Created new profile for ${user.email} with role: ${defaultRole}`);
        }
      } else {
        // Profile exists, only update non-role fields to keep existing role
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email,
            updated_at: user.updated_at,
            is_verified: user.email_confirmed_at ? true : false
            // Deliberately NOT updating role to preserve existing role
          })
          .eq('id', user.id);

        if (updateError) {
          console.error(`Error updating profile for ${user.email}:`, updateError);
        }
      }
    }

    console.log(`✅ Synced ${authUsers.users.length} users to profiles (preserving existing roles)`);
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// Update user role (admin only)
router.patch('/users/:userId/role', [authenticateToken, requireAdmin], async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be one of: user, admin, super_admin'
      });
    }

    const { data: updatedUser, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('User role update error:', error);
      return res.status(500).json({
        error: 'Role update failed',
        message: 'Failed to update user role'
      });
    }

    return res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while updating user role'
    });
  }
});

// Delete user (admin only)
router.delete('/users/:userId', [authenticateToken, requireAdmin], async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Prevent self-deletion
    if (userId === req.user!.userId) {
      return res.status(400).json({
        error: 'Cannot delete own account',
        message: 'Administrators cannot delete their own account'
      });
    }

    // Delete user (cascading deletes will handle related data)
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error('User deletion error:', error);
      return res.status(500).json({
        error: 'User deletion failed',
        message: 'Failed to delete user'
      });
    }

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while deleting user'
    });
  }
});

// Get system statistics (admin only)
router.get('/stats', [authenticateToken, requireAdmin], async (_req: AuthRequest, res: Response) => {
  try {
    console.log('📊 Fetching admin statistics...');
    
    // First, ensure all auth.users are synced to profiles
    await syncAuthUsersToProfiles();
    
    // Get auth users count as a fallback
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Error fetching auth users for stats:', authError);
    }
    const authUserCount = authUsers?.users?.length || 0;
    console.log(`📊 Auth users count: ${authUserCount}`);
    
    // Get comprehensive statistics
    const [
      { count: userCount },
      { count: searchCount },
      { count: activeUsers },
      { data: recentSearches },
      { data: topUsers },
      { data: systemMetrics }
    ] = await Promise.all([
      // Total users
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      
      // Total searches
      supabase.from('part_searches').select('*', { count: 'exact', head: true }),
      
      // Active users (last 30 days) - users who have updated their profile or logged in recently
      supabase.from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Recent searches
      supabase.from('part_searches')
        .select(`
          id, created_at, confidence_score, processing_time, status,
          profiles!inner(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Top users by search count
      supabase.from('part_searches')
        .select(`
          user_id,
          profiles!inner(full_name, email),
          count:id.count()
        `)
        .order('count', { ascending: false })
        .limit(5),
      
      // System metrics
      supabase.from('system_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10)
    ]);

    // Calculate success rate
    const { data: successfulSearches } = await supabase
      .from('part_searches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gt('confidence_score', 0.7);

    const successRate = searchCount && searchCount > 0 
      ? ((successfulSearches?.length || 0) / searchCount) * 100 
      : 0;

    // Calculate additional metrics for sidebar
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get recent activity counts
    const [
      { count: searchesToday },
      { count: newUsersToday },
      { count: searchesThisWeek }
    ] = await Promise.all([
      supabase.from('part_searches')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last24Hours.toISOString()),
      
      supabase.from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last24Hours.toISOString()),
      
      supabase.from('part_searches')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastWeek.toISOString())
    ]);

    // System health check
    const systemHealth = 'healthy'; // This could be enhanced with actual health checks
    const pendingTasks = 0; // This could be enhanced with actual task queue
    const recentAlerts = 0; // This could be enhanced with actual alert system

    // Use the higher count between profiles and auth users
    const finalUserCount = Math.max(userCount || 0, authUserCount);
    console.log(`📊 Final user count: ${finalUserCount} (profiles: ${userCount}, auth: ${authUserCount})`);
    console.log(`📊 Active users: ${activeUsers}, Total searches: ${searchCount}`);

    return res.json({
      statistics: {
        total_users: finalUserCount,
        total_searches: searchCount || 0,
        active_users: activeUsers || 0,
        success_rate: Math.round(successRate * 100) / 100,
        recent_searches: recentSearches || [],
        top_users: topUsers || [],
        system_metrics: systemMetrics || [],
        // Additional sidebar metrics
        searches_today: searchesToday || 0,
        new_users_today: newUsersToday || 0,
        searches_this_week: searchesThisWeek || 0,
        system_health: systemHealth,
        pending_tasks: pendingTasks,
        recent_alerts: recentAlerts,
        // Performance metrics
        avg_response_time: systemMetrics?.[0]?.avg_response_time || 0,
        cpu_usage: systemMetrics?.[0]?.cpu_usage || 0,
        memory_usage: systemMetrics?.[0]?.memory_usage || 0,
        disk_usage: systemMetrics?.[0]?.disk_usage || 0
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching statistics'
    });
  }
});

// Get system analytics (admin only)
router.get('/analytics', [authenticateToken, requireAdmin], async (req: AuthRequest, res: Response) => {
  try {
    const timeRange = req.query.range as string || '30d';
    
    let startDate: Date;
    switch (timeRange) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get daily search counts
    const { data: dailySearches } = await supabase
      .from('part_searches')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Get daily user registrations
    const { data: dailyRegistrations } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Process data for charts
    const searchesByDay = dailySearches?.reduce((acc: any, search) => {
      const date = new Date(search.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {}) || {};

    const registrationsByDay = dailyRegistrations?.reduce((acc: any, user) => {
      const date = new Date(user.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {}) || {};

    return res.json({
      analytics: {
        searches_by_day: searchesByDay,
        registrations_by_day: registrationsByDay,
        time_range: timeRange
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching analytics'
    });
  }
});

// Get all searches with filters (admin only)
router.get('/searches', [authenticateToken, requireAdmin], async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const userId = req.query.userId as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('part_searches')
      .select(`
        *,
        profiles!inner(full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: searches, error, count } = await query;

    if (error) {
      console.error('Searches fetch error:', error);
      return res.status(500).json({
        error: 'Searches fetch failed',
        message: 'Failed to retrieve searches'
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

// AI Models Management
router.get('/ai-models', [authenticateToken, requireAdmin], async (_req: AuthRequest, res: Response) => {
  try {
    const { data: models, error } = await supabase
      .from('ai_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('AI models fetch error:', error);
      return res.status(500).json({
        error: 'AI models fetch failed',
        message: 'Failed to retrieve AI models'
      });
    }

    return res.json({ models: models || [] });
  } catch (error) {
    console.error('Get AI models error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching AI models'
    });
  }
});

router.post('/ai-models', [authenticateToken, requireAdmin], async (req: AuthRequest, res: Response) => {
  try {
    const { provider, model_name, api_key, description } = req.body;

    if (!provider || !model_name || !api_key) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Provider, model name, and API key are required'
      });
    }

    const { data: model, error } = await supabase
      .from('ai_models')
      .insert({
        provider,
        model_name,
        api_key,
        description,
        status: 'inactive'
      })
      .select()
      .single();

    if (error) {
      console.error('AI model creation error:', error);
      return res.status(500).json({
        error: 'AI model creation failed',
        message: 'Failed to create AI model'
      });
    }

    return res.json({
      message: 'AI model created successfully',
      model
    });
  } catch (error) {
    console.error('Create AI model error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while creating AI model'
    });
  }
});

router.patch('/ai-models/:id', [authenticateToken, requireAdmin], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data: model, error } = await supabase
      .from('ai_models')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('AI model update error:', error);
      return res.status(500).json({
        error: 'AI model update failed',
        message: 'Failed to update AI model'
      });
    }

    return res.json({
      message: 'AI model updated successfully',
      model
    });
  } catch (error) {
    console.error('Update AI model error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while updating AI model'
    });
  }
});

// Payment Methods Management
router.get('/payment-methods', [authenticateToken, requireAdmin], async (_req: AuthRequest, res: Response) => {
  try {
    const { data: methods, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Payment methods fetch error:', error);
      return res.status(500).json({
        error: 'Payment methods fetch failed',
        message: 'Failed to retrieve payment methods'
      });
    }

    return res.json({ methods: methods || [] });
  } catch (error) {
    console.error('Get payment methods error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching payment methods'
    });
  }
});

router.post('/payment-methods', [authenticateToken, requireAdmin], async (req: AuthRequest, res: Response) => {
  try {
    const { name, provider, api_key, secret_key, description } = req.body;

    if (!name || !provider || !api_key || !secret_key) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name, provider, API key, and secret key are required'
      });
    }

    const { data: method, error } = await supabase
      .from('payment_methods')
      .insert({
        name,
        provider,
        api_key,
        secret_key,
        description,
        status: 'inactive'
      })
      .select()
      .single();

    if (error) {
      console.error('Payment method creation error:', error);
      return res.status(500).json({
        error: 'Payment method creation failed',
        message: 'Failed to create payment method'
      });
    }

    return res.json({
      message: 'Payment method created successfully',
      method
    });
  } catch (error) {
    console.error('Create payment method error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while creating payment method'
    });
  }
});

// Delete payment method (admin only)
router.delete('/payment-methods/:id', [authenticateToken, requireAdmin], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Missing payment method ID',
        message: 'Payment method ID is required'
      });
    }

    // Check if payment method exists
    const { data: existingMethod, error: checkError } = await supabase
      .from('payment_methods')
      .select('id, name, status')
      .eq('id', id)
      .single();

    if (checkError || !existingMethod) {
      return res.status(404).json({
        error: 'Payment method not found',
        message: 'The specified payment method does not exist'
      });
    }

    // Prevent deletion of active payment methods
    if (existingMethod.status === 'active') {
      return res.status(400).json({
        error: 'Cannot delete active payment method',
        message: 'Please disable the payment method before deleting it'
      });
    }

    // Delete the payment method
    const { error: deleteError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Payment method deletion error:', deleteError);
      return res.status(500).json({
        error: 'Payment method deletion failed',
        message: 'Failed to delete payment method'
      });
    }

    return res.json({
      success: true,
      message: `Payment method "${existingMethod.name}" deleted successfully`
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while deleting payment method'
    });
  }
});

// Email Templates Management
router.get('/email-templates', [authenticateToken, requireAdmin], async (_req: AuthRequest, res: Response) => {
  try {
    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Email templates fetch error:', error);
      return res.status(500).json({
        error: 'Email templates fetch failed',
        message: 'Failed to retrieve email templates'
      });
    }

    return res.json({ templates: templates || [] });
  } catch (error) {
    console.error('Get email templates error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching email templates'
    });
  }
});

// System Settings Management
router.get('/system-settings', [authenticateToken, requireAdmin], async (_req: AuthRequest, res: Response) => {
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('System settings fetch error:', error);
      return res.status(500).json({
        error: 'System settings fetch failed',
        message: 'Failed to retrieve system settings'
      });
    }

    // Group settings by category
    const groupedSettings = settings?.reduce((acc: any, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      acc[setting.category][setting.setting_key] = setting.setting_value;
      return acc;
    }, {}) || {};

    return res.json({ settings: groupedSettings });
  } catch (error) {
    console.error('Get system settings error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching system settings'
    });
  }
});

router.patch('/system-settings', [authenticateToken, requireSuperAdmin], async (req: AuthRequest, res: Response) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        error: 'Invalid settings',
        message: 'Settings must be an object'
      });
    }

    // Update each setting
    for (const [category, categorySettings] of Object.entries(settings)) {
      for (const [key, value] of Object.entries(categorySettings as any)) {
        const { error } = await supabase
          .from('system_settings')
          .update({ setting_value: value })
          .eq('category', category)
          .eq('setting_key', key);

        if (error) {
          console.error('System setting update error:', error);
          return res.status(500).json({
            error: 'System setting update failed',
            message: 'Failed to update system settings'
          });
        }
      }
    }

    return res.json({
      message: 'System settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update system settings error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while updating system settings'
    });
  }
});

// Update system settings (super admin only)
router.patch('/settings', [
  authenticateToken, 
  requireSuperAdmin,
  body('settings').isObject().withMessage('Settings must be an object')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { settings } = req.body;

    // Update system metrics with new settings
    const timestamp = new Date().toISOString();
    const settingsEntries = Object.entries(settings).map(([key, value]) => ({
      metric_name: `setting_${key}`,
      metric_value: typeof value === 'number' ? value : null,
      tags: { type: 'setting', value: String(value) },
      timestamp
    }));

    const { error } = await supabase
      .from('system_metrics')
      .insert(settingsEntries);

    if (error) {
      console.error('Settings update error:', error);
      return res.status(500).json({
        error: 'Settings update failed',
        message: 'Failed to update system settings'
      });
    }

    return res.json({
      message: 'System settings updated successfully',
      settings
    });

  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while updating settings'
    });
  }
});

// Get system logs (admin only)
router.get('/logs', [authenticateToken, requireAdmin], async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('user_activities')
      .select(`
        *,
        profiles!inner(full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (level) {
      query = query.eq('action', level);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Logs fetch error:', error);
      return res.status(500).json({
        error: 'Logs fetch failed',
        message: 'Failed to retrieve system logs'
      });
    }

    return res.json({
      logs,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get logs error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching logs'
    });
  }
});

// Get audit logs (admin only)
router.get('/audit-logs', [authenticateToken, requireAdmin], async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;

    console.log('📋 Fetching audit logs from database...');

    // First, try to get audit logs from the audit_logs table
    const { data: auditLogs, error: auditError, count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (auditError) {
      console.error('Direct audit logs query failed:', auditError);
      
      // Fallback: Use user_activities table as audit logs
      console.log('📋 Falling back to user_activities table...');
      const { data: activities, error: activitiesError, count: activitiesCount } = await supabase
        .from('user_activities')
        .select(`
          id,
          user_id,
          action,
          details,
          created_at,
          profiles!inner(full_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (activitiesError) {
        console.error('User activities fallback failed:', activitiesError);
        return res.status(500).json({
          success: false,
          error: 'Audit logs fetch failed',
          message: 'Failed to retrieve audit logs from database'
        });
      }

      // Transform user activities to audit log format
      const transformedLogs = activities?.map(activity => ({
        id: activity.id,
        user_id: activity.user_id,
        action: activity.action,
        resource_type: 'user_activity',
        resource_id: null,
        old_values: null,
        new_values: null,
        ip_address: null,
        user_agent: null,
        created_at: activity.created_at,
        profiles: activity.profiles
      })) || [];

      return res.json({
        success: true,
        logs: transformedLogs,
        pagination: {
          page,
          limit,
          total: activitiesCount || 0,
          pages: Math.ceil((activitiesCount || 0) / limit)
        }
      });
    }

    // If audit logs exist, we need to manually join with profiles
    const logsWithProfiles = [];
    if (auditLogs && auditLogs.length > 0) {
      for (const log of auditLogs) {
        let profile = null;
        
        if (log.user_id) {
          // Get profile information for this user
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', log.user_id)
            .single();
          
          profile = userProfile;
        }

        logsWithProfiles.push({
          ...log,
          profiles: profile
        });
      }
    }

    console.log(`✅ Retrieved ${logsWithProfiles.length} audit logs`);

    return res.json({
      success: true,
      logs: logsWithProfiles,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching audit logs'
    });
  }
});

export default router; 