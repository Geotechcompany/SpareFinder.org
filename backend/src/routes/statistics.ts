import { Router, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { DatabaseLogger } from '../services/database-logger';

const router = Router();

// Get current user's statistics
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const statistics = await DatabaseLogger.getUserStatistics(userId);

    if (!statistics) {
      // Return default statistics if none exist
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