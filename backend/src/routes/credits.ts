import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { creditService } from '../services/credit-service';

const router = Router();

// Get user's current credit balance
router.get('/balance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const credits = await creditService.getUserCredits(userId);
    
    return res.json({
      success: true,
      credits,
      user_id: userId
    });

  } catch (error) {
    console.error('Get credit balance error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch credit balance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's credit transaction history
router.get('/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const transactions = await creditService.getCreditTransactions(userId, limit, offset);
    
    return res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total: transactions.length
      }
    });

  } catch (error) {
    console.error('Get credit transactions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch credit transactions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin endpoint: Add credits to a user
router.post('/add', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    const { data: userProfile } = await require('../server').supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user!.userId)
      .single();

    if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Admin access required'
      });
    }

    const { user_id, amount, reason } = req.body;

    if (!user_id || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: 'user_id and positive amount are required'
      });
    }

    const result = await creditService.addCredits(
      user_id, 
      amount, 
      reason || 'Admin credit grant'
    );
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to add credits'
      });
    }

    return res.json({
      success: true,
      message: 'Credits added successfully',
      result
    });

  } catch (error) {
    console.error('Add credits error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add credits',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin endpoint: Get credit statistics
router.get('/statistics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    const { data: userProfile } = await require('../server').supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user!.userId)
      .single();

    if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Admin access required'
      });
    }

    const statistics = await creditService.getCreditStatistics();
    
    return res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('Get credit statistics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch credit statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check if user has enough credits for an operation
router.get('/check/:amount', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const requiredCredits = parseInt(req.params.amount) || 1;
    
    const hasEnough = await creditService.hasEnoughCredits(userId, requiredCredits);
    const currentCredits = await creditService.getUserCredits(userId);
    
    return res.json({
      success: true,
      has_enough_credits: hasEnough,
      current_credits: currentCredits,
      required_credits: requiredCredits
    });

  } catch (error) {
    console.error('Check credits error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check credits',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 