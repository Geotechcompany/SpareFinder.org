import { Router, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import { supabase } from '../server';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// AI Part prediction endpoint
router.post('/predict', [authenticateToken, upload.single('image')], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image provided',
        message: 'Please upload an image file'
      });
    }

    const confidence_threshold = parseFloat(req.body.confidence_threshold) || 0.5;
    const max_predictions = parseInt(req.body.max_predictions) || 5;
    const include_external_search = req.body.include_external_search === 'true';

    // Create FormData for AI service
    const formData = new FormData();
    const imageBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', imageBlob, req.file.originalname);

    // Call AI service
    const aiResponse = await axios.post(
      `${process.env.AI_SERVICE_URL}/predict/image`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`,
          'Content-Type': 'multipart/form-data'
        },
        params: {
          confidence_threshold,
          include_external_search
        },
        timeout: 30000 // 30 seconds
      }
    );

    const predictions = aiResponse.data;

    // Store search in database
    const { data: searchRecord, error: searchError } = await supabase
      .from('part_searches')
      .insert([
        {
          user_id: req.user!.userId,
          image_name: req.file.originalname,
          image_size: req.file.size,
          predictions: predictions.predictions || [],
          confidence_score: predictions.max_confidence || 0,
          processing_time: predictions.processing_time || 0,
          ai_model_version: predictions.model_version || 'unknown',
          metadata: {
            confidence_threshold,
            max_predictions,
            include_external_search,
            image_dimensions: predictions.image_info?.dimensions,
            file_type: req.file.mimetype
          }
        }
      ])
      .select()
      .single();

    if (searchError) {
      console.error('Search record creation error:', searchError);
      // Don't fail the request, just log the error
    }

    res.json({
      ...predictions,
      search_id: searchRecord?.id,
      message: 'Image analyzed successfully'
    });

  } catch (error) {
    console.error('Prediction error:', error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'AI service error';
      
      return res.status(status).json({
        error: 'AI prediction failed',
        message,
        details: error.response?.data
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during prediction'
    });
  }
});

// Search parts by number
router.get('/parts/:partNumber', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { partNumber } = req.params;

    // Call AI service for part search
    const aiResponse = await axios.get(
      `${process.env.AI_SERVICE_URL}/parts/search/number/${partNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`
        },
        timeout: 10000
      }
    );

    res.json(aiResponse.data);

  } catch (error) {
    console.error('Part search error:', error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Part search failed';
      
      return res.status(status).json({
        error: 'Part search failed',
        message,
        details: error.response?.data
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during part search'
    });
  }
});

// Search parts by description
router.get('/parts/search', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { description } = req.query;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({
        error: 'Missing description',
        message: 'Please provide a search description'
      });
    }

    // Call AI service for part search
    const aiResponse = await axios.get(
      `${process.env.AI_SERVICE_URL}/parts/search/description`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`
        },
        params: { description },
        timeout: 10000
      }
    );

    res.json(aiResponse.data);

  } catch (error) {
    console.error('Part description search error:', error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Part search failed';
      
      return res.status(status).json({
        error: 'Part search failed',
        message,
        details: error.response?.data
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during part search'
    });
  }
});

// Get part details
router.get('/parts/:partNumber/details', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { partNumber } = req.params;

    // Call AI service for part details
    const aiResponse = await axios.get(
      `${process.env.AI_SERVICE_URL}/parts/details/${partNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`
        },
        timeout: 10000
      }
    );

    res.json(aiResponse.data);

  } catch (error) {
    console.error('Part details error:', error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Part details fetch failed';
      
      return res.status(status).json({
        error: 'Part details fetch failed',
        message,
        details: error.response?.data
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching part details'
    });
  }
});

// Get search by ID
router.get('/:searchId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { searchId } = req.params;

    const { data: search, error } = await supabase
      .from('part_searches')
      .select('*')
      .eq('id', searchId)
      .eq('user_id', req.user!.userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Search not found',
          message: 'No search found with the provided ID'
        });
      }

      console.error('Search fetch error:', error);
      return res.status(500).json({
        error: 'Search fetch failed',
        message: 'Failed to retrieve search data'
      });
    }

    res.json({ search });

  } catch (error) {
    console.error('Get search error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching search data'
    });
  }
});

export default router; 