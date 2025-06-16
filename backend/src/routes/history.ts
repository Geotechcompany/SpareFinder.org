import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { supabase } from '../server';

const router = Router();

// Get upload history with pagination and filters
router.get('/uploads', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Build query with optional filters
    let query = supabase
      .from('part_searches')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (req.query.date_from) {
      query = query.gte('created_at', req.query.date_from as string);
    }
    if (req.query.date_to) {
      query = query.lte('created_at', req.query.date_to as string);
    }
    if (req.query.min_confidence) {
      query = query.gte('confidence_score', parseFloat(req.query.min_confidence as string));
    }
    if (req.query.search) {
      query = query.ilike('image_name', `%${req.query.search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: uploads, error, count } = await query;

    if (error) {
      console.error('Error fetching upload history:', error);
      return res.status(500).json({
        error: 'Failed to fetch upload history'
      });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return res.json({
      uploads: uploads || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    });

  } catch (error) {
    console.error('Upload history error:', error);
    return res.status(500).json({
      error: 'Failed to fetch upload history'
    });
  }
});

// Delete a specific upload
router.delete('/uploads/:uploadId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const uploadId = req.params.uploadId;

    // First check if the upload belongs to the user
    const { data: upload, error: fetchError } = await supabase
      .from('part_searches')
      .select('id, image_url')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !upload) {
      return res.status(404).json({
        error: 'Upload not found'
      });
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('part_searches')
      .delete()
      .eq('id', uploadId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting upload:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete upload'
      });
    }

    // Optionally delete image from storage
    if (upload.image_url) {
      try {
        const imagePath = upload.image_url.split('/').pop();
        if (imagePath) {
          await supabase.storage
            .from('parts')
            .remove([`${userId}/${imagePath}`]);
        }
      } catch (storageError) {
        console.warn('Failed to delete image from storage:', storageError);
        // Continue anyway - database record is deleted
      }
    }

    return res.json({
      message: 'Upload deleted successfully'
    });

  } catch (error) {
    console.error('Delete upload error:', error);
    return res.status(500).json({
      error: 'Failed to delete upload'
    });
  }
});

// Export history data
router.get('/export', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const format = req.query.format as string || 'csv';

    const { data: uploads, error } = await supabase
      .from('part_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching uploads for export:', error);
      return res.status(500).json({
        error: 'Failed to export history'
      });
    }

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = 'ID,Image Name,Upload Date,Confidence Score,Processing Time,Predictions Count\n';
      const csvRows = (uploads || []).map(upload => {
        const predictionsCount = Array.isArray(upload.predictions) ? upload.predictions.length : 0;
        return [
          upload.id,
          upload.image_name || '',
          upload.created_at,
          upload.confidence_score || 0,
          upload.processing_time || 0,
          predictionsCount
        ].join(',');
      }).join('\n');

      const csvContent = csvHeaders + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="upload_history.csv"');
      return res.send(csvContent);
    } else {
      // Return JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="upload_history.json"');
      return res.json({
        exports: uploads || [],
        exported_at: new Date().toISOString(),
        total_records: uploads?.length || 0
      });
    }

  } catch (error) {
    console.error('Export history error:', error);
    return res.status(500).json({
      error: 'Failed to export history'
    });
  }
});

export default router; 