import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import winston from 'winston';
import { authenticateToken } from '../middleware/auth';  // Import authentication middleware

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

// Extend Request type to include user with zod validation
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.string()
});

interface AuthenticatedRequest extends Request {
  user?: z.infer<typeof UserSchema>;
}

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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const userId = req.user?.id;

      if (!userId) {
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
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return res.json({
        success: true,
        uploads: (data || []).map(upload => ({
          id: upload.id,
          image_name: upload.part_name || upload.search_term,
          created_at: upload.created_at,
          confidence_score: upload.confidence_score,
          part_details: {
            part_number: upload.part_number,
            manufacturer: upload.manufacturer
          }
        }))
      });
    } catch (error) {
      return handleDashboardError(res, error, 'Recent Uploads');
    }
  }
);

// Get recent activities
router.get('/recent-activities', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const userId = req.user?.id; // Assuming middleware adds user info

    if (!userId) {
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
      activities: (data || []).map(activity => ({
        id: activity.id,
        resource_type: 'part_search',
        action: activity.is_match ? 'match_found' : 'search_performed',
        details: {
          search_term: activity.search_term,
          search_type: activity.search_type,
          part_name: activity.part_name,
          manufacturer: activity.manufacturer,
          confidence: activity.confidence_score,
          status: activity.analysis_status || (activity.is_match ? 'success' : 'pending')
        },
        created_at: activity.created_at
      }))
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
router.get('/performance-metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id; // Assuming middleware adds user info

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Aggregate performance metrics from part_searches
    const { data, error } = await supabase
      .from('part_searches')
      .select(`
        count(*) as total_searches,
        avg(confidence_score) as avg_confidence,
        avg(processing_time_ms) as avg_process_time,
        sum(CASE WHEN is_match THEN 1 ELSE 0 END)::float / count(*) as match_rate
      `)
      .eq('user_id', userId)
      .single() as { data: PerformanceMetricsResult | null, error: any };

    if (error) {
      console.error('Performance Metrics Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    // Safely handle null data
    const metrics = data || {
      total_searches: 0,
      avg_confidence: 0,
      avg_process_time: 0,
      match_rate: 0
    };

    return res.json({
      success: true,
      data: {
        totalSearches: metrics.total_searches || 0,
        avgConfidence: metrics.avg_confidence || 0,
        avgProcessTime: metrics.avg_process_time || 0,
        matchRate: metrics.match_rate || 0,
        modelAccuracy: metrics.match_rate || 0,
        accuracyChange: 0, // TODO: Implement historical tracking
        searchesGrowth: 0, // TODO: Implement historical tracking
        avgResponseTime: metrics.avg_process_time || 0,
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
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
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

    return res.json({
      success: true,
      data: {
        totalUploads: totalUploads || 0,
        successfulUploads: successfulUploads || 0,
        avgConfidence: avgConfidence * 100, // Convert to percentage
        avgProcessTime: avgProcessTime
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