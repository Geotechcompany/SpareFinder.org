import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import winston from 'winston';
import { authenticateToken } from '../middleware/auth';  // Import authentication middleware
import { AuthRequest } from '../types/auth';  // Import the correct auth request type

// Enhanced logging setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

// Performance Metrics Result Type with Zod
const PerformanceMetricsSchema = z.object({
  total_searches: z.number().int().min(0),
  avg_confidence: z.number().min(0).max(100),
  avg_process_time: z.number().min(0),
  match_rate: z.number().min(0).max(1)
});

type PerformanceMetricsResult = z.infer<typeof PerformanceMetricsSchema>;

// Environment Variable Validation
const validateEnvVars = () => {
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    const errorMsg = `Missing environment variables: ${missingVars.join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
};

// Load and validate environment variables
dotenv.config({ 
  path: path.resolve(__dirname, '../../../.env') 
});
validateEnvVars();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, { 
  auth: { persistSession: false } 
});

const router = Router();

// Apply authentication middleware to all dashboard routes
router.use(authenticateToken);

// Middleware for input validation
const validateQueryParams = (req: Request, res: Response, next: () => void) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    if (limit < 1 || limit > 50) {
      return res.status(400).json({ 
        success: false, 
        error: 'Limit must be between 1 and 50' 
      });
    }
    next();
    return;
  } catch (error) {
    logger.error('Query parameter validation error', { error });
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid query parameters' 
    });
  }
};

// Centralized error handler
const handleDashboardError = (
  res: Response, 
  error: unknown, 
  context: string
) => {
  logger.error(`${context} Error`, { error });
  
  if (error instanceof Error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } else {
    return res.status(500).json({ 
      success: false, 
      error: 'Unexpected server error' 
    });
  }
};

// Get recent uploads with enhanced validation
router.get(
  '/recent-uploads', 
  validateQueryParams,
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const userId = req.user?.userId;

      console.log('📁 Recent uploads - User ID:', userId);

      if (!userId) {
        console.log('❌ Recent uploads - No user ID found');
        return res.status(401).json({ 
          success: false, 
          error: 'Unauthorized' 
        });
      }

      const { data, error } = await supabase
        .from('part_searches')
        .select(`
          id,
          search_term,
          part_name,
          part_number,
          manufacturer,
          confidence_score,
          image_url,
          image_name,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return res.json({
        success: true,
        data: {
          uploads: (data || []).map(upload => ({
            id: upload.id,
            image_name: upload.image_name || upload.part_name || upload.search_term || 'Unknown',
            created_at: upload.created_at,
            confidence_score: upload.confidence_score || 0,
            part_details: {
              part_number: upload.part_number || null,
              manufacturer: upload.manufacturer || null
            }
          }))
        }
      });
    } catch (error) {
      return handleDashboardError(res, error, 'Recent Uploads');
    }
  }
);

// Get recent activities
router.get('/recent-activities', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const userId = req.user?.userId; // Assuming middleware adds user info

    console.log('🔄 Recent activities - User ID:', userId);

    if (!userId) {
      console.log('❌ Recent activities - No user ID found');
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Fetch recent activities from part_searches
    const { data, error } = await supabase
      .from('part_searches')
      .select(`
        id,
        search_term,
        search_type,
        part_name,
        manufacturer,
        confidence_score,
        is_match,
        analysis_status,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Recent Activities Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    return res.json({
      success: true,
      data: {
        activities: (data || []).map(activity => ({
          id: activity.id,
          resource_type: 'part_search',
          action: activity.is_match ? 'Part Match Found' : 'Search Performed',
          details: {
            search_term: activity.search_term || 'Unknown',
            search_type: activity.search_type || 'image_upload',
            part_name: activity.part_name || 'Not identified',
            manufacturer: activity.manufacturer || 'Unknown',
            confidence: Math.round((activity.confidence_score || 0) * 100),
            status: activity.analysis_status || (activity.is_match ? 'success' : 'pending'),
            description: activity.part_name 
              ? `Found ${activity.part_name}${activity.manufacturer ? ` by ${activity.manufacturer}` : ''}`
              : `Searched for ${activity.search_term || 'part'}`
          },
          created_at: activity.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Recent Activities Unexpected Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get performance metrics
router.get('/performance-metrics', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // Assuming middleware adds user info

    console.log('📈 Performance metrics - User ID:', userId);

    if (!userId) {
      console.log('❌ Performance metrics - No user ID found');
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Fetch all user's part searches to calculate metrics
    const { data: searches, error } = await supabase
      .from('part_searches')
      .select('confidence_score, processing_time_ms, is_match')
      .eq('user_id', userId);

    if (error) {
      console.error('Performance Metrics Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    // Calculate metrics manually
    const totalSearches = searches?.length || 0;
    let avgConfidence = 0;
    let avgProcessTime = 0;
    let matchCount = 0;

    if (searches && searches.length > 0) {
      const confidenceSum = searches.reduce((sum, search) => sum + (search.confidence_score || 0), 0);
      const processTimeSum = searches.reduce((sum, search) => sum + (search.processing_time_ms || 0), 0);
      matchCount = searches.filter(search => search.is_match).length;

      avgConfidence = confidenceSum / searches.length;
      avgProcessTime = processTimeSum / searches.length;
    }

    const matchRate = totalSearches > 0 ? (matchCount / totalSearches) * 100 : 0;

    console.log('📈 Performance metrics calculated:', {
      totalSearches,
      avgConfidence,
      avgProcessTime,
      matchRate,
      rawSearches: searches?.length || 0
    });

    return res.json({
      success: true,
      data: {
        totalSearches,
        avgConfidence: Math.round(avgConfidence * 100) || 0, // Convert to percentage and round
        avgProcessTime: Math.round(avgProcessTime) || 0, // Round to whole number
        matchRate: Math.round(matchRate) || 0, // Round to whole number
        modelAccuracy: Math.round(matchRate) || 0,
        accuracyChange: 0, // TODO: Implement historical tracking
        searchesGrowth: 0, // TODO: Implement historical tracking
        avgResponseTime: Math.round(avgProcessTime) || 0,
        responseTimeChange: 0 // TODO: Implement historical tracking
      }
    });
  } catch (error) {
    console.error('Performance Metrics Unexpected Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get dashboard stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    console.log('📊 Dashboard stats - User ID:', userId);

    if (!userId) {
      console.log('❌ Dashboard stats - No user ID found');
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Fetch total uploads
    const { count: totalUploads, error: uploadsError } = await supabase
      .from('part_searches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Fetch successful uploads
    const { count: successfulUploads, error: successfulError } = await supabase
      .from('part_searches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_match', true);

    // Calculate average confidence and processing time
    const { data: statsData, error: statsError } = await supabase
      .from('part_searches')
      .select('confidence_score, processing_time_ms')
      .eq('user_id', userId);

    if (uploadsError || successfulError || statsError) {
      console.error('Stats Fetch Errors:', { uploadsError, successfulError, statsError });
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch dashboard statistics' 
      });
    }

    const avgConfidence = statsData?.length 
      ? statsData.reduce((sum, item) => sum + (item.confidence_score || 0), 0) / statsData.length 
      : 0;

    const avgProcessTime = statsData?.length 
      ? statsData.reduce((sum, item) => sum + (item.processing_time_ms || 0), 0) / statsData.length 
      : 0;

    console.log('📊 Dashboard stats calculated:', {
      totalUploads: totalUploads || 0,
      successfulUploads: successfulUploads || 0,
      avgConfidence: avgConfidence,
      avgProcessTime: avgProcessTime,
      rawData: statsData?.length || 0
    });

    return res.json({
      success: true,
      data: {
        totalUploads: totalUploads || 0,
        successfulUploads: successfulUploads || 0,
        avgConfidence: Math.round(avgConfidence * 100) || 0, // Convert to percentage and round
        avgProcessTime: Math.round(avgProcessTime) || 0 // Round to whole number
      }
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error while fetching dashboard stats' 
    });
  }
});

export default router; 