import { Router, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { supabase } from '../server';
import { DatabaseLogger, PartSearchData, SearchHistoryData } from '../services/database-logger';
import { z } from 'zod';

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
    const aiServiceUrl = process.env.AI_SERVICE_URL;
    let aiServiceStatus = 'not_configured';
    let aiServiceDetails = null;

    // Check AI service health if configured
    if (aiServiceUrl) {
      try {
        const aiServiceHealth = await axios.get(`${aiServiceUrl}/health`, {
          timeout: 5000,
          validateStatus: (status) => status < 500
        });
        
        aiServiceStatus = 'healthy';
        aiServiceDetails = {
          url: aiServiceUrl,
          status: aiServiceHealth.status,
          response_time: aiServiceHealth.headers['x-response-time'] || 'unknown'
        };
      } catch (error) {
        aiServiceStatus = 'unavailable';
        aiServiceDetails = {
          url: aiServiceUrl,
          error: axios.isAxiosError(error) ? {
            code: error.code,
            status: error.response?.status,
            message: error.message
          } : 'Unknown error'
        };
      }
    }

    return res.json({
      message: 'Upload service is running',
      max_file_size: '10MB',
      supported_formats: ['jpg', 'jpeg', 'png', 'webp'],
      user_id: req.user!.userId,
      ai_service_status: aiServiceStatus,
      ai_service_details: aiServiceDetails,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Upload status error:', error);
    return res.status(500).json({
      error: 'Failed to check service status',
      message: error instanceof Error ? error.message : 'Unknown error'
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
    const bucketName = process.env.SUPABASE_BUCKET_NAME || 'sparefinder';
    const fileName = `${userId}/${Date.now()}-${originalname}`;
    const { data: _storageData, error: storageError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: mimetype,
        cacheControl: '3600'
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      return res.status(500).json({
        error: 'Failed to store image',
        details: storageError
      });
    }

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    // Step 2: Check AI service availability and send image for analysis
    const aiServiceUrl = process.env.AI_SERVICE_URL;
    const aiServiceApiKey = process.env.AI_SERVICE_API_KEY;
    
    console.log('Preparing AI service request:', {
      aiServiceUrl,
      hasApiKey: !!aiServiceApiKey,
      fileSize: buffer.length
    });

    // Check if AI service is configured
    if (!aiServiceUrl) {
      console.error('AI_SERVICE_URL not configured');
      return res.status(500).json({
        success: false,
        error: 'AI service not configured',
        message: 'The AI analysis service is not properly configured. Please contact support.',
        id: `upload_${Date.now()}`,
        image_url: urlData.publicUrl
      });
    }

    const formData = new FormData();
    formData.append('file', buffer, {
      filename: originalname,
      contentType: mimetype
    });

    // Add metadata if provided
    if (req.body.metadata) {
      try {
        const metadata = typeof req.body.metadata === 'string' 
          ? JSON.parse(req.body.metadata) 
          : req.body.metadata;
        
        formData.append('confidence_threshold', metadata.confidenceThreshold || '0.5');
        formData.append('include_external_search', 'true');
      } catch (metadataError) {
        console.warn('Invalid metadata format:', metadataError);
      }
    }

    console.log('Sending request to AI service...');
    
    let aiResponse;
    try {
      // First check if AI service is healthy
      const healthCheck = await axios.get(`${aiServiceUrl}/health`, {
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept 4xx as valid response
      }).catch(() => null);

      if (!healthCheck) {
        throw new Error('AI service health check failed');
      }

      // Send the actual prediction request
      aiResponse = await axios.post(
        `${aiServiceUrl}/analyze-part/`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            ...(aiServiceApiKey && { 'Authorization': `Bearer ${aiServiceApiKey}` })
          },
          timeout: 30000, // 30 second timeout
          validateStatus: (status) => status < 500 // Accept 4xx as valid response
        }
      );
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Determine error type
      let errorType = 'unknown';
      let errorMessage = 'AI service unavailable';
      
      if (axios.isAxiosError(aiError)) {
        if (aiError.code === 'ECONNREFUSED' || aiError.code === 'ENOTFOUND') {
          errorType = 'connection_refused';
          errorMessage = 'Cannot connect to AI service';
        } else if (aiError.code === 'ECONNABORTED') {
          errorType = 'timeout';
          errorMessage = 'AI service request timed out';
        } else if (aiError.response?.status === 401) {
          errorType = 'unauthorized';
          errorMessage = 'AI service authentication failed';
        } else if (aiError.response?.status === 413) {
          errorType = 'file_too_large';
          errorMessage = 'Image file is too large for AI service';
        } else if (aiError.response?.status && aiError.response.status >= 400 && aiError.response.status < 500) {
          errorType = 'client_error';
          errorMessage = `AI service error: ${aiError.response.data?.message || aiError.response.statusText}`;
        } else {
          errorType = 'server_error';
          errorMessage = 'AI service is experiencing issues';
        }
      }
      
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
        error_message: errorMessage,
        image_size_bytes: size,
        image_format: mimetype,
        upload_source: 'web',
        web_scraping_used: false,
        sites_searched: 0,
        parts_found: 0,
        metadata: {
          ai_service_error: errorType,
          ai_service_url: aiServiceUrl,
          error_details: axios.isAxiosError(aiError) ? {
            code: aiError.code,
            status: aiError.response?.status,
            statusText: aiError.response?.statusText
          } : undefined
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

      // Return appropriate error based on type
      const statusCode = errorType === 'file_too_large' ? 413 : 
                        errorType === 'unauthorized' ? 401 : 
                        errorType === 'client_error' ? 400 : 503;

      return res.status(statusCode).json({
        success: false,
        error: errorType,
        message: errorMessage,
        id: fallbackData.id,
        image_url: urlData.publicUrl,
        retry_suggested: ['connection_refused', 'timeout', 'server_error'].includes(errorType),
        troubleshooting: {
          ai_service_url: aiServiceUrl,
          error_type: errorType,
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log('AI service response received:', {
      status: aiResponse.status,
      hasData: !!aiResponse.data,
      filename: aiResponse.data?.filename,
      predictionsCount: aiResponse.data?.predictions?.length || 0,
      aiServiceStatus: aiResponse.data?.status,
      success: aiResponse.data?.success
    });

    // Debug: Log the full AI response
    console.log('Full AI service response:', JSON.stringify(aiResponse.data, null, 2));

    // Step 3: Save analysis result to database using enhanced logger
    const analysisData: PartSearchData = {
      id: aiResponse.data.filename || `upload_${Date.now()}`,
      user_id: userId,
      image_url: urlData.publicUrl,
      image_name: originalname,
      predictions: aiResponse.data.predictions || [],
      confidence_score: aiResponse.data.predictions?.[0]?.confidence || 0,
      processing_time: aiResponse.data.processing_time || 0,
      ai_model_version: aiResponse.data.model_version || 'SpareFinderAI v1.0',
      analysis_status: aiResponse.data.success ? 'completed' : 'failed',
      image_size_bytes: size,
      image_format: mimetype,
      upload_source: 'web',
      web_scraping_used: false,
      sites_searched: 0,
      parts_found: aiResponse.data.predictions?.length || 0,
      similar_images: [],
      search_query: aiResponse.data.predictions?.[0]?.class_name,
      metadata: {
        filename: aiResponse.data.filename,
        analysis: aiResponse.data.analysis,
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
      success: aiResponse.data.success || true,
      data: aiResponse.data.predictions || [],
      id: aiResponse.data.filename,
      image_url: urlData.publicUrl,
      predictions: aiResponse.data.predictions || [],
      processing_time: aiResponse.data.processing_time || 0,
      model_version: aiResponse.data.model_version,
      confidence: aiResponse.data.predictions?.[0]?.confidence || 0,
      analysis: aiResponse.data.analysis,
      metadata: {
        file_size: size,
        file_type: mimetype,
        upload_timestamp: new Date().toISOString(),
        filename: aiResponse.data.filename
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

// Validation Schema for Analysis Results from Frontend
const AnalysisResultsSchema = z.object({
  success: z.boolean(),
  predictions: z.array(z.object({
    class_name: z.string(),
    confidence: z.number().min(0).max(1),
    description: z.string().optional(),
    category: z.string().optional(),
    manufacturer: z.string().optional(),
    estimated_price: z.string().optional(),
    part_number: z.string().optional(),
    compatibility: z.array(z.string()).optional()
  })),
  similar_images: z.array(z.any()).optional(),
  model_version: z.string(),
  processing_time: z.number(),
  image_metadata: z.object({
    content_type: z.string(),
    size_bytes: z.number(),
    base64_image: z.string().optional()
  }),
  additional_details: z.object({
    full_analysis: z.string().optional(),
    technical_specifications: z.string().optional(),
    market_information: z.string().optional(),
    confidence_reasoning: z.string().optional(),
  }).optional(),
  image_url: z.string().optional(),
  image_name: z.string().optional()
});

// Save Analysis Results Endpoint
router.post('/save-results', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 Save results request received:', {
      user: req.user?.userId,
      hasData: !!req.body,
      dataKeys: Object.keys(req.body || {})
    });

    // Validate request body
    const validatedData = AnalysisResultsSchema.parse(req.body);
    const userId = req.user!.userId;

    // Extract primary prediction data
    const primaryPrediction = validatedData.predictions[0];
    
    if (!primaryPrediction) {
      return res.status(400).json({
        success: false,
        error: 'No predictions provided',
        message: 'At least one prediction is required to save results'
      });
    }

    // Generate unique ID for this analysis
    const analysisId = `saved_${Date.now()}_${userId.slice(-8)}`;

    // Prepare comprehensive analysis data for database
    const analysisData: PartSearchData = {
      id: analysisId,
      user_id: userId,
      image_url: validatedData.image_url || '',
      image_name: validatedData.image_name || 'manual_save.jpg',
      predictions: validatedData.predictions,
      confidence_score: primaryPrediction.confidence,
      processing_time: validatedData.processing_time,
      ai_model_version: validatedData.model_version,
      analysis_status: 'completed',
      image_size_bytes: validatedData.image_metadata.size_bytes,
      image_format: validatedData.image_metadata.content_type,
      upload_source: 'manual_save',
      web_scraping_used: false,
      sites_searched: 0,
      parts_found: validatedData.predictions.length,
      search_query: primaryPrediction.class_name,
      similar_images: validatedData.similar_images || [],
      metadata: {
        saved_manually: true,
        save_timestamp: new Date().toISOString(),
        user_agent: req.headers['user-agent'],
        additional_details: validatedData.additional_details,
        full_analysis_data: validatedData
      }
    };

    console.log('💾 Storing analysis data:', {
      id: analysisData.id,
      partName: primaryPrediction.class_name,
      confidence: primaryPrediction.confidence,
      predictionsCount: validatedData.predictions.length
    });

    // Save to database using DatabaseLogger
    const logResult = await DatabaseLogger.logPartSearch(analysisData);
    
    if (!logResult.success) {
      console.error('❌ Database save error:', logResult.error);
      return res.status(500).json({
        success: false,
        error: 'Database save failed',
        message: 'Failed to save analysis results to database',
        details: logResult.error
      });
    }

    // Also log this as a search history entry
    const searchHistoryData: SearchHistoryData = {
      user_id: userId,
      part_search_id: analysisId,
      search_type: 'image_upload',
      search_query: `Manual save: ${primaryPrediction.class_name}`,
      results_count: validatedData.predictions.length,
      session_id: req.headers['x-session-id'] as string,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    await DatabaseLogger.logSearchHistory(searchHistoryData);

    console.log('✅ Analysis results saved successfully:', analysisId);

    return res.status(201).json({
      success: true,
      message: 'Analysis results saved successfully',
      data: {
        analysis_id: analysisId,
        part_name: primaryPrediction.class_name,
        confidence: primaryPrediction.confidence,
        predictions_count: validatedData.predictions.length,
        saved_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('💥 Save results error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        message: 'The provided analysis data is not in the correct format',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Save failed',
      message: 'An unexpected error occurred while saving analysis results',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Legacy endpoint for backward compatibility
router.post('/store-analysis', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { part_name, part_number, manufacturer, category, confidence_score, image_url, description } = req.body;
    
    if (!part_name || !manufacturer || !category || confidence_score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'part_name, manufacturer, category, and confidence_score are required'
      });
    }

    const userId = req.user!.userId;
    const analysisId = `legacy_${Date.now()}_${userId.slice(-8)}`;

    // Convert to new format
    const analysisData: PartSearchData = {
      id: analysisId,
      user_id: userId,
      image_url: image_url || '',
      image_name: 'legacy_analysis.jpg',
      predictions: [{
        class_name: part_name,
        confidence: confidence_score / 100, // Convert percentage to decimal
        description: description || '',
        category: category,
        manufacturer: manufacturer,
        estimated_price: 'Price not available',
        part_number: part_number,
        compatibility: []
      }],
      confidence_score: confidence_score / 100,
      processing_time: 0,
      ai_model_version: 'Legacy Input',
      analysis_status: 'completed',
      upload_source: 'legacy_api',
      web_scraping_used: false,
      sites_searched: 0,
      parts_found: 1,
      search_query: part_name,
      metadata: {
        legacy_format: true,
        original_data: req.body
      }
    };

    const logResult = await DatabaseLogger.logPartSearch(analysisData);
    
    if (!logResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Database save failed',
        message: 'Failed to store analysis data'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Part analysis stored successfully',
      analysisId: analysisId
    });

  } catch (error) {
    console.error('Legacy store analysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Store failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 