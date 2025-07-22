import nodemailer from 'nodemailer';
import { supabase } from '../server';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface AnalysisEmailData {
  userEmail: string;
  userName: string;
  partName: string;
  confidence: number;
  description: string;
  imageUrl?: string;
  analysisId: string;
  processingTime: number;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Get SMTP settings from system_settings table
      const { data: smtpSettings, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .eq('category', 'email');

      if (error) {
        console.error('Failed to fetch SMTP settings:', error);
        return;
      }

      // Convert settings to object
      const settings: Record<string, any> = {};
      smtpSettings?.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value;
      });

      // Check if email notifications are enabled
      const { data: notificationSettings } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('category', 'notifications')
        .eq('setting_key', 'email_enabled')
        .single();

      const emailEnabled = notificationSettings?.setting_value === 'true';
      if (!emailEnabled) {
        console.log('Email notifications are disabled in system settings');
        return;
      }

      // Create transporter with SMTP settings
      const smtpConfig = {
        host: settings.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(settings.smtp_port) || parseInt(process.env.SMTP_PORT || '587'),
        secure: settings.smtp_secure === 'true' || process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: settings.smtp_user || process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD // Keep password in env vars for security
        }
      };

      // Validate required settings
      if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
        console.error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
        return;
      }

      this.transporter = nodemailer.createTransport(smtpConfig);

      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      console.log('Email service initialized successfully');

    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured, skipping email send');
      return false;
    }

    try {
      // Get sender configuration from system settings
      const { data: smtpSettings } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .eq('category', 'email')
        .in('setting_key', ['smtp_user', 'smtp_from_name']);

      const settings: Record<string, string> = {};
      smtpSettings?.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value;
      });

      const fromName = settings.smtp_from_name || 'SpareFinder AI';
      const fromEmail = settings.smtp_user || process.env.SMTP_USER;

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;

    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendAnalysisCompleteEmail(data: AnalysisEmailData): Promise<boolean> {
    try {
      // Check user's email notification preferences
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('email', data.userEmail)
        .single();

      const preferences = userProfile?.preferences || {};
      const emailNotificationsEnabled = preferences.notifications?.email !== false; // Default to true

      if (!emailNotificationsEnabled) {
        console.log(`Email notifications disabled for user: ${data.userEmail}`);
        return false;
      }

      // Get email template from database
      const { data: template } = await supabase
        .from('email_templates')
        .select('subject, html_content, text_content')
        .eq('name', 'Analysis Complete')
        .eq('status', 'active')
        .single();

      let subject = 'Your Part Analysis is Complete! 🎯';
      let htmlContent = this.getDefaultAnalysisTemplate(data);
      let textContent = '';

      if (template) {
        subject = template.subject;
        htmlContent = this.replacePlaceholders(template.html_content, data);
        textContent = template.text_content ? this.replacePlaceholders(template.text_content, data) : '';
      }

      const success = await this.sendEmail({
        to: data.userEmail,
        subject,
        html: htmlContent,
        text: textContent
      });

      if (success) {
        // Create notification record in database
        await supabase
          .from('notifications')
          .insert({
            user_id: await this.getUserIdByEmail(data.userEmail),
            title: 'Analysis Complete Email Sent',
            message: `Email notification sent for part analysis: ${data.partName}`,
            type: 'info',
            metadata: {
              email_sent: true,
              analysis_id: data.analysisId,
              part_name: data.partName
            }
          });
      }

      return success;

    } catch (error) {
      console.error('Failed to send analysis complete email:', error);
      return false;
    }
  }

  private async getUserIdByEmail(email: string): Promise<string | null> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      return profile?.id || null;
    } catch (error) {
      console.error('Failed to get user ID by email:', error);
      return null;
    }
  }

  private replacePlaceholders(template: string, data: AnalysisEmailData): string {
    return template
      .replace(/{{userName}}/g, data.userName || 'User')
      .replace(/{{partName}}/g, data.partName)
      .replace(/{{confidence}}/g, (data.confidence * 100).toFixed(1))
      .replace(/{{description}}/g, data.description)
      .replace(/{{processingTime}}/g, data.processingTime.toFixed(2))
      .replace(/{{analysisId}}/g, data.analysisId)
      .replace(/{{imageUrl}}/g, data.imageUrl || '')
      .replace(/{{dashboardUrl}}/g, `${process.env.FRONTEND_URL || 'https://app.sparefinder.org'}/history`)
      .replace(/{{currentDate}}/g, new Date().toLocaleDateString())
      .replace(/{{currentTime}}/g, new Date().toLocaleTimeString());
  }

  private getDefaultAnalysisTemplate(data: AnalysisEmailData): string {
    const confidenceColor = data.confidence > 0.8 ? '#10B981' : data.confidence > 0.5 ? '#F59E0B' : '#EF4444';
    const confidenceText = data.confidence > 0.8 ? 'Excellent' : data.confidence > 0.5 ? 'Good' : 'Fair';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analysis Complete - SpareFinder AI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                🎯 Analysis Complete!
            </h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">
                Your part has been successfully identified
            </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            
            <!-- Greeting -->
            <p style="color: #374151; font-size: 16px; margin: 0 0 25px 0;">
                Hello ${data.userName || 'there'}! 👋
            </p>

            <!-- Analysis Results -->
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid ${confidenceColor};">
                
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">
                    ${data.partName}
                </h2>

                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <span style="color: #6b7280; font-weight: 500; margin-right: 10px;">Confidence:</span>
                    <span style="background-color: ${confidenceColor}; color: white; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                        ${(data.confidence * 100).toFixed(1)}% ${confidenceText}
                    </span>
                </div>

                <div style="color: #4b5563; line-height: 1.6; margin-top: 15px;">
                    <strong>Description:</strong><br>
                    ${data.description}
                </div>

                ${data.imageUrl ? `
                <div style="margin-top: 20px; text-align: center;">
                    <img src="${data.imageUrl}" alt="Analyzed Part" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                </div>
                ` : ''}

            </div>

            <!-- Performance Stats -->
            <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #0369a1; margin: 0 0 15px 0; font-size: 18px;">⚡ Analysis Performance</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <span style="color: #374151; font-weight: 500;">Processing Time:</span><br>
                        <span style="color: #0369a1; font-weight: 600;">${data.processingTime.toFixed(2)}s</span>
                    </div>
                    <div>
                        <span style="color: #374151; font-weight: 500;">Analysis ID:</span><br>
                        <span style="color: #6b7280; font-family: monospace; font-size: 12px;">${data.analysisId}</span>
                    </div>
                </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 35px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://app.sparefinder.org'}/history" 
                   style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);">
                    📊 View Full Report
                </a>
            </div>

            <!-- Tips -->
            <div style="background-color: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">💡 Pro Tips</h4>
                <ul style="color: #78350f; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>Save this analysis to your history for future reference</li>
                    <li>Share the results with your team or mechanic</li>
                    <li>Upload multiple angles for even better accuracy</li>
                </ul>
            </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                    Thank you for using SpareFinder AI! 🚗✨
                </p>
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                    This email was sent on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                </p>
            </div>
        </div>

    </div>
</body>
</html>
    `;
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection test failed:', error);
      return false;
    }
  }

  // Add a method to test email configuration
  async sendTestEmail(to: string = 'noreply.tpsinternational@gmail.com'): Promise<boolean> {
    try {
      const testEmailOptions: EmailOptions = {
        to,
        subject: 'SpareFinder AI - SMTP Configuration Test',
        html: `
          <h1>SMTP Configuration Test</h1>
          <p>This is a test email to verify the SMTP configuration for SpareFinder AI.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `
      };

      return await this.sendEmail(testEmailOptions);
    } catch (error) {
      console.error('Test email sending failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export { EmailService, AnalysisEmailData }; 