import { Router, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { supabase } from '../server';
import { DatabaseLogger, PartSearchData, SearchHistoryData } from '../services/database-logger';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { emailService, AnalysisEmailData } from '../services/email-service';
import { creditService, CreditResult } from '../services/credit-service';

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

    // Step 1: Check and deduct credits before processing
    console.log('Checking user credits for analysis...');
    const creditResult: CreditResult = await creditService.processAnalysisCredits(userId);
    
    if (!creditResult.success) {
      console.log('Insufficient credits for user:', userId, creditResult);
      return res.status(402).json({
        success: false,
        error: 'insufficient_credits',
        message: 'You do not have enough credits to perform this analysis',
        current_credits: creditResult.current_credits || 0,
        required_credits: creditResult.required_credits || 1,
        upgrade_required: true
      });
    }

    console.log('Credits deducted successfully:', {
      userId,
      credits_before: creditResult.credits_before,
      credits_after: creditResult.credits_after
    });

    // Step 2: Upload image to Supabase Storage for persistence
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

    // Step 3: Check AI service availability and send image for analysis
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
        id: uuidv4(),
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
          timeout: 120000, // 120 second timeout to accommodate longer AI analysis
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
        id: uuidv4(),
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

      // Refund credits since analysis failed
      console.log('Analysis failed, refunding credits to user:', userId);
      try {
        const refundResult = await creditService.refundAnalysisCredits(userId, `Analysis failed: ${errorMessage}`);
        if (refundResult.success) {
          console.log('Credits refunded successfully:', refundResult);
        } else {
          console.error('Failed to refund credits:', refundResult.error);
        }
      } catch (refundError) {
        console.error('Error during credit refund:', refundError);
      }

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
        },
        credits_refunded: true
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

    // Step 4: Save analysis result to database using enhanced logger
    // Handle both flat format (new) and predictions array (legacy)
    const isFlat = aiResponse.data.class_name || aiResponse.data.precise_part_name;
    const partName = isFlat ? 
      (aiResponse.data.precise_part_name || aiResponse.data.class_name) :
      aiResponse.data.predictions?.[0]?.class_name;
    const confidence = isFlat ? 
      (aiResponse.data.confidence_score || 0) / 100 : // Convert percentage to decimal
      (aiResponse.data.predictions?.[0]?.confidence || 0);
    const processingTime = isFlat ?
      (aiResponse.data.processing_time_seconds || 0) :
      (aiResponse.data.processing_time || 0);

    const analysisData: PartSearchData = {
      id: aiResponse.data.filename && aiResponse.data.filename.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) 
        ? aiResponse.data.filename 
        : uuidv4(),
      user_id: userId,
      image_url: urlData.publicUrl,
      image_name: originalname,
      predictions: isFlat ? [{
        class_name: partName,
        confidence: confidence,
        description: aiResponse.data.description || aiResponse.data.full_analysis || '',
        category: aiResponse.data.category || 'Unknown',
        manufacturer: aiResponse.data.manufacturer || 'Unknown'
      }] : (aiResponse.data.predictions || []),
      confidence_score: confidence,
      processing_time: processingTime,
      ai_model_version: aiResponse.data.model_version || 'SpareFinderAI v1.0',
      analysis_status: aiResponse.data.success ? 'completed' : 'failed',
      image_size_bytes: size,
      image_format: mimetype,
      upload_source: 'web',
      web_scraping_used: false,
      sites_searched: 0,
      parts_found: isFlat ? (partName ? 1 : 0) : (aiResponse.data.predictions?.length || 0),
      similar_images: [],
      search_query: partName,
      metadata: {
        filename: aiResponse.data.filename,
        analysis: aiResponse.data.full_analysis || aiResponse.data.description || aiResponse.data.analysis,
        flat_data: isFlat ? aiResponse.data : undefined, // Store full flat response
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
      results_count: isFlat ? (partName ? 1 : 0) : ((aiResponse.data.predictions?.length || 0) + (aiResponse.data.similar_images?.length || 0)),
      session_id: req.headers['x-session-id'] as string,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };
    await DatabaseLogger.logSearchHistory(searchHistoryData);

    // Step 5: Send email notification for successful analysis
    if (aiResponse.data.success && partName) {
      try {
        // Get user details for email
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single();

        if (userProfile?.email) {
          const emailData: AnalysisEmailData = {
            userEmail: userProfile.email,
            userName: userProfile.full_name || 'User',
            partName: partName,
            confidence: confidence,
            description: aiResponse.data.description || aiResponse.data.full_analysis || 'Part analysis completed successfully',
            imageUrl: urlData.publicUrl,
            analysisId: analysisData.id,
            processingTime: processingTime
          };

          // Send email notification (non-blocking)
          emailService.sendAnalysisCompleteEmail(emailData).catch(error => {
            console.error('Failed to send analysis complete email:', error);
          });

          console.log('✅ Email notification triggered for successful analysis:', partName);
        }
      } catch (emailError) {
        console.error('Error preparing email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Step 6: Return results to frontend
    // Return flat format directly if available, otherwise legacy format
    if (isFlat) {
      return res.json({
        success: aiResponse.data.success || true,
        data: aiResponse.data, // Return the flat data structure
        id: aiResponse.data.filename,
        image_url: urlData.publicUrl,
        predictions: analysisData.predictions, // Backward compatibility
        processing_time: processingTime,
        model_version: aiResponse.data.model_version,
        confidence: (aiResponse.data.confidence_score || 0),
        analysis: aiResponse.data.full_analysis || aiResponse.data.description,
        metadata: {
          file_size: size,
          file_type: mimetype,
          upload_timestamp: new Date().toISOString(),
          filename: aiResponse.data.filename
        }
      });
    } else {
      // Legacy format response
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
    }

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

    // Refund credits since upload/analysis failed
    try {
      const userId = req.user?.userId;
      if (userId) {
        console.log('General error occurred, refunding credits to user:', userId);
        const refundResult = await creditService.refundAnalysisCredits(userId, `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        if (refundResult.success) {
          console.log('Credits refunded successfully after general error:', refundResult);
        }
      }
    } catch (refundError) {
      console.error('Error during credit refund in catch block:', refundError);
    }

    return res.status(500).json({
      error: 'Upload and analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      credits_refunded: true
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

// Validation Schema for Analysis Results from Frontend - Enhanced for comprehensive data
const AnalysisResultsSchema = z.object({
  success: z.boolean(),
  predictions: z.array(z.object({
    class_name: z.string(),
    confidence: z.number().min(0).max(1),
    description: z.union([z.string(), z.null()]).optional(),
    category: z.union([z.string(), z.null()]).optional(),
    manufacturer: z.union([z.string(), z.null()]).optional(),
    estimated_price: z.union([
      z.string(), 
      z.object({
        new: z.string().optional(),
        used: z.string().optional(),
        refurbished: z.string().optional()
      }),
      z.null()
    ]).optional(),
    part_number: z.union([z.string(), z.null()]).optional(),
    compatibility: z.union([z.array(z.string()), z.null()]).optional()
  })),
  similar_images: z.union([z.array(z.any()), z.null()]).optional(),
  model_version: z.string(),
  processing_time: z.number(),
  image_metadata: z.object({
    content_type: z.string(),
    size_bytes: z.number(),
    base64_image: z.union([z.string(), z.null()]).optional()
  }),
  additional_details: z.object({
    full_analysis: z.union([z.string(), z.null()]).optional(),
    technical_specifications: z.union([z.string(), z.null()]).optional(),
    market_information: z.union([z.string(), z.null()]).optional(),
    confidence_reasoning: z.union([z.string(), z.null()]).optional(),
  }).optional(),
  image_url: z.union([z.string(), z.null()]).optional(),
  image_name: z.union([z.string(), z.null()]).optional(),
  // Additional fields from AI service response
  analysis: z.union([z.string(), z.null()]).optional(),
  confidence: z.union([z.number(), z.null()]).optional(),
  metadata: z.object({
    ai_service_id: z.union([z.string(), z.null()]).optional(),
    upload_timestamp: z.string().optional(),
    frontend_version: z.string().optional(),
    model_version: z.string().optional(),
    processing_time: z.number().optional(),
    // Enhanced flat data structure
    flat_data: z.object({
      class_name: z.union([z.string(), z.null()]).optional(),
      category: z.union([z.string(), z.null()]).optional(),
      precise_part_name: z.union([z.string(), z.null()]).optional(),
      material_composition: z.union([z.string(), z.null()]).optional(),
      manufacturer: z.union([z.string(), z.null()]).optional(),
      confidence_score: z.union([z.number(), z.null()]).optional(),
      estimated_price: z.union([
        z.string(), 
        z.object({
          new: z.string().optional(),
          used: z.string().optional(),
          refurbished: z.string().optional()
        }),
        z.null()
      ]).optional(),
      technical_data_sheet: z.union([z.any(), z.null()]).optional(),
      compatible_vehicles: z.union([z.array(z.string()), z.null()]).optional(),
      engine_types: z.union([z.array(z.string()), z.null()]).optional(),
      suppliers: z.union([z.array(z.any()), z.null()]).optional(),
      buy_links: z.union([z.any(), z.null()]).optional(),
      fitment_tips: z.union([z.string(), z.null()]).optional(),
      additional_instructions: z.union([z.string(), z.null()]).optional()
    }).optional(),
    // Enhanced analysis sections
    enhanced_sections: z.object({
      part_identification: z.object({
        name: z.union([z.string(), z.null()]).optional(),
        category: z.union([z.string(), z.null()]).optional(),
        manufacturer: z.union([z.string(), z.null()]).optional(),
        part_number: z.union([z.string(), z.null()]).optional()
      }).optional(),
      technical_analysis: z.object({
        material: z.union([z.string(), z.null()]).optional(),
        specifications: z.union([z.any(), z.null()]).optional(),
        compatibility: z.union([z.array(z.string()), z.null()]).optional()
      }).optional(),
      market_analysis: z.object({
        price_estimate: z.union([
          z.string(), 
          z.object({
            new: z.string().optional(),
            used: z.string().optional(),
            refurbished: z.string().optional()
          }),
          z.null()
        ]).optional(),
        suppliers: z.union([z.array(z.any()), z.null()]).optional(),
        purchase_links: z.union([z.any(), z.null()]).optional()
      }).optional(),
      ai_insights: z.object({
        confidence_score: z.union([z.number(), z.null()]).optional(),
        confidence_explanation: z.union([z.string(), z.null()]).optional(),
        full_analysis: z.union([z.string(), z.null()]).optional()
      }).optional()
    }).optional()
  }).optional()
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
    const analysisId = uuidv4();

    // Extract the full analysis from multiple sources - prioritize the most comprehensive
    const fullAnalysis = validatedData.metadata?.enhanced_sections?.ai_insights?.full_analysis ||
                        (req.body as any).analysis || 
                        validatedData.additional_details?.full_analysis || 
                        primaryPrediction.description || '';

    // Extract enhanced part information
    const partInfo = {
      name: validatedData.metadata?.enhanced_sections?.part_identification?.name || 
            validatedData.metadata?.flat_data?.precise_part_name ||
            primaryPrediction.class_name,
      category: validatedData.metadata?.enhanced_sections?.part_identification?.category ||
               validatedData.metadata?.flat_data?.category ||
               primaryPrediction.category,
      manufacturer: validatedData.metadata?.enhanced_sections?.part_identification?.manufacturer ||
                   validatedData.metadata?.flat_data?.manufacturer ||
                   primaryPrediction.manufacturer,
      part_number: validatedData.metadata?.enhanced_sections?.part_identification?.part_number ||
                  primaryPrediction.part_number
    };

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
      search_query: partInfo.name,
      description: fullAnalysis,
      similar_images: validatedData.similar_images || [],
      metadata: {
        saved_manually: true,
        save_timestamp: new Date().toISOString(),
        user_agent: req.headers['user-agent'],
        
        // Store comprehensive analysis details
        additional_details: validatedData.additional_details,
        full_analysis_data: validatedData,
        full_analysis: fullAnalysis,
        
        // Enhanced part information
        enhanced_part_info: partInfo,
        
        // Technical specifications
        technical_data_sheet: validatedData.metadata?.flat_data?.technical_data_sheet,
        material_composition: validatedData.metadata?.flat_data?.material_composition,
        compatible_vehicles: validatedData.metadata?.flat_data?.compatible_vehicles,
        engine_types: validatedData.metadata?.flat_data?.engine_types,
        
        // Market information
        estimated_price: validatedData.metadata?.flat_data?.estimated_price ||
                        validatedData.metadata?.enhanced_sections?.market_analysis?.price_estimate,
        suppliers: validatedData.metadata?.flat_data?.suppliers ||
                  validatedData.metadata?.enhanced_sections?.market_analysis?.suppliers,
        buy_links: validatedData.metadata?.flat_data?.buy_links ||
                  validatedData.metadata?.enhanced_sections?.market_analysis?.purchase_links,
        
        // Installation and usage information
        fitment_tips: validatedData.metadata?.flat_data?.fitment_tips,
        additional_instructions: validatedData.metadata?.flat_data?.additional_instructions,
        
        // AI analysis insights
        confidence_score: validatedData.metadata?.flat_data?.confidence_score ||
                         validatedData.metadata?.enhanced_sections?.ai_insights?.confidence_score,
        confidence_explanation: validatedData.metadata?.enhanced_sections?.ai_insights?.confidence_explanation,
        
        // Legacy compatibility
        analysis: fullAnalysis,
        confidence: (req.body as any).confidence || primaryPrediction.confidence,
        ai_metadata: validatedData.metadata || {},
        supabase_image_url: validatedData.image_url,
        
        // Complete flat data structure for future reference
        complete_flat_data: validatedData.metadata?.flat_data,
        complete_enhanced_sections: validatedData.metadata?.enhanced_sections
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
    const searchType: SearchHistoryData['search_type'] = 
      validatedData.image_metadata?.content_type === 'text/keywords' ? 'text_search' : 'image_upload';
    const searchHistoryData: SearchHistoryData = {
      user_id: userId,
      part_search_id: analysisId,
      search_type: searchType,
      search_query: `Manual save: ${primaryPrediction.class_name}`,
      results_count: validatedData.predictions.length,
      session_id: req.headers['x-session-id'] as string,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    await DatabaseLogger.logSearchHistory(searchHistoryData);

    // Send email notification for manually saved analysis results
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (userProfile?.email) {
        const emailData: AnalysisEmailData = {
          userEmail: userProfile.email,
          userName: userProfile.full_name || 'User',
          partName: primaryPrediction.class_name,
          confidence: primaryPrediction.confidence,
          description: fullAnalysis || primaryPrediction.description || 'Part analysis saved to your history',
          imageUrl: validatedData.image_url || undefined,
          analysisId: analysisId,
          processingTime: validatedData.processing_time
        };

        // Send email notification (non-blocking)
        emailService.sendAnalysisCompleteEmail(emailData).catch(error => {
          console.error('Failed to send save results email:', error);
        });

        console.log('✅ Email notification triggered for saved analysis:', primaryPrediction.class_name);
      }
    } catch (emailError) {
      console.error('Error preparing save results email notification:', emailError);
      // Don't fail the request if email fails
    }

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
    const analysisId = uuidv4();

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