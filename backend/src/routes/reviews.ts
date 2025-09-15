import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../server';
import { emailService } from '../services/email-service';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types/auth';

const router = Router();

interface ReviewRequest {
  name: string;
  email: string;
  company?: string;
  rating: number;
  title: string;
  message: string;
}

// Middleware to check if user has active subscription or trial
const requireSubscriptionOrTrial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    
    // Check user's subscription status
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('tier, status, current_period_end')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
      return res.status(500).json({
        success: false,
        error: 'Unable to verify subscription status'
      });
    }

    // If no subscription exists, deny access
    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: 'Subscription required',
        message: 'You need an active subscription or trial to write reviews. Please upgrade your plan to continue.'
      });
    }

    // Check if subscription is active or in trial
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const isNotExpired = new Date(subscription.current_period_end) > new Date();

    if (!isActive || !isNotExpired) {
      return res.status(403).json({
        success: false,
        error: 'Subscription expired',
        message: 'Your subscription has expired. Please renew your subscription to write reviews.'
      });
    }

    // User has valid subscription/trial, continue
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to verify subscription status'
    });
  }
};

// Validation middleware for review submission
const reviewValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name must not exceed 100 characters'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Review title must be between 5 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Review message must be between 10 and 2000 characters')
];

// Get all reviews (public endpoint)
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get reviews from database
    const { data: reviews, error, count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching reviews:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch reviews'
      });
    }

    // Calculate average rating
    const { data: ratingStats } = await supabase
      .from('reviews')
      .select('rating')
      .eq('published', true);

    const averageRating = ratingStats && ratingStats.length > 0 
      ? ratingStats.reduce((sum, review) => sum + review.rating, 0) / ratingStats.length
      : 0;

    return res.json({
      success: true,
      data: {
        reviews: reviews || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        stats: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: count || 0
        }
      }
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Submit a new review (requires authentication and active subscription/trial)
router.post('/', authenticateToken, requireSubscriptionOrTrial, reviewValidation, async (req: AuthRequest, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: errors.array()[0].msg,
        details: errors.array()
      });
    }

    const { name, email, company, rating, title, message }: ReviewRequest = req.body;

    console.log('📝 New review submission:', {
      name,
      email,
      company: company || 'Not provided',
      rating,
      title,
      messageLength: message?.length || 0,
      timestamp: new Date().toISOString()
    });

    // Insert review into database
    const { data: newReview, error: insertError } = await supabase
      .from('reviews')
      .insert([
        {
          name,
          email,
          company: company || null,
          rating,
          title,
          message,
          published: true, // Auto-publish for now, can add moderation later
          verified: false, // Will be manually verified later
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting review:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save review'
      });
    }

    // Prepare email content for sales team
    const emailSubject = `New Customer Review: ${rating} stars - ${title}`;
    const emailHtml = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Customer Review</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;color:#334155;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 0;">
    <tr>
      <td>
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;margin:0 auto;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:24px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">
                ⭐ New Customer Review
              </h1>
              <p style="margin:8px 0 0;color:#e2e8f0;font-size:14px;">
                Review from Part Finder AI platform
              </p>
            </td>
          </tr>

          <!-- Rating -->
          <tr>
            <td style="padding:24px 24px 0;">
              <div style="text-align:center;margin-bottom:24px;">
                <div style="font-size:48px;margin-bottom:8px;">
                  ${'⭐'.repeat(rating)}${'☆'.repeat(5 - rating)}
                </div>
                <div style="font-size:24px;font-weight:bold;color:#1e293b;">${rating}/5 Stars</div>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:0 24px 32px;">
              
              <!-- Customer Information -->
              <div style="background:#f1f5f9;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0;color:#1e293b;font-size:18px;">Customer Information</h2>
                
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:4px 0;color:#64748b;font-weight:600;width:120px;">Name:</td>
                    <td style="padding:4px 0;color:#1e293b;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#64748b;font-weight:600;">Email:</td>
                    <td style="padding:4px 0;color:#1e293b;"><a href="mailto:${email}" style="color:#3b82f6;text-decoration:none;">${email}</a></td>
                  </tr>
                  ${company ? `
                  <tr>
                    <td style="padding:4px 0;color:#64748b;font-weight:600;">Company:</td>
                    <td style="padding:4px 0;color:#1e293b;">${company}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding:4px 0;color:#64748b;font-weight:600;">Submitted:</td>
                    <td style="padding:4px 0;color:#1e293b;">${new Date().toLocaleString('en-UK', { 
                      dateStyle: 'full', 
                      timeStyle: 'short',
                      timeZone: 'Europe/London'
                    })}</td>
                  </tr>
                </table>
              </div>

              <!-- Review Title -->
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 8px 0;color:#1e293b;font-size:20px;">"${title}"</h3>
              </div>

              <!-- Review Message -->
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 8px 0;color:#1e293b;font-size:16px;">Customer Review</h3>
                <div style="background:#f8fafc;padding:16px;border-radius:6px;border-left:4px solid #7c3aed;">
                  <p style="margin:0;color:#374151;white-space:pre-wrap;line-height:1.6;">${message}</p>
                </div>
              </div>

              <!-- Actions -->
              <div style="background:#fef3c7;padding:16px;border-radius:8px;border-left:4px solid #f59e0b;">
                <h4 style="margin:0 0 8px 0;color:#92400e;font-size:14px;font-weight:600;">Recommended Actions:</h4>
                <ul style="margin:0;padding-left:16px;color:#92400e;font-size:14px;">
                  <li>Consider reaching out to thank the customer</li>
                  <li>Share positive feedback with the development team</li>
                  <li>Use this review for marketing testimonials (with permission)</li>
                </ul>
              </div>

              <!-- Footer -->
              <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px;text-align:center;">
                <p style="margin:0;color:#64748b;font-size:12px;">
                  This review was submitted through the Part Finder AI reviews page.<br>
                  Review ID: ${newReview.id}
                </p>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailText = `
New Customer Review - Part Finder AI

Rating: ${rating}/5 stars
Customer: ${name}
Email: ${email}
Company: ${company || 'Not provided'}
Submitted: ${new Date().toLocaleString('en-UK', { 
  dateStyle: 'full', 
  timeStyle: 'short',
  timeZone: 'Europe/London'
})}

Review Title: "${title}"

Review Message:
${message}

---
Review ID: ${newReview.id}
This review was submitted through the Part Finder AI reviews page.
    `;

    // Send email to sales team
    const emailSuccess = await emailService.sendEmail({
      to: 'sales@tpsinternational.co.uk',
      subject: emailSubject,
      html: emailHtml,
      text: emailText
    });

    if (!emailSuccess) {
      console.warn('📧 Failed to send review notification email, but review was saved successfully');
    }

    // Send confirmation email to customer
    const confirmationSubject = 'Thank you for your review - Part Finder AI';
    const confirmationHtml = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Review Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;color:#334155;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 0;">
    <tr>
      <td>
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;margin:0 auto;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">
                🌟 Thank You!
              </h1>
              <p style="margin:12px 0 0;color:#e2e8f0;font-size:16px;">
                Your review has been received
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 24px;">
              
              <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                Hi ${name},
              </p>
              
              <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                Thank you for taking the time to review Part Finder AI! Your feedback helps us improve our platform and serves as valuable insight for other potential customers.
              </p>

              <div style="background:#f1f5f9;padding:20px;border-radius:8px;margin:24px 0;">
                <h3 style="margin:0 0 12px;color:#1e293b;font-size:16px;">Your Review Summary:</h3>
                <p style="margin:0 0 8px;color:#64748b;"><strong>Rating:</strong> ${rating}/5 stars</p>
                <p style="margin:0 0 8px;color:#64748b;"><strong>Title:</strong> "${title}"</p>
                <p style="margin:0;color:#64748b;"><strong>Submitted:</strong> ${new Date().toLocaleString('en-UK', { 
                  dateStyle: 'full', 
                  timeStyle: 'short',
                  timeZone: 'Europe/London'
                })}</p>
              </div>

              <p style="margin:24px 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                Your review will be published on our website shortly. We truly appreciate customers like you who help us build trust and credibility in the AI-powered part identification space.
              </p>

              <div style="text-align:center;margin:32px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://app.sparefinder.org'}/reviews" 
                   style="background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">
                  View All Reviews
                </a>
              </div>

              <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:32px;">
                <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">
                  <strong>Part Finder AI Team</strong><br>
                  sales@tpsinternational.co.uk<br>
                  <a href="${process.env.FRONTEND_URL || 'https://app.sparefinder.org'}" style="color:#3b82f6;text-decoration:none;">
                    ${process.env.FRONTEND_URL || 'https://app.sparefinder.org'}
                  </a>
                </p>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const confirmationText = `
Thank you for your review - Part Finder AI!

Hi ${name},

Thank you for taking the time to review Part Finder AI! Your feedback helps us improve our platform and serves as valuable insight for other potential customers.

Your Review Summary:
- Rating: ${rating}/5 stars
- Title: "${title}"
- Submitted: ${new Date().toLocaleString('en-UK', { 
  dateStyle: 'full', 
  timeStyle: 'short',
  timeZone: 'Europe/London'
})}

Your review will be published on our website shortly. We truly appreciate customers like you who help us build trust and credibility in the AI-powered part identification space.

View all reviews: ${process.env.FRONTEND_URL || 'https://sparefinder.org'}/reviews

Best regards,
Part Finder AI Team
sales@tpsinternational.co.uk
    `;

    // Send confirmation email (don't fail if this doesn't work)
    await emailService.sendEmail({
      to: email,
      subject: confirmationSubject,
      html: confirmationHtml,
      text: confirmationText
    }).catch(error => {
      console.warn('📧 Failed to send confirmation email:', error);
    });

    console.log('✅ Review submitted and notifications sent successfully');

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully! Thank you for your feedback.',
      data: {
        review: {
          id: newReview.id,
          rating,
          title,
          submittedAt: newReview.created_at
        },
        emailSent: emailSuccess
      }
    });

  } catch (error) {
    console.error('❌ Submit review error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'We apologize, but there was an error processing your review. Please try again or contact us directly at sales@tpsinternational.co.uk'
    });
  }
});

// Get review statistics (public endpoint)
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    // Get review statistics
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('published', true);

    if (error) {
      console.error('Error fetching review stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch review statistics'
      });
    }

    const totalReviews = reviews?.length || 0;
    const averageRating = totalReviews > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    // Calculate rating distribution
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: reviews?.filter(r => r.rating === rating).length || 0,
      percentage: totalReviews > 0 
        ? Math.round(((reviews?.filter(r => r.rating === rating).length || 0) / totalReviews) * 100)
        : 0
    }));

    return res.json({
      success: true,
      data: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution
      }
    });

  } catch (error) {
    console.error('Get review stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;