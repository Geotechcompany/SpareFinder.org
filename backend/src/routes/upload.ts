import { Router, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { supabase } from '../server';

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
    const aiResponse = await axios.post(
      `${process.env.AI_SERVICE_URL}/predict/image`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('AI service response received:', {
      status: aiResponse.status,
      hasData: !!aiResponse.data,
      requestId: aiResponse.data?.request_id,
      predictionsCount: aiResponse.data?.predictions?.length || 0
    });

    // Step 3: Save analysis result to database
    const analysisResult = {
      id: aiResponse.data.request_id,
      user_id: userId,
      image_url: urlData.publicUrl,
      image_name: originalname,
      predictions: aiResponse.data.predictions || [],
      confidence_score: aiResponse.data.predictions?.[0]?.confidence || 0,
      processing_time: aiResponse.data.processing_time || 0,
      ai_model_version: aiResponse.data.model_version,
      status: 'completed' as const,
      metadata: {
        file_size: size,
        file_type: mimetype,
        ...req.body.metadata && JSON.parse(req.body.metadata)
      }
    };

    const { error: dbError } = await supabase
      .from('part_searches')
      .insert(analysisResult);

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Continue anyway - the AI analysis was successful
    }

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
    const offset = (page - 1) * limit;

    const { data: searches, error } = await supabase
      .from('part_searches')
      .select('*')
      .eq('user_id', req.user!.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('History fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch upload history'
      });
    }

    return res.json({
      searches: searches || [],
      page,
      limit,
      total: searches?.length || 0
    });

  } catch (error) {
    console.error('Upload history error:', error);
    return res.status(500).json({
      error: 'Failed to fetch upload history'
    });
  }
});

export default router; 