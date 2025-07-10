import { Router, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { supabase } from '../server';
import { DatabaseLogger, PartSearchData, SearchHistoryData } from '../services/database-logger';
import { z } from 'zod';
import { Request } from 'express';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// Multer error handler
const handleMulterError = (err: any, _req: any, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size must be less than 10MB'
      });
    }
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  }
  
  if (err) {
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  }
  
  return next();
};

// File upload status endpoint
router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Check AI service health
    const aiServiceHealth = await axios.get(`${process.env.AI_SERVICE_URL}/health`, {
      timeout: 5000
    }).catch(() => null);

    return res.json({
      message: 'Upload service is running',
      max_file_size: '10MB',
      supported_formats: ['jpg', 'jpeg', 'png', 'webp'],
      user_id: req.user!.userId,
      ai_service_status: aiServiceHealth ? 'healthy' : 'unavailable'
    });
  } catch (error) {
    console.error('Upload status error:', error);
    return res.status(500).json({
      error: 'Failed to check service status'
    });
  }
});

// Image upload and analysis endpoint
router.post('/image', authenticateToken, upload.single('image'), handleMulterError, async (req: AuthRequest, res: Response) => {
  try {
    console.log('Upload request received:', {
      hasFile: !!req.file,
      contentType: req.headers['content-type'],
      body: req.body,
      user: req.user?.userId
    });

    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({
        error: 'No image file provided'
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const userId = req.user!.userId;

    console.log('File details:', {
      originalname,
      mimetype,
      size,
      userId
    });

    // Step 1: Upload image to Supabase Storage for persistence
    const fileName = `${userId}/${Date.now()}-${originalname}`;
    const { data: _storageData, error: storageError } = await supabase.storage
      .from('parts')
      .upload(fileName, buffer, {
        contentType: mimetype,
        cacheControl: '3600'
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      return res.status(500).json({
        error: 'Failed to store image'
      });
    }

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('parts')
      .getPublicUrl(fileName);

    // Step 2: Send image to AI service for analysis
    console.log('Preparing AI service request:', {
      aiServiceUrl: process.env.AI_SERVICE_URL,
      hasApiKey: !!process.env.AI_SERVICE_API_KEY,
      fileSize: buffer.length
    });

    const formData = new FormData();
    formData.append('file', buffer, {
      filename: originalname,
      contentType: mimetype
    });

    // Add metadata if provided
    if (req.body.metadata) {
      const metadata = typeof req.body.metadata === 'string' 
        ? JSON.parse(req.body.metadata) 
        : req.body.metadata;
      
      formData.append('confidence_threshold', metadata.confidenceThreshold || '0.5');
      formData.append('include_external_search', 'true');
    }

    console.log('Sending request to AI service...');
    
    let aiResponse;
    try {
      aiResponse = await axios.post(
        `${process.env.AI_SERVICE_URL}/predict`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`
          },
          timeout: 30000 // 30 second timeout
        }
      );
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // If AI service is down, save the upload with a placeholder response
      const fallbackData: PartSearchData = {
        id: `upload_${Date.now()}`,
        user_id: userId,
        image_url: urlData.publicUrl,
        image_name: originalname,
        predictions: [],
        confidence_score: 0,
        processing_time: 0,
        ai_model_version: 'offline',
        analysis_status: 'failed',
        error_message: 'AI service unavailable',
        image_size_bytes: size,
        image_format: mimetype,
        upload_source: 'web',
        web_scraping_used: false,
        sites_searched: 0,
        parts_found: 0,
        metadata: {
          ai_service_error: axios.isAxiosError(aiError) ? aiError.response?.status : 'unknown'
        }
      };

      // Save the failed attempt to database using enhanced logger
      const logResult = await DatabaseLogger.logPartSearch(fallbackData);
      if (!logResult.success) {
        console.error('Database logging error for failed upload:', logResult.error);
      }

      // Also log search history
      const searchHistoryData: SearchHistoryData = {
        user_id: userId,
        part_search_id: fallbackData.id,
        search_type: 'image_upload',
        search_query: originalname,
        results_count: 0,
        session_id: req.headers['x-session-id'] as string,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      };
      await DatabaseLogger.logSearchHistory(searchHistoryData);

      // Return a fallback response
      return res.status(503).json({
        success: false,
        error: 'AI service temporarily unavailable',
        message: 'Your image was uploaded successfully, but our AI analysis service is currently down. Please try again later.',
        id: fallbackData.id,
        image_url: urlData.publicUrl,
        retry_suggested: true
      });
    }

    console.log('AI service response received:', {
      status: aiResponse.status,
      hasData: !!aiResponse.data,
      requestId: aiResponse.data?.request_id,
      predictionsCount: aiResponse.data?.predictions?.length || 0
    });

    // Step 3: Save analysis result to database using enhanced logger
    const analysisData: PartSearchData = {
      id: aiResponse.data.request_id,
      user_id: userId,
      image_url: urlData.publicUrl,
      image_name: originalname,
      predictions: aiResponse.data.predictions || [],
      confidence_score: aiResponse.data.predictions?.[0]?.confidence || 0,
      processing_time: aiResponse.data.processing_time || 0,
      ai_model_version: aiResponse.data.model_version || 'Google Vision API v1',
      analysis_status: 'completed',
      image_size_bytes: size,
      image_format: mimetype,
      upload_source: 'web',
      web_scraping_used: !!(aiResponse.data.similar_images && aiResponse.data.similar_images.length > 0),
      sites_searched: aiResponse.data.image_metadata?.web_scraping_used ? 1 : 0,
      parts_found: aiResponse.data.similar_images?.length || 0,
      similar_images: aiResponse.data.similar_images || [],
      search_query: aiResponse.data.predictions?.[0]?.class_name,
      metadata: {
        ...aiResponse.data.image_metadata,
        ...req.body.metadata && JSON.parse(req.body.metadata)
      }
    };

    const logResult = await DatabaseLogger.logPartSearch(analysisData);
    if (!logResult.success) {
      console.error('Database logging error:', logResult.error);
      // Continue anyway - the AI analysis was successful
    }

    // Also log search history for successful uploads
    const searchHistoryData: SearchHistoryData = {
      user_id: userId,
      part_search_id: analysisData.id,
      search_type: 'image_upload',
      search_query: originalname,
      results_count: (aiResponse.data.predictions?.length || 0) + (aiResponse.data.similar_images?.length || 0),
      session_id: req.headers['x-session-id'] as string,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };
    await DatabaseLogger.logSearchHistory(searchHistoryData);

    // Step 4: Return results to frontend
    return res.json({
      success: true,
      id: aiResponse.data.request_id,
      image_url: urlData.publicUrl,
      predictions: aiResponse.data.predictions || [],
      processing_time: aiResponse.data.processing_time || 0,
      model_version: aiResponse.data.model_version,
      confidence: aiResponse.data.predictions?.[0]?.confidence || 0,
      metadata: {
        file_size: size,
        file_type: mimetype,
        upload_timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Image upload/analysis error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      isAxiosError: axios.isAxiosError(error)
    });

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'AI service error';
      
      console.error('Axios error details:', {
        status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      });
      
      return res.status(status).json({
        error: 'AI analysis failed',
        message,
        details: error.response?.data
      });
    }

    return res.status(500).json({
      error: 'Upload and analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get upload history for user
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Extract filters from query parameters
    const filters = {
      analysis_status: req.query.status as string,
      web_scraping_used: req.query.web_scraping === 'true' ? true : req.query.web_scraping === 'false' ? false : undefined,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === undefined) {
        delete filters[key as keyof typeof filters];
      }
    });

    const historyResult = await DatabaseLogger.getUserHistory(req.user!.userId, page, limit, filters);

    return res.json({
      success: true,
      searches: historyResult.data,
      page: historyResult.page,
      limit: historyResult.limit,
      total: historyResult.total,
      filters: filters
    });

  } catch (error) {
    console.error('Upload history error:', error);
    return res.status(500).json({
      error: 'Failed to fetch upload history'
    });
  }
});

// Get user statistics
router.get('/statistics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const statistics = await DatabaseLogger.getUserStatistics(req.user!.userId);
    
    return res.json({
      success: true,
      statistics: statistics || {
        total_uploads: 0,
        total_successful_identifications: 0,
        total_failed_identifications: 0,
        total_web_scraping_searches: 0,
        total_similar_parts_found: 0,
        average_confidence_score: 0,
        average_processing_time: 0,
        last_upload_at: null
      }
    });

  } catch (error) {
    console.error('User statistics error:', error);
    return res.status(500).json({
      error: 'Failed to fetch user statistics'
    });
  }
});

// Validation Schema for Part Analysis
const PartAnalysisSchema = z.object({
  part_name: z.string(),
  part_number: z.optional(z.string()),
  manufacturer: z.string(),
  category: z.string(),
  confidence_score: z.number().min(0).max(100),
  image_url: z.optional(z.string()),
  description: z.optional(z.string()),
  additional_details: z.optional(z.record(z.string(), z.any())),
});

// Store Part Analysis Endpoint
router.post('/store-analysis', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = PartAnalysisSchema.parse(req.body);

    // Get user ID from authenticated request
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Prepare data for insertion
    const analysisData = {
      user_id: userId,
      search_type: 'image',
      part_name: validatedData.part_name,
      part_number: validatedData.part_number,
      manufacturer: validatedData.manufacturer,
      category: validatedData.category,
      confidence_score: validatedData.confidence_score,
      image_url: validatedData.image_url,
      device_info: {
        user_agent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      },
      additional_details: validatedData.additional_details || {}
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('part_searches')
      .insert(analysisData)
      .select('id')
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Part analysis stored successfully',
      analysisId: data.id
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid data', 
        details: error.issues // Use .issues instead of .errors
      });
    }

    return res.status(500).json({ 
      error: 'Failed to store part analysis', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router; 