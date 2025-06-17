import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { supabase } from '../server';

const router = Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get comprehensive user stats
    const { data: userStats, error: _statsError } = await supabase
      .from('profiles')
      .select(`
        id,
        current_streak,
        longest_streak,
        created_at,
        subscriptions!inner(tier, status),
        usage_tracking!inner(searches_count, api_calls_count)
      `)
      .eq('id', userId)
      .eq('usage_tracking.month', new Date().getMonth() + 1)
      .eq('usage_tracking.year', new Date().getFullYear())
      .single();

    // Get upload statistics
    const { data: uploads, error: uploadsError } = await supabase
      .from('part_searches')
      .select('id, confidence_score, processing_time, created_at, status')
      .eq('user_id', userId);

    if (uploadsError) {
      console.error('Error fetching uploads:', uploadsError);
      return res.status(500).json({
        error: 'Failed to fetch upload statistics'
      });
    }

    const allUploads = uploads || [];
    const totalUploads = allUploads.length;
    
    // Calculate successful uploads (confidence > 0.5)
    const successfulUploads = allUploads.filter(upload => 
      upload.status === 'completed' && upload.confidence_score && upload.confidence_score > 0.5
    );

    // Calculate averages
    const avgConfidence = successfulUploads.length > 0
      ? successfulUploads.reduce((sum, upload) => sum + (upload.confidence_score || 0), 0) / successfulUploads.length
      : 0;

    const avgProcessTime = allUploads.length > 0
      ? allUploads.reduce((sum, upload) => sum + (upload.processing_time || 0), 0) / allUploads.length
      : 0;

    // Calculate monthly growth
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthUploads = allUploads.filter(upload => {
      const uploadDate = new Date(upload.created_at);
      return uploadDate.getMonth() === currentMonth && uploadDate.getFullYear() === currentYear;
    }).length;

    const previousMonthUploads = allUploads.filter(upload => {
      const uploadDate = new Date(upload.created_at);
      return uploadDate.getMonth() === previousMonth && uploadDate.getFullYear() === previousYear;
    }).length;

    const monthlyGrowth = previousMonthUploads > 0 
      ? ((currentMonthUploads - previousMonthUploads) / previousMonthUploads) * 100
      : currentMonthUploads > 0 ? 100 : 0;

    // Get achievements count
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId);

    // Get billing analytics for savings calculation
    const { data: billingAnalytics } = await supabase
      .from('billing_analytics')
      .select('total_saved')
      .eq('user_id', userId)
      .eq('month', new Date().getMonth() + 1)
      .eq('year', new Date().getFullYear())
      .single();

    return res.json({
      totalUploads,
      successfulUploads: successfulUploads.length,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      avgProcessTime: Math.round(avgProcessTime / 1000 * 100) / 100,
      monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
      currentStreak: userStats?.current_streak || 0,
      longestStreak: userStats?.longest_streak || 0,
      totalAchievements: achievements?.length || 0,
      totalSaved: billingAnalytics?.total_saved || 0,
      subscriptionTier: userStats?.subscriptions?.[0]?.tier || 'free',
      uploadsThisMonth: currentMonthUploads
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

// Get recent uploads
router.get('/recent-uploads', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 5;

    const { data: uploads, error } = await supabase
      .from('part_searches')
      .select('id, image_name, created_at, confidence_score, predictions')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent uploads:', error);
      return res.status(500).json({
        error: 'Failed to fetch recent uploads'
      });
    }

    return res.json({
      uploads: uploads || []
    });

  } catch (error) {
    console.error('Recent uploads error:', error);
    return res.status(500).json({
      error: 'Failed to fetch recent uploads'
    });
  }
});

// Get recent activities
router.get('/recent-activities', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 5;

    // Try to get from user_activities table first
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('id, action, resource_type, details, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (activitiesError && activitiesError.code !== 'PGRST116') {
      console.error('Error fetching activities:', activitiesError);
    }

    // If no activities table or no data, create activities from part_searches
    if (!activities || activities.length === 0) {
      const { data: searches, error: searchError } = await supabase
        .from('part_searches')
        .select('id, image_name, created_at, confidence_score, predictions')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (searchError) {
        console.error('Error fetching searches for activities:', searchError);
        return res.status(500).json({
          error: 'Failed to fetch recent activities'
        });
      }

      // Convert searches to activities format
      const searchActivities = (searches || []).map(search => ({
        id: search.id,
        action: 'Part Upload',
        resource_type: 'upload',
        details: {
          description: `Uploaded ${search.image_name || 'image'} for analysis`,
          confidence: search.confidence_score ? Math.round(search.confidence_score * 100) : null,
          predictions_count: Array.isArray(search.predictions) ? search.predictions.length : 0
        },
        created_at: search.created_at
      }));

      return res.json({
        activities: searchActivities
      });
    }

    return res.json({
      activities: activities || []
    });

  } catch (error) {
    console.error('Recent activities error:', error);
    return res.status(500).json({
      error: 'Failed to fetch recent activities'
    });
  }
});

// Get performance metrics
router.get('/performance-metrics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get all user's searches for analysis
    const { data: searches, error } = await supabase
      .from('part_searches')
      .select('confidence_score, processing_time, created_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching performance data:', error);
      return res.status(500).json({
        error: 'Failed to fetch performance metrics'
      });
    }

    const allSearches = searches || [];
    
    // Calculate model accuracy (percentage of searches with confidence > 0.7)
    const highConfidenceSearches = allSearches.filter(s => s.confidence_score && s.confidence_score > 0.7);
    const modelAccuracy = allSearches.length > 0 
      ? (highConfidenceSearches.length / allSearches.length) * 100 
      : 0;

    // Calculate average response time
    const avgResponseTime = allSearches.length > 0
      ? allSearches.reduce((sum, s) => sum + (s.processing_time || 0), 0) / allSearches.length
      : 0;

    // Calculate changes compared to previous month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthSearches = allSearches.filter(s => {
      const searchDate = new Date(s.created_at);
      return searchDate.getMonth() === currentMonth && searchDate.getFullYear() === currentYear;
    });

    const previousMonthSearches = allSearches.filter(s => {
      const searchDate = new Date(s.created_at);
      return searchDate.getMonth() === previousMonth && searchDate.getFullYear() === previousYear;
    });

    // Calculate previous month metrics
    const prevHighConfidence = previousMonthSearches.filter(s => s.confidence_score && s.confidence_score > 0.7);
    const prevModelAccuracy = previousMonthSearches.length > 0 
      ? (prevHighConfidence.length / previousMonthSearches.length) * 100 
      : 0;

    const prevAvgResponseTime = previousMonthSearches.length > 0
      ? previousMonthSearches.reduce((sum, s) => sum + (s.processing_time || 0), 0) / previousMonthSearches.length
      : 0;

    const accuracyChange = prevModelAccuracy > 0 
      ? modelAccuracy - prevModelAccuracy 
      : 0;

    const responseTimeChange = prevAvgResponseTime > 0 
      ? avgResponseTime - prevAvgResponseTime 
      : 0;

    const searchesGrowth = previousMonthSearches.length > 0
      ? ((currentMonthSearches.length - previousMonthSearches.length) / previousMonthSearches.length) * 100
      : currentMonthSearches.length > 0 ? 100 : 0;

    return res.json({
      modelAccuracy: Math.round(modelAccuracy * 100) / 100,
      accuracyChange: Math.round(accuracyChange * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      responseTimeChange: Math.round(responseTimeChange),
      totalSearches: allSearches.length,
      searchesGrowth: Math.round(searchesGrowth * 100) / 100
    });

  } catch (error) {
    console.error('Performance metrics error:', error);
    return res.status(500).json({
      error: 'Failed to fetch performance metrics'
    });
  }
});

// Get user usage statistics
router.get('/usage-stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Try to get from usage_tracking table
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const { data: currentUsage, error: currentError } = await supabase
      .from('usage_tracking')
      .select('searches_count, api_calls_count, storage_used')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single();

    const { data: previousUsage, error: _previousError } = await supabase
      .from('usage_tracking')
      .select('searches_count, api_calls_count, storage_used')
      .eq('user_id', userId)
      .eq('month', previousMonth)
      .eq('year', previousYear)
      .single();

    // If usage_tracking table doesn't exist or has no data, calculate from part_searches
    if ((currentError && currentError.code === 'PGRST116') || !currentUsage) {
      const { data: searches, error: searchError } = await supabase
        .from('part_searches')
        .select('created_at')
        .eq('user_id', userId);

      if (searchError) {
        console.error('Error fetching searches for usage:', searchError);
        return res.status(500).json({
          error: 'Failed to fetch usage statistics'
        });
      }

      const allSearches = searches || [];
      
      const currentMonthSearches = allSearches.filter(s => {
        const searchDate = new Date(s.created_at);
        return searchDate.getMonth() === (currentMonth - 1) && searchDate.getFullYear() === currentYear;
      }).length;

      const previousMonthSearches = allSearches.filter(s => {
        const searchDate = new Date(s.created_at);
        return searchDate.getMonth() === (previousMonth - 1) && searchDate.getFullYear() === previousYear;
      }).length;

      return res.json({
        currentMonth: {
          searches: currentMonthSearches,
          apiCalls: currentMonthSearches, // Assume 1 API call per search
          storageUsed: 0 // Would need to calculate from image sizes
        },
        previousMonth: {
          searches: previousMonthSearches,
          apiCalls: previousMonthSearches,
          storageUsed: 0
        }
      });
    }

    return res.json({
      currentMonth: {
        searches: currentUsage?.searches_count || 0,
        apiCalls: currentUsage?.api_calls_count || 0,
        storageUsed: currentUsage?.storage_used || 0
      },
      previousMonth: {
        searches: previousUsage?.searches_count || 0,
        apiCalls: previousUsage?.api_calls_count || 0,
        storageUsed: previousUsage?.storage_used || 0
      }
    });

  } catch (error) {
    console.error('Usage stats error:', error);
    return res.status(500).json({
      error: 'Failed to fetch usage statistics'
    });
  }
});

// Get user achievements
router.get('/achievements', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Define all possible achievements
    const allAchievements = [
      {
        id: 'first_upload',
        title: 'First Upload',
        description: 'Uploaded your first part',
        icon: 'Trophy',
        color: 'from-yellow-600 to-orange-600',
        requirement: { type: 'uploads', count: 1 }
      },
      {
        id: 'speed_demon',
        title: 'Speed Demon',
        description: 'Identified 100 parts in a day',
        icon: 'Zap',
        color: 'from-blue-600 to-cyan-600',
        requirement: { type: 'daily_uploads', count: 100 }
      },
      {
        id: 'accuracy_expert',
        title: 'Accuracy Expert',
        description: 'Achieved 95% accuracy rate',
        icon: 'Target',
        color: 'from-green-600 to-emerald-600',
        requirement: { type: 'accuracy', threshold: 0.95 }
      },
      {
        id: 'part_master',
        title: 'Part Master',
        description: 'Identified 1000+ parts',
        icon: 'Award',
        color: 'from-purple-600 to-pink-600',
        requirement: { type: 'uploads', count: 1000 }
      },
      {
        id: 'streak_master',
        title: 'Streak Master',
        description: '30-day identification streak',
        icon: 'Activity',
        color: 'from-red-600 to-orange-600',
        requirement: { type: 'streak', count: 30 }
      },
      {
        id: 'explorer',
        title: 'Explorer',
        description: 'Used all part categories',
        icon: 'TrendingUp',
        color: 'from-indigo-600 to-purple-600',
        requirement: { type: 'categories', count: 5 }
      }
    ];

    // Get user's earned achievements from database
    const { data: earnedAchievements, error: achievementError } = await supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', userId);

    if (achievementError && achievementError.code !== 'PGRST116') {
      console.error('Error fetching achievements:', achievementError);
    }

    // Get user stats to determine which achievements should be earned
    const { data: userSearches, error: searchError } = await supabase
      .from('part_searches')
      .select('id, confidence_score, created_at, predictions')
      .eq('user_id', userId);

    if (searchError) {
      console.error('Error fetching user searches:', searchError);
      return res.status(500).json({
        error: 'Failed to fetch user data for achievements'
      });
    }

    const searches = userSearches || [];
    const totalUploads = searches.length;
    
    // Calculate accuracy
    const highConfidenceSearches = searches.filter(s => s.confidence_score && s.confidence_score > 0.95);
    const accuracyRate = totalUploads > 0 ? highConfidenceSearches.length / totalUploads : 0;

    // Get user streak
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('current_streak')
      .eq('id', userId)
      .single();

    const currentStreak = userProfile?.current_streak || 0;

    // Calculate daily uploads for speed demon
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayUploads = searches.filter(s => {
      const searchDate = new Date(s.created_at);
      return searchDate >= today && searchDate < tomorrow;
    }).length;

    // Estimate categories used (simplified)
    const categoriesUsed = Math.min(5, Math.floor(totalUploads / 10)); // Rough estimate

    // Determine which achievements are earned
    const earnedIds = new Set((earnedAchievements || []).map(a => a.achievement_id));
    
    const achievementsWithStatus = allAchievements.map(achievement => {
      let earned = earnedIds.has(achievement.id);
      
      // Auto-check achievements based on current stats if not already in DB
      if (!earned) {
        switch (achievement.requirement.type) {
          case 'uploads':
            earned = totalUploads >= (achievement.requirement.count || 0);
            break;
          case 'accuracy':
            earned = accuracyRate >= (achievement.requirement.threshold || 0);
            break;
          case 'streak':
            earned = currentStreak >= (achievement.requirement.count || 0);
            break;
          case 'daily_uploads':
            earned = todayUploads >= (achievement.requirement.count || 0);
            break;
          case 'categories':
            earned = categoriesUsed >= (achievement.requirement.count || 0);
            break;
        }
      }

      return {
        ...achievement,
        earned,
        earnedAt: earnedIds.has(achievement.id) 
          ? earnedAchievements?.find(a => a.achievement_id === achievement.id)?.earned_at 
          : null
      };
    });

    return res.json({
      achievements: achievementsWithStatus,
      totalEarned: achievementsWithStatus.filter(a => a.earned).length,
      totalAvailable: allAchievements.length
    });

  } catch (error) {
    console.error('Achievements error:', error);
    return res.status(500).json({
      error: 'Failed to fetch achievements'
    });
  }
});

export default router; 