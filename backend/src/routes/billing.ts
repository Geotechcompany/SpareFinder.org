import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { supabase } from '../server';

const router = Router();

// Subscription limits by tier
const SUBSCRIPTION_LIMITS = {
  free: {
    searches: 10,
    api_calls: 50,
    storage: 100 * 1024 * 1024 // 100MB
  },
  pro: {
    searches: 1000,
    api_calls: 5000,
    storage: 10 * 1024 * 1024 * 1024 // 10GB
  },
  enterprise: {
    searches: -1, // unlimited
    api_calls: -1, // unlimited
    storage: -1 // unlimited
  }
};

// Get billing information
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get subscription info
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError);
      return res.status(500).json({
        error: 'Failed to fetch subscription information'
      });
    }

    // Get current usage
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.warn('Error fetching usage:', usageError);
    }

    // Default subscription if none exists
    const defaultSubscription = {
      id: 'default',
      tier: 'free',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false
    };

    const userSubscription = subscription || defaultSubscription;
    const userUsage = usage || {
      searches_count: 0,
      api_calls_count: 0,
      storage_used: 0
    };

    const limits = SUBSCRIPTION_LIMITS[userSubscription.tier as keyof typeof SUBSCRIPTION_LIMITS];

    // Get recent invoices (mock data for now)
    const invoices = [
      {
        id: 'inv_001',
        amount: userSubscription.tier === 'pro' ? 29.99 : userSubscription.tier === 'enterprise' ? 99.99 : 0,
        currency: 'USD',
        status: 'paid',
        created_at: new Date().toISOString(),
        invoice_url: '#'
      }
    ];

    return res.json({
      subscription: userSubscription,
      usage: {
        current_period: {
          searches: userUsage.searches_count,
          api_calls: userUsage.api_calls_count,
          storage_used: userUsage.storage_used
        },
        limits: {
          searches: limits.searches,
          api_calls: limits.api_calls,
          storage: limits.storage
        }
      },
      invoices
    });

  } catch (error) {
    console.error('Get billing info error:', error);
    return res.status(500).json({
      error: 'Failed to fetch billing information'
    });
  }
});

// Update subscription
router.post('/subscription', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tier } = req.body;

    if (!tier || !['free', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({
        error: 'Invalid subscription tier'
      });
    }

    // Check if subscription exists
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', fetchError);
      return res.status(500).json({
        error: 'Failed to fetch current subscription'
      });
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    if (existingSubscription) {
      // Update existing subscription
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          tier,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return res.status(500).json({
          error: 'Failed to update subscription'
        });
      }

      return res.json({
        message: 'Subscription updated successfully',
        subscription: updatedSubscription,
        checkout_url: tier !== 'free' ? `${process.env.FRONTEND_URL}/checkout?tier=${tier}` : undefined
      });
    } else {
      // Create new subscription
      const { data: newSubscription, error: createError } = await supabase
        .from('subscriptions')
        .insert([
          {
            user_id: userId,
            tier,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('Error creating subscription:', createError);
        return res.status(500).json({
          error: 'Failed to create subscription'
        });
      }

      return res.json({
        message: 'Subscription created successfully',
        subscription: newSubscription,
        checkout_url: tier !== 'free' ? `${process.env.FRONTEND_URL}/checkout?tier=${tier}` : undefined
      });
    }

  } catch (error) {
    console.error('Update subscription error:', error);
    return res.status(500).json({
      error: 'Failed to update subscription'
    });
  }
});

// Cancel subscription
router.post('/subscription/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error canceling subscription:', error);
      return res.status(500).json({
        error: 'Failed to cancel subscription'
      });
    }

    return res.json({
      message: 'Subscription will be canceled at the end of the current period',
      subscription
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({
      error: 'Failed to cancel subscription'
    });
  }
});

// Get invoices
router.get('/invoices', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Get subscription to determine pricing
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, created_at')
      .eq('user_id', userId)
      .single();

    // Mock invoice data based on subscription
    const mockInvoices = [];
    if (subscription && subscription.tier !== 'free') {
      const amount = subscription.tier === 'pro' ? 29.99 : 99.99;
      const startDate = new Date(subscription.created_at);
      
      // Generate mock invoices for the last 6 months
      for (let i = 0; i < 6; i++) {
        const invoiceDate = new Date(startDate);
        invoiceDate.setMonth(invoiceDate.getMonth() + i);
        
        if (invoiceDate <= new Date()) {
          mockInvoices.push({
            id: `inv_${userId.slice(-8)}_${i + 1}`,
            amount,
            currency: 'USD',
            status: 'paid',
            created_at: invoiceDate.toISOString(),
            invoice_url: `${process.env.FRONTEND_URL}/invoices/inv_${userId.slice(-8)}_${i + 1}`
          });
        }
      }
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedInvoices = mockInvoices.slice(startIndex, endIndex);

    return res.json({
      invoices: paginatedInvoices,
      pagination: {
        page,
        limit,
        total: mockInvoices.length
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    return res.status(500).json({
      error: 'Failed to fetch invoices'
    });
  }
});

// Get usage statistics
router.get('/usage', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get current month usage
    const { data: currentUsage, error: currentError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single();

    // Get subscription to determine limits
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .single();

    if (currentError && currentError.code !== 'PGRST116') {
      console.warn('Error fetching current usage:', currentError);
    }

    if (subError && subError.code !== 'PGRST116') {
      console.warn('Error fetching subscription:', subError);
    }

    const tier = subscription?.tier || 'free';
    const limits = SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS];
    const usage = currentUsage || {
      searches_count: 0,
      api_calls_count: 0,
      storage_used: 0
    };

    return res.json({
      current_usage: {
        searches: usage.searches_count,
        api_calls: usage.api_calls_count,
        storage_used: usage.storage_used
      },
      limits: {
        searches: limits.searches,
        api_calls: limits.api_calls,
        storage: limits.storage
      },
      usage_percentage: {
        searches: limits.searches > 0 ? (usage.searches_count / limits.searches) * 100 : 0,
        api_calls: limits.api_calls > 0 ? (usage.api_calls_count / limits.api_calls) * 100 : 0,
        storage: limits.storage > 0 ? (usage.storage_used / limits.storage) * 100 : 0
      }
    });

  } catch (error) {
    console.error('Get usage error:', error);
    return res.status(500).json({
      error: 'Failed to fetch usage statistics'
    });
  }
});

export default router; 