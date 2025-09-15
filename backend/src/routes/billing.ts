import express, { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { supabase } from '../server';
import Stripe from 'stripe';
import { creditService } from '../services/credit-service';

const router = Router();

// Public config: Stripe publishable key
router.get('/config', async (_req: express.Request, res: Response) => {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLIC_KEY;
    if (!publishableKey) {
      return res.status(200).json({ success: true, configured: false, publishableKey: null });
    }
    return res.json({ success: true, configured: true, publishableKey });
  } catch (error) {
    console.error('Stripe config error:', error);
    return res.status(500).json({ success: false, error: 'config_error' });
  }
});

// Function to get Stripe instance with API key
async function getStripeInstance(): Promise<Stripe | null> {
  try {
    // 1) Prefer environment secret if present
    const envSecret = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || process.env.STRIPE_SECRET || process.env.STRIPE_PRIVATE_KEY;
    if (envSecret) {
      if (envSecret.startsWith('pk_')) {
        console.error('Stripe env key is publishable (pk_). A secret key (sk_) is required.');
        return null;
      }
      return new Stripe(envSecret, { apiVersion: '2025-06-30.basil' });
    }

    // 2) Fallback to database-configured key
    const { data: stripeMethod, error } = await supabase
      .from('payment_methods')
      .select('api_key, secret_key, status')
      .eq('provider', 'stripe')
      .eq('status', 'active')
      .single();

    if (error || !stripeMethod) {
      console.error('No active Stripe config found:', error);
      return null;
    }

    const dbSecret = stripeMethod.secret_key || stripeMethod.api_key;
    if (!dbSecret || dbSecret.startsWith('pk_')) {
      console.error('Stripe DB key is missing or publishable (pk_). A secret key (sk_) is required.');
      return null;
    }

    const stripe = new Stripe(dbSecret, {
      apiVersion: '2025-06-30.basil',
    });

    return stripe;
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    return null;
  }
}

// Helper function to determine price based on plan
// Uses centralized plan configuration to ensure consistency
const PLAN_PRICING = {
  free: { amount: 12.99, currency: 'gbp' },
  pro: { amount: 69.99, currency: 'gbp' }, 
  enterprise: { amount: 460, currency: 'gbp' }
};

function getPlanPrice(planName: string): { amount: number; currency: string } {
  const plan = planName.toLowerCase().replace(/[\s/]/g, '');
  
  // Check exact matches first
  if (plan === 'starter' || plan === 'basic') {
    return PLAN_PRICING.free;
  }
  if (plan === 'professional' || plan === 'business' || plan === 'pro') {
    return PLAN_PRICING.pro;
  }
  if (plan === 'enterprise') {
    return PLAN_PRICING.enterprise;
  }
  
  // Fallback to keyword matching
  if (plan.includes('enterprise')) {
    return PLAN_PRICING.enterprise;
  }
  if (plan.includes('pro') || plan.includes('professional') || plan.includes('business')) {
    return PLAN_PRICING.pro;
  }
  if (plan.includes('starter') || plan.includes('basic')) {
    return PLAN_PRICING.free;
  }

  // Default to Starter price if unspecified
  return PLAN_PRICING.free;
}

// Subscription limits by tier - synced with frontend configuration
const SUBSCRIPTION_LIMITS = {
  // Starter/Basic (mapped to 'free' tier key)
  free: {
    // 20 image recognitions per month
    searches: 20,
    // Web portal only (no API access)
    api_calls: 0,
    // Keep modest storage available
    storage: 1 * 1024 * 1024 * 1024 // 1GB
  },
  // Professional/Business
  pro: {
    // 500 recognitions per month
    searches: 500,
    // API access enabled
    api_calls: 5000,
    // Catalogue storage
    storage: 25 * 1024 * 1024 * 1024 // 25GB
  },
  // Enterprise
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

    let userSubscription = subscription || defaultSubscription;
    // Admins have unlimited/enterprise-equivalent access
    if (req.user?.role === 'admin' || req.user?.role === 'super_admin') {
      userSubscription = {
        ...userSubscription,
        tier: 'enterprise',
        status: 'active'
      } as any;
    }
    const userUsage = usage || {
      searches_count: 0,
      api_calls_count: 0,
      storage_used: 0
    };

    const limits = (req.user?.role === 'admin' || req.user?.role === 'super_admin')
      ? SUBSCRIPTION_LIMITS['enterprise']
      : SUBSCRIPTION_LIMITS[userSubscription.tier as keyof typeof SUBSCRIPTION_LIMITS];

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

    // If downgrading to free, cancel Stripe subscription if exists
    if (tier === 'free') {
      // Find existing subscription
      const { data: existing, error: findErr } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, stripe_customer_id, status')
        .eq('user_id', userId)
        .single();

      if (findErr && findErr.code !== 'PGRST116') {
        console.warn('Fetch current subscription failed (free downgrade):', findErr);
      }

      try {
        if (existing?.stripe_subscription_id) {
          const stripe = await getStripeInstance();
          if (stripe) {
            await stripe.subscriptions.cancel(existing.stripe_subscription_id);
          }
        }
      } catch (e) {
        console.warn('Stripe cancel on free downgrade failed:', e);
      }
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

    // Load subscription record
    const { data: sub, error: loadErr } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    if (loadErr && loadErr.code !== 'PGRST116') {
      console.warn('Load subscription for cancel failed:', loadErr);
    }

    // Ask Stripe to cancel at period end if an active subscription exists
    try {
      if (sub?.stripe_subscription_id) {
        const stripe = await getStripeInstance();
        if (stripe) {
          await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
        }
      }
    } catch (e) {
      console.warn('Stripe cancel_at_period_end update failed:', e);
    }

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

    // First, try to read stored invoices from database
    const { data: storedInvoices, error: storedErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, (page - 1) * limit + limit - 1);

    if (!storedErr && storedInvoices && storedInvoices.length > 0) {
      return res.json({
        invoices: storedInvoices,
        pagination: { page, limit, total: storedInvoices.length }
      });
    }

    // If none found, attempt to fetch from Stripe and cache
    const stripe = await getStripeInstance();
    if (!stripe) {
      return res.json({ invoices: [], pagination: { page, limit, total: 0 } });
    }

    // Find customer's Stripe ID
    const { data: subRec } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (!subRec?.stripe_customer_id) {
      return res.json({ invoices: [], pagination: { page, limit, total: 0 } });
    }

    const invs = await stripe.invoices.list({
      customer: subRec.stripe_customer_id,
      limit
    });

    // Upsert fetched invoices to DB
    if (invs?.data?.length) {
      const mapped = invs.data.map((inv) => ({
        id: inv.id,
        user_id: userId,
        amount: (inv.amount_paid ?? inv.amount_due ?? 0) / 100,
        currency: (inv.currency || 'gbp').toUpperCase(),
        status: inv.status || 'open',
        created_at: new Date((inv.created || 0) * 1000).toISOString(),
        invoice_url: inv.hosted_invoice_url || inv.invoice_pdf || null,
        raw: inv as any
      }));
      await supabase.from('invoices').upsert(mapped, { onConflict: 'id' });
      return res.json({ invoices: mapped, pagination: { page, limit, total: mapped.length } });
    }

    return res.json({ invoices: [], pagination: { page, limit, total: 0 } });

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
    const { plan, amount, currency, billing_cycle: _billing_cycle, success_url, cancel_url, trial_days } = req.body as {
      plan: string;
      amount?: number;
      currency?: string;
      billing_cycle?: string;
      success_url: string;
      cancel_url: string;
      trial_days?: number;
    };

    // Validate required fields
    if (!plan || !success_url || !cancel_url) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'plan, success_url, and cancel_url are required'
      });
    }

    // Normalize and validate trial period
    const trialDays = typeof trial_days === 'number' && trial_days > 0 ? Math.min(trial_days, 30) : undefined;

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
      userEmail: user.user?.email,
      trialDays
    });

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.user?.email || undefined,
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
    };
    if (trialDays) {
      sessionParams.subscription_data = { trial_period_days: trialDays };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
      success: true,
      data: {
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

// One-off credits purchase checkout (pay-as-you-go)
// price: £0.70 per credit
router.post('/credits/checkout-session', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { credits, success_url, cancel_url } = req.body as {
      credits: number;
      success_url: string;
      cancel_url: string;
    };

    if (!credits || credits <= 0 || !Number.isFinite(credits)) {
      return res.status(400).json({ error: 'Invalid credits amount' });
    }
    if (!success_url || !cancel_url) {
      return res.status(400).json({ error: 'Missing redirect URLs' });
    }

    const stripe = await getStripeInstance();
    if (!stripe) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    const unitPriceGbp = 0.70;
    const totalAmount = Math.round(credits * unitPriceGbp * 100); // in pence

    // Get user email
    const { data: user } = await supabase.auth.admin.getUserById(userId);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user?.user?.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `SpareFinder AI Credits` ,
              description: `${credits} credits @ £${unitPriceGbp.toFixed(2)} per credit`,
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      success_url,
      cancel_url,
      metadata: {
        user_id: userId,
        purchase_type: 'credits',
        credits: String(credits),
        unit_price_gbp: String(unitPriceGbp),
      },
    });

    // Track credits checkout
    await supabase.from('checkout_sessions').insert([
      {
        id: session.id,
        user_id: userId,
        plan: 'credits',
        amount: totalAmount / 100,
        currency: 'gbp',
        status: 'created',
        session_data: {
          stripe_session_id: session.id,
          created: session.created,
          mode: session.mode,
          payment_status: session.payment_status,
          url: session.url,
          credits,
        },
        created_at: new Date().toISOString(),
      },
    ]);

    return res.json({ success: true, data: { checkout_url: session.url, session_id: session.id } });
  } catch (error) {
    console.error('Create credits checkout session error:', error);
    return res.status(500).json({ error: 'Failed to create credits checkout session' });
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
        .eq('status', 'active')
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
        // If this was a credits purchase, grant credits; otherwise handle subscription
        const purchaseType = (session.metadata as any)?.purchase_type;
        if (purchaseType === 'credits') {
          await handleCreditsCheckoutCompleted(session);
        } else {
          await handleCheckoutSessionCompleted(session);
        }
        break;
      }
      case 'invoice.payment_succeeded':
      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice;
        await storeInvoice(invoice);
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
    const normalized = plan.toLowerCase();
    if (normalized.includes('pro') || normalized.includes('professional') || normalized.includes('business')) {
      tier = 'pro';
    } else if (normalized.includes('enterprise')) {
      tier = 'enterprise';
    } else if (normalized.includes('starter') || normalized.includes('basic')) {
      tier = 'free';
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

    // Award credits only after trial session completes for Starter plan
    try {
      if (tier === 'starter') {
        // Check if subscription is in trialing state
        const stripe = await getStripeInstance();
        let isTrialing = false;
        if (stripe && typeof session.subscription === 'string') {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            isTrialing = sub.status === 'trialing';
          } catch (e) {
            console.warn('Unable to retrieve subscription to verify trial status:', e);
          }
        }

        // Also treat zero total as trial start
        const zeroTotal = (typeof session.amount_total === 'number' ? session.amount_total : 0) === 0;
        if (isTrialing || zeroTotal) {
          const creditAmount = Number(process.env.STARTER_TRIAL_CREDITS || 10);
          const result = await creditService.addCredits(userId, creditAmount, 'Starter trial activation credit');
          console.log('Starter trial credits grant result:', result);
        }
      }
    } catch (grantErr) {
      console.warn('Granting starter trial credits failed:', grantErr);
    }

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

// Grant credits for completed one-off credits checkout
async function handleCreditsCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const userId = (session.metadata as any)?.user_id;
    const creditsStr = (session.metadata as any)?.credits;
    const credits = Number(creditsStr);
    if (!userId || !Number.isFinite(credits) || credits <= 0) {
      console.warn('Credits webhook missing data', { userId, creditsStr });
      return;
    }

    // Update checkout session status
    await supabase
      .from('checkout_sessions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', session.id);

    // Add credits to user
    const grant = await creditService.addCredits(userId, credits, `Credits purchase via Stripe: ${credits} credits`);
    console.log('Credits granted result:', grant);
  } catch (error) {
    console.error('Error handling credits checkout completed:', error);
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

// Helper to persist invoice to DB
async function storeInvoice(invoice: Stripe.Invoice) {
  try {
    // Find user_id by stripe customer via subscriptions table
    const { data: subRec } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', invoice.customer as string)
      .maybeSingle();

    const userId = subRec?.user_id;
    if (!userId) return;

    const record = {
      id: invoice.id,
      user_id: userId,
      amount: (invoice.amount_paid ?? invoice.amount_due ?? 0) / 100,
      currency: (invoice.currency || 'gbp').toUpperCase(),
      status: invoice.status || 'open',
      created_at: new Date((invoice.created || 0) * 1000).toISOString(),
      invoice_url: invoice.hosted_invoice_url || invoice.invoice_pdf || null,
      raw: invoice as any
    };

    await supabase.from('invoices').upsert(record, { onConflict: 'id' });
  } catch (e) {
    console.warn('Invoice store failed:', e);
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