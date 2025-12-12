import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { emailService } from '../services/email-service';

const router = Router();

// Contact form validation middleware
const contactValidation = [
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
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subject must not exceed 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  body('inquiryType')
    .isIn(['support', 'sales', 'billing', 'technical', 'general'])
    .withMessage('Invalid inquiry type')
];

// Submit contact form
router.post('/', contactValidation, async (req: Request, res: Response) => {
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

    const { name, email, company, subject, message, inquiryType } = req.body;

    console.log('📨 Contact form submission:', {
      name,
      email,
      company: company || 'Not provided',
      subject: subject || 'No subject',
      inquiryType,
      messageLength: message?.length || 0,
      timestamp: new Date().toISOString()
    });

    // Prepare email content
    const emailSubject = subject 
      ? `[${inquiryType.toUpperCase()}] ${subject}` 
      : `[${inquiryType.toUpperCase()}] New Contact Form Submission`;

    const emailHtml = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Contact Form Submission</title>
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
                📨 Contact Form Submission
              </h1>
              <p style="margin:8px 0 0;color:#e2e8f0;font-size:14px;">
                New inquiry from Part Finder AI website
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 24px;">
              
              <!-- Contact Information -->
              <div style="background:#f1f5f9;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0;color:#1e293b;font-size:18px;">Contact Information</h2>
                
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
                    <td style="padding:4px 0;color:#64748b;font-weight:600;">Inquiry Type:</td>
                    <td style="padding:4px 0;">
                      <span style="background:#7c3aed;color:#ffffff;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600;text-transform:uppercase;">
                        ${inquiryType}
                      </span>
                    </td>
                  </tr>
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

              <!-- Subject (if provided) -->
              ${subject ? `
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 8px 0;color:#1e293b;font-size:16px;">Subject</h3>
                <p style="margin:0;color:#64748b;background:#f8fafc;padding:12px;border-radius:6px;border-left:4px solid #3b82f6;">
                  ${subject}
                </p>
              </div>
              ` : ''}

              <!-- Message -->
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 8px 0;color:#1e293b;font-size:16px;">Message</h3>
                <div style="background:#f8fafc;padding:16px;border-radius:6px;border-left:4px solid #7c3aed;">
                  <p style="margin:0;color:#374151;white-space:pre-wrap;line-height:1.6;">${message}</p>
                </div>
              </div>

              <!-- Footer -->
              <div style="border-top:1px solid #e2e8f0;padding-top:16px;text-align:center;">
                <p style="margin:0;color:#64748b;font-size:12px;">
                  This message was sent from the Part Finder AI contact form.<br>
                  Reply directly to this email to respond to the sender.
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
Contact Form Submission - Part Finder AI

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}
Inquiry Type: ${inquiryType.toUpperCase()}
Subject: ${subject || 'No subject'}
Submitted: ${new Date().toLocaleString('en-UK', { 
  dateStyle: 'full', 
  timeStyle: 'short',
  timeZone: 'Europe/London'
})}

Message:
${message}

---
This message was sent from the Part Finder AI contact form.
Reply directly to this email to respond to the sender.
    `;

    // Send email to sales@tpsinternational.co.uk
    const emailSuccess = await emailService.sendEmail({
      to: 'sales@tpsinternational.co.uk',
      subject: emailSubject,
      html: emailHtml,
      text: emailText
    });

    if (!emailSuccess) {
      console.warn('📨 Failed to send contact form email, but form submission was successful');
      // Still return success to user since the form was processed
    }

    // Send confirmation email to the sender
    const confirmationSubject = 'Thank you for contacting Part Finder AI';
    const confirmationHtml = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Contact Confirmation</title>
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
                ✅ Message Received!
              </h1>
              <p style="margin:12px 0 0;color:#e2e8f0;font-size:16px;">
                Thank you for contacting Part Finder AI
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
                We've received your message and will respond within <strong>24 hours</strong> during business days.
              </p>

              <div style="background:#f1f5f9;padding:20px;border-radius:8px;margin:24px 0;">
                <h3 style="margin:0 0 12px;color:#1e293b;font-size:16px;">Your Message Details:</h3>
                <p style="margin:0 0 8px;color:#64748b;"><strong>Inquiry Type:</strong> ${inquiryType.charAt(0).toUpperCase() + inquiryType.slice(1)}</p>
                ${subject ? `<p style="margin:0 0 8px;color:#64748b;"><strong>Subject:</strong> ${subject}</p>` : ''}
                <p style="margin:0;color:#64748b;"><strong>Submitted:</strong> ${new Date().toLocaleString('en-UK', { 
                  dateStyle: 'full', 
                  timeStyle: 'short',
                  timeZone: 'Europe/London'
                })}</p>
              </div>

              <p style="margin:24px 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                In the meantime, feel free to explore our platform and discover how AI-powered part identification can streamline your Engineering spares repair workflow.
              </p>

              <div style="text-align:center;margin:32px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://app.sparefinder.org'}/dashboard" 
                   style="background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">
                  Visit Dashboard
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
Thank you for contacting Part Finder AI!

Hi ${name},

We've received your message and will respond within 24 hours during business days.

Your Message Details:
- Inquiry Type: ${inquiryType.charAt(0).toUpperCase() + inquiryType.slice(1)}
${subject ? `- Subject: ${subject}` : ''}
- Submitted: ${new Date().toLocaleString('en-UK', { 
  dateStyle: 'full', 
  timeStyle: 'short',
  timeZone: 'Europe/London'
})}

In the meantime, feel free to explore our platform and discover how AI-powered part identification can streamline your Engineering spares repair workflow.

Visit: ${process.env.FRONTEND_URL || 'https://app.sparefinder.org'}/dashboard

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
      console.warn('📨 Failed to send confirmation email:', error);
    });

    console.log('✅ Contact form processed successfully');

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully! We will respond within 24 hours.',
      data: {
        submittedAt: new Date().toISOString(),
        inquiryType,
        emailSent: emailSuccess
      }
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'We apologize, but there was an error processing your message. Please try again or contact us directly at sales@tpsinternational.co.uk'
    });
  }
});

export default router;