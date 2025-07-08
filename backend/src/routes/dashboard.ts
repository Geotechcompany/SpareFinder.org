import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { supabase } from '../server';
import { DatabaseLogger } from '../services/database-logger';

const router = Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    // Fetch user's part search statistics
    const { data: searches } = await DatabaseLogger.getUserHistory(userId, 1, 1000);
    
    const totalUploads = searches.length;
    const successfulUploads = searches.filter(
      search => search.analysis_status === 'completed' && 
                search.predictions && 
                search.predictions.length > 0
    ).length;
    
    const avgConfidence = totalUploads > 0 
      ? searches.reduce((sum, search) => sum + (search.confidence_score || 0), 0) / totalUploads * 100 
      : 0;
    
    const avgProcessTime = totalUploads > 0
      ? searches.reduce((sum, search) => sum + (search.processing_time || 0), 0) / totalUploads / 1000
      : 0;

    return res.json({
      success: true,
      data: {
        totalUploads,
        successfulUploads,
        avgConfidence: Number(avgConfidence.toFixed(2)),
        avgProcessTime: Number(avgProcessTime.toFixed(2))
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

// Get recent uploads
router.get('/recent-uploads', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 5;

    const { data: uploads } = await DatabaseLogger.getUserHistory(userId, 1, limit, {
      analysis_status: 'completed'
    });

    return res.json({
      success: true,
      data: {
        uploads: uploads.map(upload => ({
          id: upload.id,
          image_name: upload.image_name,
          created_at: upload.created_at,
          confidence_score: upload.confidence_score
        }))
      }
    });

  } catch (error) {
    console.error('Recent uploads error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recent uploads'
    });
  }
});

// Get recent activities
router.get('/recent-activities', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 5;

    // Fetch user's search history and part searches
    const { data: searches } = await DatabaseLogger.getUserHistory(userId, 1, limit);

    const activities = searches.map(search => ({
      id: search.id,
      resource_type: 'upload',
      action: 'Part Search',
      details: {
        description: `Searched for part using ${search.image_name || 'an image'}`,
        confidence: search.confidence_score ? Math.round(search.confidence_score * 100) : null,
        status: search.analysis_status || 'completed'
      },
      created_at: search.created_at
    }));

    return res.json({
      success: true,
      data: {
        activities
      }
    });

  } catch (error) {
    console.error('Recent activities error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activities'
    });
  }
});

// Get performance metrics
router.get('/performance-metrics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Fetch user's part search statistics
    const { data: searches } = await DatabaseLogger.getUserHistory(userId, 1, 1000);

    // Calculate metrics
    const totalSearches = searches.length;
    const completedSearches = searches.filter(
      search => search.analysis_status === 'completed' && 
                search.predictions && 
                search.predictions.length > 0
    );

    const modelAccuracy = totalSearches > 0 
      ? (completedSearches.length / totalSearches) * 100 
      : 0;

    // Compare with previous period (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const previousPeriodSearches = searches.filter(
      search => new Date(search.created_at) >= thirtyDaysAgo
    );

    const previousPeriodCompletedSearches = previousPeriodSearches.filter(
      search => search.analysis_status === 'completed' && 
                search.predictions && 
                search.predictions.length > 0
    );

    const accuracyChange = previousPeriodSearches.length > 0
      ? ((completedSearches.length - previousPeriodCompletedSearches.length) / previousPeriodSearches.length) * 100
      : 0;

    const avgResponseTime = totalSearches > 0
      ? searches.reduce((sum, search) => sum + (search.processing_time || 0), 0) / totalSearches
      : 0;

    const previousAvgResponseTime = previousPeriodSearches.length > 0
      ? previousPeriodSearches.reduce((sum, search) => sum + (search.processing_time || 0), 0) / previousPeriodSearches.length
      : 0;

    const responseTimeChange = previousAvgResponseTime > 0
      ? ((avgResponseTime - previousAvgResponseTime) / previousAvgResponseTime) * 100
      : 0;

    return res.json({
      success: true,
      data: {
        modelAccuracy: Number(modelAccuracy.toFixed(2)),
        accuracyChange: Number(accuracyChange.toFixed(2)),
        totalSearches,
        searchesGrowth: Number(accuracyChange.toFixed(2)),
        avgResponseTime: Number(avgResponseTime.toFixed(2)),
        responseTimeChange: Number(responseTimeChange.toFixed(2))
      }
    });

  } catch (error) {
    console.error('Performance metrics error:', error);
    return res.status(500).json({
      success: false,
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