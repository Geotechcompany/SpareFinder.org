import express, { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { supabase } from '../server';
import Stripe from 'stripe';

const router = Router();

// Function to get Stripe instance with API key from database
async function getStripeInstance(): Promise<Stripe | null> {
  try {
    // Fetch active Stripe payment method from database
    const { data: stripeMethod, error } = await supabase
      .from('payment_methods')
      .select('api_key, secret_key, status')
      .eq('provider', 'stripe')
      .eq('status', 'active')
      .single();

    if (error || !stripeMethod || !stripeMethod.api_key) {
      console.error('No active Stripe API key found:', error);
      return null;
    }

    // Initialize Stripe with the secret key from database (stored in api_key field)
    const stripe = new Stripe(stripeMethod.api_key, {
      apiVersion: '2025-06-30.basil', // Use latest API version
    });

    return stripe;
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    return null;
  }
}

// Helper function to determine price based on plan
function getPlanPrice(planName: string): { amount: number; currency: string } {
  const plan = planName.toLowerCase();
  
  if (plan.includes('pro') || plan.includes('professional')) {
    return { amount: 29, currency: 'gbp' };
  } else if (plan.includes('enterprise')) {
    return { amount: 149, currency: 'gbp' };
  }
  
  return { amount: 0, currency: 'gbp' };
}

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

// Create Stripe checkout session
router.post('/checkout-session', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { plan, amount, currency, billing_cycle: _billing_cycle, success_url, cancel_url } = req.body;

    // Validate required fields
    if (!plan || !success_url || !cancel_url) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'plan, success_url, and cancel_url are required'
      });
    }

    // Get user email from Supabase Auth
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({
        error: 'Failed to fetch user information'
      });
    }

    // Get Stripe instance with API key from database
    const stripe = await getStripeInstance();
    if (!stripe) {
      return res.status(500).json({
        error: 'Payment system not configured',
        message: 'Stripe API key not found. Please contact admin to configure payment methods.'
      });
    }

    // Determine plan pricing
    const planPricing = getPlanPrice(plan);
    const finalAmount = amount || planPricing.amount;
    const finalCurrency = currency || planPricing.currency;

    // Convert to pence (Stripe expects smallest currency unit)
    const unitAmount = Math.round(finalAmount * 100);

    console.log('Creating Stripe checkout session:', {
      plan,
      amount: finalAmount,
      currency: finalCurrency,
      unitAmount,
      userEmail: user.user?.email
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.user?.email,
      line_items: [
        {
          price_data: {
            currency: finalCurrency,
            product_data: {
              name: `SpareFinder AI - ${plan} Plan`,
              description: `Monthly subscription to SpareFinder AI ${plan} plan`,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: {
        user_id: userId,
        plan: plan,
        amount: finalAmount.toString(),
        currency: finalCurrency,
      },
    });

    console.log('Stripe checkout session created:', {
      sessionId: session.id,
      url: session.url
    });

    // Store the session in the database for tracking
    const { error: sessionError } = await supabase
      .from('checkout_sessions')
      .insert([
        {
          id: session.id,
          user_id: userId,
          plan,
          amount: finalAmount,
          currency: finalCurrency,
          status: 'created',
          session_data: {
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            customer_email: user.user?.email,
            created: session.created,
            mode: session.mode,
            payment_status: session.payment_status,
            url: session.url
          },
          created_at: new Date().toISOString()
        }
      ]);

    if (sessionError) {
      console.error('Error storing checkout session:', sessionError);
      // Continue anyway, as this is just for tracking
    }

    return res.json({
      checkout_url: session.url,
      session_id: session.id,
      session: {
        id: session.id,
        url: session.url,
        payment_status: session.payment_status,
        customer_email: session.customer_email || user.user?.email,
        amount_total: session.amount_total,
        currency: session.currency,
        mode: session.mode,
        created: session.created
      }
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: 'Payment processing error',
        message: error.message,
        type: error.type,
        code: error.code
      });
    }
    
    return res.status(500).json({
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Handle Stripe webhooks
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req: any, res: Response) => {
  try {
    const stripe = await getStripeInstance();
    if (!stripe) {
      console.error('Stripe not configured for webhook processing');
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    // Get the webhook signing secret from environment or database
    let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      // Try to get webhook secret from payment_methods table
      const { data: stripeMethod } = await supabase
        .from('payment_methods')
        .select('webhook_secret')
        .eq('provider', 'stripe')
        .eq('is_active', true)
        .single();
      
      webhookSecret = stripeMethod?.webhook_secret;
    }

    if (!webhookSecret) {
      console.error('No webhook secret found');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    const signature = req.headers['stripe-signature'];
    let event;

    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log('Stripe webhook event received:', {
      type: event.type,
      id: event.id
    });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      
      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return res.json({ received: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return res.status(500).json({
      error: 'Failed to process webhook'
    });
  }
});

// Helper function to handle completed checkout sessions
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;
    
    if (!userId || !plan) {
      console.error('Missing metadata in checkout session:', session.id);
      return;
    }

    console.log('Processing completed checkout session:', {
      sessionId: session.id,
      userId,
      plan,
      customerId: session.customer
    });

    // Update checkout session status in database
    await supabase
      .from('checkout_sessions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id);

    // Determine tier based on plan
    let tier = 'free';
    if (plan.toLowerCase().includes('pro') || plan.toLowerCase().includes('professional')) {
      tier = 'pro';
    } else if (plan.toLowerCase().includes('enterprise')) {
      tier = 'enterprise';
    }

    // Update user's subscription
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        tier,
        status: 'active',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false
      });

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
    } else {
      console.log('Subscription updated successfully for user:', userId);
    }

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

// Helper function to handle successful invoice payments
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log('Invoice payment succeeded:', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid
    });

    // You can add invoice tracking logic here
    // For example, update invoice status in your database
    
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

// Helper function to handle failed invoice payments
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log('Invoice payment failed:', {
      invoiceId: invoice.id,
      customerId: invoice.customer
    });

    // You might want to send notification to user about failed payment
    // or update subscription status
    
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}

// Helper function to handle subscription deletions
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log('Subscription deleted:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer
    });

    // Update subscription status in database
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating cancelled subscription:', error);
    }
    
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

// Legacy webhook handler for backward compatibility
router.post('/payment-webhook', async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, status, user_id } = req.body;

    if (!session_id || !status || !user_id) {
      return res.status(400).json({
        error: 'Missing required webhook data'
      });
    }

    // Update checkout session status
    const { error: updateError } = await supabase
      .from('checkout_sessions')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id)
      .eq('user_id', user_id);

    if (updateError) {
      console.error('Error updating checkout session:', updateError);
    }

    // If payment was successful, update user's subscription
    if (status === 'complete') {
      const { data: session } = await supabase
        .from('checkout_sessions')
        .select('plan, amount')
        .eq('id', session_id)
        .single();

      if (session) {
        // Determine tier based on plan
        let tier = 'free';
        if (session.plan.toLowerCase().includes('pro')) {
          tier = 'pro';
        } else if (session.plan.toLowerCase().includes('enterprise')) {
          tier = 'enterprise';
        }

        // Update subscription
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id,
            tier,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false
          });

        if (subscriptionError) {
          console.error('Error updating subscription:', subscriptionError);
        }
      }
    }

    return res.json({ received: true });

  } catch (error) {
    console.error('Payment webhook error:', error);
    return res.status(500).json({
      error: 'Failed to process payment webhook'
    });
  }
});

export default router; 