import { Router, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { DatabaseLogger } from '../services/database-logger';
import { emailService } from '../services/email-service';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const router = Router();

// Get current user's statistics
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    let statistics = await DatabaseLogger.getUserStatistics(userId);

    // Backfill/refresh stats for users that already existed before we started
    // updating `user_statistics` automatically.
    //
    // IMPORTANT: this endpoint is called frequently (profile/achievements polling),
    // so we only recompute when missing or "stale enough".
    const STALE_AFTER_MS = 10 * 60 * 1000; // 10 minutes
    const lastUpdatedAtMs = (() => {
      const raw = (statistics as any)?.updated_at;
      if (!raw) return null;
      const ms = new Date(String(raw)).getTime();
      return Number.isFinite(ms) ? ms : null;
    })();

    const isMissing = !statistics;
    const isStale = lastUpdatedAtMs != null ? Date.now() - lastUpdatedAtMs > STALE_AFTER_MS : false;

    if (isMissing || isStale) {
      const refresh = await DatabaseLogger.updateUserStatistics(userId);
      if (refresh.success) {
        statistics = await DatabaseLogger.getUserStatistics(userId);
      }
    }

    // If statistics still don't exist, calculate directly from part_searches
    // (same approach as dashboard stats endpoint)
    if (!statistics) {
      console.log(`📊 Statistics not found in user_statistics table, calculating from part_searches for user ${userId}...`);
      
      const { data: searchData, error: searchError } = await supabase
        .from('part_searches')
        .select('*')
        .eq('user_id', userId);

      if (searchError) {
        console.error('❌ Error fetching part_searches:', searchError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch statistics'
        });
      }

      if (!searchData || searchData.length === 0) {
        // Return default statistics if no uploads exist
        return res.json({
          success: true,
          statistics: {
            user_id: userId,
            total_uploads: 0,
            total_successful_identifications: 0,
            total_failed_identifications: 0,
            total_web_scraping_searches: 0,
            total_similar_parts_found: 0,
            average_confidence_score: 0.0,
            average_processing_time: 0,
            preferred_categories: [],
            most_searched_parts: [],
            last_upload_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        });
      }

      // Calculate statistics from part_searches (same logic as updateUserStatistics)
      const totalUploads = searchData.length;
      const totalSuccessful = searchData.filter(s => 
        s.analysis_status === 'completed' && s.predictions && Array.isArray(s.predictions) && s.predictions.length > 0
      ).length;
      const totalFailed = searchData.filter(s => s.analysis_status === 'failed').length;
      const totalWebScraping = searchData.filter(s => s.web_scraping_used).length;
      const totalSimilarParts = searchData.reduce((sum, s) => 
        sum + (Array.isArray(s.similar_images) ? s.similar_images.length : 0), 0
      );
      const avgConfidence = searchData.reduce((sum, s) => sum + (typeof s.confidence_score === 'number' ? s.confidence_score : 0), 0) / totalUploads;
      const avgProcessingTime = searchData.reduce((sum, s) => sum + (typeof s.processing_time === 'number' ? s.processing_time : 0), 0) / totalUploads;
      const lastUpload = searchData.sort((a, b) => {
        const dateA = typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : 0;
        const dateB = typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })[0]?.created_at;

      // Extract preferred categories and most searched parts
      const categoryCounts: Record<string, number> = {};
      const partCounts: Record<string, number> = {};
      
      searchData.forEach(s => {
        if (s.predictions && Array.isArray(s.predictions) && s.predictions.length > 0) {
          const category = s.predictions[0].category || 'Unknown';
          const partName = s.predictions[0].class_name || 'Unknown';
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          partCounts[partName] = (partCounts[partName] || 0) + 1;
        }
      });

      const preferredCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category]) => category);

      const mostSearchedParts = Object.entries(partCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([part]) => part);

      statistics = {
        user_id: userId,
        total_uploads: totalUploads,
        total_successful_identifications: totalSuccessful,
        total_failed_identifications: totalFailed,
        total_web_scraping_searches: totalWebScraping,
        total_similar_parts_found: totalSimilarParts,
        average_confidence_score: avgConfidence,
        average_processing_time: avgProcessingTime,
        preferred_categories: preferredCategories,
        most_searched_parts: mostSearchedParts,
        last_upload_at: lastUpload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log(`✅ Calculated statistics from part_searches: ${totalUploads} uploads, ${totalSuccessful} successful`);
    }

    return res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('Statistics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics'
    });
  }
});

// Get user's upload history with enhanced filtering
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page

    // Enhanced filters
    const filters = {
      analysis_status: req.query.status as string,
      web_scraping_used: req.query.web_scraping === 'true' ? true : 
                        req.query.web_scraping === 'false' ? false : undefined,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === undefined) {
        delete filters[key as keyof typeof filters];
      }
    });

    const historyResult = await DatabaseLogger.getUserHistory(userId, page, limit, filters);

    return res.json({
      success: true,
      data: historyResult.data,
      pagination: {
        page: historyResult.page,
        limit: historyResult.limit,
        total: historyResult.total,
        total_pages: Math.ceil(historyResult.total / historyResult.limit)
      },
      filters
    });

  } catch (error) {
    console.error('History error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch upload history'
    });
  }
});

// Get user's search analytics
router.get('/analytics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const timeRange = req.query.range as string || '30d'; // 7d, 30d, 90d, 1y

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const filters = {
      date_from: startDate.toISOString().split('T')[0],
      date_to: endDate.toISOString().split('T')[0]
    };

    // Get history data for analytics
    const historyResult = await DatabaseLogger.getUserHistory(userId, 1, 1000, filters);
    const uploads = historyResult.data;

    // Calculate analytics
    const analytics = {
      time_range: timeRange,
      total_uploads: uploads.length,
      successful_uploads: uploads.filter(u => u.analysis_status === 'completed').length,
      failed_uploads: uploads.filter(u => u.analysis_status === 'failed').length,
      web_scraping_usage: uploads.filter(u => u.web_scraping_used).length,
      
      // Average metrics
      average_confidence: uploads.length > 0 
        ? uploads.reduce((sum, u) => sum + (u.confidence_score || 0), 0) / uploads.length 
        : 0,
      average_processing_time: uploads.length > 0 
        ? uploads.reduce((sum, u) => sum + (u.processing_time || 0), 0) / uploads.length 
        : 0,
      
      // Category distribution
      categories: uploads.reduce((acc, upload) => {
        if (upload.predictions && upload.predictions.length > 0) {
          const category = upload.predictions[0].category || 'Unknown';
          acc[category] = (acc[category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      
      // Most identified parts
      top_parts: uploads.reduce((acc, upload) => {
        if (upload.predictions && upload.predictions.length > 0) {
          const partName = upload.predictions[0].class_name || 'Unknown';
          acc[partName] = (acc[partName] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      
      // Upload frequency by day
      daily_uploads: uploads.reduce((acc, upload) => {
        const date = upload.created_at.split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      
      // Success rate over time
      success_rate: uploads.length > 0 
        ? (uploads.filter(u => u.analysis_status === 'completed').length / uploads.length) * 100 
        : 0
    };

    return res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data'
    });
  }
});

// Update user statistics manually (admin or user)
router.post('/refresh', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await DatabaseLogger.updateUserStatistics(userId);

    if (result.success) {
      const updatedStats = await DatabaseLogger.getUserStatistics(userId);
      return res.json({
        success: true,
        message: 'Statistics refreshed successfully',
        statistics: updatedStats
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to refresh statistics'
      });
    }

  } catch (error) {
    console.error('Statistics refresh error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh statistics'
    });
  }
});

// Admin-only routes
router.get('/admin/daily', authenticateToken, requireRole(['admin', 'super_admin']), async (req: AuthRequest, res: Response) => {
  try {
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;

    const dailyStats = await DatabaseLogger.getDailyStats(dateFrom, dateTo);

    return res.json({
      success: true,
      daily_stats: dailyStats
    });

  } catch (error) {
    console.error('Daily stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch daily statistics'
    });
  }
});

// Check and unlock achievements
router.post('/check-achievements', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    // Get user statistics first - refresh if missing
    let statistics = await DatabaseLogger.getUserStatistics(userId);
    if (!statistics) {
      // Try to refresh statistics from part_searches
      console.log(`📊 Statistics not found for user ${userId}, refreshing...`);
      const refreshResult = await DatabaseLogger.updateUserStatistics(userId);
      if (refreshResult.success) {
        statistics = await DatabaseLogger.getUserStatistics(userId);
      }
    }

    // If still no statistics, calculate directly from part_searches
    if (!statistics) {
      console.log(`📊 Calculating statistics directly from part_searches for user ${userId}...`);
      const { data: searchData, error: searchError } = await supabase
        .from('part_searches')
        .select('*')
        .eq('user_id', userId);

      if (searchError || !searchData || searchData.length === 0) {
        return res.json({
          success: true,
          message: 'No uploads found',
          newlyUnlocked: []
        });
      }

      // Calculate statistics manually
      const totalUploads = searchData.length;
      const totalSuccessful = searchData.filter(s => 
        s.analysis_status === 'completed' && s.predictions && Array.isArray(s.predictions) && s.predictions.length > 0
      ).length;
      const totalFailed = searchData.filter(s => s.analysis_status === 'failed').length;
      const totalWebScraping = searchData.filter(s => s.web_scraping_used).length;
      const avgConfidence = searchData.reduce((sum, s) => sum + (typeof s.confidence_score === 'number' ? s.confidence_score : 0), 0) / totalUploads;

      // Create a statistics-like object
      statistics = {
        user_id: userId,
        total_uploads: totalUploads,
        total_successful_identifications: totalSuccessful,
        total_failed_identifications: totalFailed,
        total_web_scraping_searches: totalWebScraping,
        average_confidence_score: avgConfidence,
      };
    }

    // Check and unlock achievements (pass statistics to avoid re-fetching)
    const result = await DatabaseLogger.checkAndUnlockAchievements(userId, statistics);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to check achievements'
      });
    }

    // Send email notifications for newly unlocked achievements
    if (result.newlyUnlocked.length > 0) {
      // Get user profile for email
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (userProfile?.email) {
        // Get achievement details from database
        const { data: achievements } = await supabase
          .from('user_achievements')
          .select('achievement_id, achievement_name, achievement_description')
          .eq('user_id', userId)
          .in('achievement_id', result.newlyUnlocked)
          .order('earned_at', { ascending: false });

        // Send email for each newly unlocked achievement
        for (const achievement of achievements || []) {
          try {
            await emailService.sendAchievementUnlockedEmail({
              userEmail: userProfile.email,
              userName: userProfile.full_name || 'User',
              achievementName: achievement.achievement_name,
              achievementDescription: achievement.achievement_description || '',
              achievementId: achievement.achievement_id,
            });
            console.log(`✅ Achievement email sent for: ${achievement.achievement_name}`);
          } catch (emailError) {
            console.error(`❌ Failed to send achievement email for ${achievement.achievement_id}:`, emailError);
          }
        }
      }
    }

    return res.json({
      success: true,
      message: `Checked achievements. ${result.newlyUnlocked.length} newly unlocked.`,
      newlyUnlocked: result.newlyUnlocked
    });

  } catch (error) {
    console.error('Achievement check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check achievements'
    });
  }
});

// Delete user data (GDPR compliance)
router.delete('/user-data', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    // Confirm deletion with password or additional verification
    const confirmPassword = req.body.password;
    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Password confirmation required for data deletion'
      });
    }

    // TODO: Verify password before deletion
    // For now, we'll proceed with deletion

    const result = await DatabaseLogger.deleteUserData(userId);

    if (result.success) {
      return res.json({
        success: true,
        message: 'All user data has been permanently deleted'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to delete user data'
      });
    }

  } catch (error) {
    console.error('User data deletion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user data'
    });
  }
});

export default router; 