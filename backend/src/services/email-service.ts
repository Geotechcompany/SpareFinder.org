import nodemailer from "nodemailer";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Supabase client directly to avoid circular dependency
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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

interface WelcomeEmailData {
  userEmail: string;
  userName: string;
}

interface AnalysisStartedEmailData {
  userEmail: string;
  userName: string;
  analysisId: string;
  imageUrl?: string;
}

interface AnalysisFailedEmailData {
  userEmail: string;
  userName: string;
  analysisId: string;
  errorMessage: string;
  imageUrl?: string;
}

interface AnalysisProcessingEmailData {
  userEmail: string;
  userName: string;
  analysisId: string;
  processingTimeMinutes?: number;
}

interface ReferralInviteEmailData {
  userEmail: string;
  userName: string;
  referralUrl?: string;
  rewardCredits?: number;
}

interface SubscriptionEmailData {
  userEmail: string;
  userName: string;
  planName: string;
  planTier: string;
  amount?: number;
  currency?: string;
  trialDays?: number;
  trialEndDate?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;
  private senderName: string = "SpareFinder";
  private senderEmail: string = "";

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Private SMTP configuration for SpareFinder emails.
      // Uses environment variables if present, otherwise falls back to hardcoded defaults.
      const host = process.env.SMTP_HOST || "smtp.gmail.com";
      const port = parseInt(process.env.SMTP_PORT || "587", 10);
      const user = process.env.SMTP_USER || "";
      const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "";

      // If SMTP creds are missing, don't even try to initialize transporter.
      // On Render Starter/Free, SMTP ports are commonly blocked anyway; prefer EMAIL_API_URL/EMAIL_SERVICE_URL.
      if (!user || !pass) {
        this.isConfigured = false;
        this.transporter = null;
        console.warn(
          "⚠️ SMTP not configured (SMTP_USER/SMTP_PASSWORD missing). Will use external email service if configured."
        );
        return;
      }

      const smtpConfig = {
        host,
        port,
        // Use TLS on port 465, otherwise use STARTTLS on 587/other ports
        secure: port === 465,
        auth: {
          user,
          pass,
        },
        // Lower timeout so connection failures return quickly
        connectionTimeout: 10000,
      } as const;

      this.senderName = "SpareFinder";
      // Force visible "From" address to use the SpareFinder domain
      this.senderEmail = "noreply.sparefinder.org";

      this.transporter = nodemailer.createTransport(smtpConfig);
      await this.transporter.verify();

      this.isConfigured = true;
      console.log("✅ Email transporter configured:", {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
      });
    } catch (error) {
      console.error("Email transporter initialization failed:", error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const emailApiUrlRaw = (
      process.env.EMAIL_SERVICE_URL ||
      process.env.EMAIL_API_URL ||
      ""
    ).trim();

    // Prefer external email-service over HTTPS whenever configured (works on Render Starter/Free).
    // Supports either:
    // - base URL (we'll try /send-email then /email/send)
    // - full URL including path (/send-email or /email/send)
    if (emailApiUrlRaw) {
      const url = emailApiUrlRaw.replace(/\/$/, "");
      const payload = {
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text ?? "",
      };

      const candidateUrls = url.endsWith("/send-email") || url.endsWith("/email/send")
        ? [url]
        : [`${url}/send-email`, `${url}/email/send`];

      for (const candidateUrl of candidateUrls) {
        try {
          await axios.post(candidateUrl, payload, { timeout: 15000 });
          console.log(
            `📧 Email sent via external email service to ${options.to}: ${options.subject} (${candidateUrl})`
          );
          return true;
        } catch (err: any) {
          const status = err?.response?.status;
          // If the endpoint isn't found, try the next candidate path.
          if (status === 404 || status === 405) continue;
          console.error(
            `Failed to send email via external email service (${candidateUrl}):`,
            err
          );
          // For non-404 failures, fall through to SMTP attempt (useful for local dev)
          break;
        }
      }
    }

    // Fallback: direct SMTP (works for local dev or when running on a platform that allows SMTP)
    try {
      if (!this.transporter || !this.isConfigured) {
        await this.initializeTransporter();
      }

      if (!this.transporter || !this.isConfigured) {
        console.log("Email service not configured, skipping email send");
        return false;
      }

      const mailOptions = {
        from: `"${this.senderName}" <${this.senderEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      console.error("Failed to send email via SMTP:", error);
      return false;
    }
  }

  async sendAnalysisCompleteEmail(data: AnalysisEmailData): Promise<boolean> {
    try {
      // Check user's email notification preferences
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("email", data.userEmail)
        .single();

      const preferences = userProfile?.preferences || {};
      const emailNotificationsEnabled =
        preferences.notifications?.email !== false; // Default to true

      if (!emailNotificationsEnabled) {
        console.log(`Email notifications disabled for user: ${data.userEmail}`);
        return false;
      }

      // Get email template from database
      const { data: template } = await supabase
        .from("email_templates")
        .select("subject, html_content, text_content")
        .eq("name", "Analysis Complete")
        .eq("status", "active")
        .single();

      let subject = "Your Part Analysis is Complete! 🎯";
      let htmlContent = this.getDefaultAnalysisTemplate(data);
      let textContent = "";

      if (template) {
        subject = template.subject;
        htmlContent = this.replacePlaceholders(template.html_content, data);
        textContent = template.text_content
          ? this.replacePlaceholders(template.text_content, data)
          : "";
      }

      const success = await this.sendEmail({
        to: data.userEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });

      if (success) {
        // Create notification record in database
        await supabase.from("notifications").insert({
          user_id: await this.getUserIdByEmail(data.userEmail),
          title: "Analysis Complete Email Sent",
          message: `Email notification sent for part analysis: ${data.partName}`,
          type: "info",
          metadata: {
            email_sent: true,
            analysis_id: data.analysisId,
            part_name: data.partName,
          },
        });
      }

      return success;
    } catch (error) {
      console.error("Failed to send analysis complete email:", error);
      return false;
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    try {
      const emailEnabled = await this.isEmailEnabled();
      if (!emailEnabled) return false;

      const subject = "Welcome to SpareFinder AI – Let’s get you started";
      const frontendUrl =
        process.env.FRONTEND_URL || "https://sparefinder.org";
      const baseUrl = frontendUrl.replace(/\/$/, "");
      const logoUrl = `${baseUrl}/sparefinderlogo.png`;
      const dashboardUrl = `${baseUrl}/dashboard`;
      const uploadUrl = `${baseUrl}/dashboard/upload`;
      const docsUrl = `${baseUrl}/help`;
      const contactUrl = `${baseUrl}/contact`;
      const billingUrl = `${baseUrl}/dashboard/billing`;

      const html = `
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#020617;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:radial-gradient(circle at top,#1d4ed8 0,#020617 55%,#000 100%);padding:32px 0;">
      <tr>
        <td>
          <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#020617;border-radius:18px;overflow:hidden;box-shadow:0 22px 60px rgba(15,23,42,.9);border:1px solid rgba(148,163,184,.22);">
            <tr>
              <td style="padding:18px 30px 16px 30px;background:#020617;color:#f9fafb;border-bottom:1px solid rgba(15,23,42,.9);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="text-align:left;vertical-align:middle;">
                      <img src="${logoUrl}" alt="SpareFinder" style="max-height:30px;width:auto;display:block;border-radius:6px;" />
                    </td>
                    <td style="text-align:right;vertical-align:middle;font-size:11px;color:#94a3b8;">
                      AI-powered industrial spare parts identification
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px 22px 30px;background:linear-gradient(135deg,#10b981,#06b6d4,#3b82f6);color:#f9fafb;">
                <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.9;margin-bottom:4px;">Welcome to SpareFinder AI</div>
                <h1 style="margin:0;font-size:24px;line-height:1.2;">Welcome, ${data.userName || "there"} 👋</h1>
                <p style="margin:6px 0 0 0;font-size:14px;opacity:.9;">
                  Your account is live – you’re ready to identify industrial spare parts in seconds.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 30px 6px 30px;">
                <h2 style="margin:0 0 10px 0;font-size:18px;color:#e5e7eb;">How to use SpareFinder in 3 steps</h2>
                <ol style="margin:4px 0 0 0;padding-left:20px;color:#cbd5e1;font-size:14px;line-height:1.7;">
                  <li style="margin-bottom:6px;">
                    <strong>Upload a clear photo of the part</strong> – one part per image, good lighting, and minimal background.
                  </li>
                  <li style="margin-bottom:6px;">
                    <strong>Review the match</strong> – see the identified part, confidence score, key specs, and compatible alternatives.
                  </li>
                  <li style="margin-bottom:2px;">
                    <strong>Save, share, and export</strong> – keep a history of searches, export PDFs, or share results with your team.
                  </li>
                </ol>

                <div style="margin:22px 0 8px 0;text-align:left;">
                  <a href="${uploadUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#f9fafb;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600;font-size:14px;box-shadow:0 12px 30px rgba(37,99,235,.55);">
                    Upload your first part
                  </a>
                </div>

                <p style="margin:12px 0 0 0;font-size:13px;color:#9ca3af;">
                  Each analysis uses one credit. You can see your remaining credits at the top of your dashboard.
                </p>
              </td>
            </tr>

            <!-- Use cases with imagery -->
            <tr>
              <td style="padding:10px 30px 10px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#cbd5e1;">
                  <tr>
                    <td style="width:50%;padding-right:10px;vertical-align:top;">
                      <div style="border-radius:14px;overflow:hidden;border:1px solid rgba(30,64,175,.6);background:#020617;">
                        <img src="https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=900&q=80" alt="Engineers working around industrial equipment" style="display:block;width:100%;height:auto;border-bottom:1px solid rgba(15,23,42,.9);" />
                        <div style="padding:10px 12px;">
                          <strong style="display:block;color:#e5e7eb;margin-bottom:2px;">For maintenance teams</strong>
                          <span>Identify unknown parts during shutdowns without waiting on paperwork or old catalogues.</span>
                        </div>
                      </div>
                    </td>
                    <td style="width:50%;padding-left:10px;vertical-align:top;">
                      <div style="border-radius:14px;overflow:hidden;border:1px solid rgba(30,64,175,.6);background:#020617;">
                        <img src="https://images.unsplash.com/photo-1581090700221-1e37b190418e?auto=format&fit=crop&w=900&q=80" alt="Warehouse shelves with spare parts crates" style="display:block;width:100%;height:auto;border-bottom:1px solid rgba(15,23,42,.9);" />
                        <div style="padding:10px 12px;">
                          <strong style="display:block;color:#e5e7eb;margin-bottom:2px;">For stores &amp; inventory</strong>
                          <span>Clear up “mystery” stock by snapping photos and labelling everything once in SpareFinder.</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 30px 4px 30px;">
                <div style="background:radial-gradient(circle at top left,#0f172a,#020617);border-radius:14px;padding:16px 18px;border:1px solid rgba(148,163,184,.28);">
                  <h3 style="margin:0 0 6px 0;font-size:15px;color:#e5e7eb;">What you’ll see in your first result</h3>
                  <ul style="margin:0;padding-left:18px;font-size:13px;color:#cbd5e1;line-height:1.7;">
                    <li>A clear part name, category and manufacturer (where available).</li>
                    <li>A confidence score so you can judge how strong the match is.</li>
                    <li>Supporting description and specs your stores or buyers can use.</li>
                    <li>A full history entry so your team can reuse the result later.</li>
                  </ul>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 30px 4px 30px;">
                <div style="background:radial-gradient(circle at top left,#0f172a,#020617);border-radius:14px;padding:16px 18px;border:1px solid rgba(148,163,184,.28);">
                  <h3 style="margin:0 0 6px 0;font-size:15px;color:#e5e7eb;">Where everything lives</h3>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#cbd5e1;">
                    <tr>
                      <td style="padding:4px 0;vertical-align:top;width:34%;">
                        <strong>Dashboard</strong>
                      </td>
                      <td style="padding:4px 0;vertical-align:top;">
                        Overview of your recent analyses and credit balance.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;vertical-align:top;width:34%;">
                        <strong>Upload</strong>
                      </td>
                      <td style="padding:4px 0;vertical-align:top;">
                        Start a new search by dragging &amp; dropping part photos.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;vertical-align:top;width:34%;">
                        <strong>History</strong>
                      </td>
                      <td style="padding:4px 0;vertical-align:top;">
                        Revisit, export, or share previous identifications.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;vertical-align:top;width:34%;">
                        <strong>Billing &amp; plans</strong>
                      </td>
                      <td style="padding:4px 0;vertical-align:top;">
                        Manage your subscription, invoices, and upgrade options.
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 30px 6px 30px;">
                <div style="background:#020617;border-radius:14px;padding:14px 18px;border:1px dashed rgba(148,163,184,.4);">
                  <h3 style="margin:0 0 4px 0;font-size:15px;color:#e5e7eb;">Need help or best practices?</h3>
                  <p style="margin:0 0 6px 0;font-size:13px;color:#9ca3af;">
                    We’ve put together a short guide with example photos, do’s &amp; don’ts, and tips for getting the highest accuracy.
                  </p>
                  <a href="${docsUrl}" style="font-size:13px;color:#60a5fa;text-decoration:none;font-weight:500;">
                    Open the getting-started guide →
                  </a>
                  <p style="margin:10px 0 0 0;font-size:12px;color:#94a3b8;">
                    Prefer to talk to us? You can also reach the team via <a href="${contactUrl}" style="color:#60a5fa;text-decoration:none;">our contact page</a>.
                  </p>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 30px 20px 30px;border-top:1px solid rgba(31,41,55,.9);font-size:11px;color:#9ca3af;">
                <p style="margin:0 0 4px 0;">
                  You can update your email preferences anytime from <a href="${dashboardUrl}" style="color:#60a5fa;text-decoration:none;">Settings &gt; Notifications</a>.
                </p>
                <p style="margin:0;">
                  Go to your dashboard: <a href="${dashboardUrl}" style="color:#60a5fa;text-decoration:none;">${dashboardUrl}</a> · Manage billing: <a href="${billingUrl}" style="color:#60a5fa;text-decoration:none;">Billing &amp; plans</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

      const ok = await this.sendEmail({
        to: data.userEmail,
        subject,
        html,
      });

      if (ok) {
        await supabase.from("notifications").insert({
          user_id: await this.getUserIdByEmail(data.userEmail),
          title: "Welcome to SpareFinder AI",
          message:
            "Your account is ready. Start by uploading your first part from the dashboard.",
          type: "success",
          action_url: uploadUrl,
        });
      }

      return ok;
    } catch (e) {
      console.error("Failed to send welcome email:", e);
      return false;
    }
  }

  /**
   * Gentle nudge a few days after signup to encourage first use
   */
  async sendOnboardingNudgeEmail(
    data: WelcomeEmailData
  ): Promise<boolean> {
    try {
      const emailEnabled = await this.isEmailEnabled();
      if (!emailEnabled) return false;

      const subject = "You still have SpareFinder credits waiting for you";
      const frontendUrl =
        process.env.FRONTEND_URL || "https://sparefinder.org";
      const baseUrl = frontendUrl.replace(/\/$/, "");
      const logoUrl = `${baseUrl}/sparefinderlogo.png`;
      const dashboardUrl = `${baseUrl}/dashboard`;
      const uploadUrl = `${baseUrl}/dashboard/upload`;
      const docsUrl = `${baseUrl}/help`;

      const html = `
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#020617;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:radial-gradient(circle at top,#22c55e 0,#020617 55%,#000 100%);padding:32px 0;">
      <tr>
        <td>
          <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#020617;border-radius:18px;overflow:hidden;box-shadow:0 22px 60px rgba(15,23,42,.9);border:1px solid rgba(34,197,94,.4);">
            <tr>
              <td style="padding:18px 28px 14px 28px;background:#020617;color:#f9fafb;border-bottom:1px solid rgba(15,23,42,.9);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="text-align:left;vertical-align:middle;">
                      <img src="${logoUrl}" alt="SpareFinder" style="max-height:28px;width:auto;display:block;border-radius:6px;" />
                    </td>
                    <td style="text-align:right;vertical-align:middle;font-size:11px;color:#bbf7d0;">
                      Credits reminder · Onboarding nudge
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 18px 28px;background:linear-gradient(135deg,#16a34a,#22c55e);color:#f9fafb;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;">
                  Hey ${data.userName || "there"}, your first search is one click away ⚡
                </h1>
                <p style="margin:6px 0 0 0;font-size:13px;opacity:.95;">
                  SpareFinder is ready whenever you are – upload a part photo and we’ll handle the rest.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:22px 28px 6px 28px;">
                <p style="margin:0 0 10px 0;font-size:14px;color:#cbd5e1;">
                  Here’s a quick reminder of what you can do in under a minute:
                </p>
                <ul style="margin:0;padding-left:18px;font-size:13px;color:#9ca3af;line-height:1.7;">
                  <li><strong>Snap or upload</strong> a clear photo of any spare part.</li>
                  <li><strong>See the match instantly</strong> with confidence scores and key specs.</li>
                  <li><strong>Compare alternatives</strong> and save results to your history.</li>
                </ul>

                <div style="margin:20px 0 8px 0;">
                  <a href="${uploadUrl}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#15803d);color:#f9fafb;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600;font-size:14px;box-shadow:0 12px 30px rgba(34,197,94,.55);">
                    Run a quick test search
                  </a>
                </div>

                <p style="margin:10px 0 0 0;font-size:12px;color:#9ca3af;">
                  Try it with a low-risk part from your stores or workshop and see how it fits into your workflow.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 28px 12px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:12px;color:#9ca3af;">
                  <tr>
                    <td style="padding-right:10px;vertical-align:top;width:50%;border-right:1px solid rgba(31,41,55,.8);">
                      <p style="margin:0 0 4px 0;color:#e5e7eb;font-weight:600;">Great first tests</p>
                      <ul style="margin:0;padding-left:16px;line-height:1.6;">
                        <li>Fast-moving spares you reorder often.</li>
                        <li>Legacy parts with poor or missing labels.</li>
                        <li>Field photos from engineers on site.</li>
                      </ul>
                    </td>
                    <td style="padding-left:14px;vertical-align:top;width:50%;">
                      <p style="margin:0 0 4px 0;color:#e5e7eb;font-weight:600;">Best results when</p>
                      <ul style="margin:0;padding-left:16px;line-height:1.6;">
                        <li>The whole part is in the frame.</li>
                        <li>Labels / markings are readable.</li>
                        <li>The background is simple and not cluttered.</li>
                      </ul>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 28px 18px 28px;border-top:1px solid rgba(31,41,55,.9);font-size:11px;color:#9ca3af;">
                <p style="margin:0 0 4px 0;">
                  You can see your recent analyses and remaining credits anytime from your <a href="${dashboardUrl}" style="color:#4ade80;text-decoration:none;">SpareFinder dashboard</a>.
                </p>
                <p style="margin:0;">
                  For tips and example photos, visit the <a href="${docsUrl}" style="color:#4ade80;text-decoration:none;">getting-started guide</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

      const ok = await this.sendEmail({
        to: data.userEmail,
        subject,
        html,
      });

      if (ok) {
        await supabase.from("notifications").insert({
          user_id: await this.getUserIdByEmail(data.userEmail),
          title: "Reminder to try SpareFinder",
          message:
            "You still have credits available. Upload a part photo to see your first identification.",
          type: "info",
          action_url: uploadUrl,
        });
      }

      return ok;
    } catch (e) {
      console.error("Failed to send onboarding nudge email:", e);
      return false;
    }
  }

  /**
   * Re‑engagement email for inactive users who used the app before
   */
  async sendReengagementEmail(
    data: WelcomeEmailData
  ): Promise<boolean> {
    try {
      const emailEnabled = await this.isEmailEnabled();
      if (!emailEnabled) return false;

      const subject = "See what SpareFinder can do for your next job";
      const frontendUrl =
        process.env.FRONTEND_URL || "https://sparefinder.org";
      const baseUrl = frontendUrl.replace(/\/$/, "");
      const logoUrl = `${baseUrl}/sparefinderlogo.png`;
      const dashboardUrl = `${baseUrl}/dashboard`;
      const uploadUrl = `${baseUrl}/dashboard/upload`;

      const html = `
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#020617;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:radial-gradient(circle at top,#0ea5e9 0,#020617 55%,#000 100%);padding:32px 0;">
      <tr>
        <td>
          <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#020617;border-radius:18px;overflow:hidden;box-shadow:0 22px 60px rgba(15,23,42,.9);border:1px solid rgba(56,189,248,.4);">
            <tr>
              <td style="padding:18px 28px 14px 28px;background:#020617;color:#f9fafb;border-bottom:1px solid rgba(15,23,42,.9);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="text-align:left;vertical-align:middle;">
                      <img src="${logoUrl}" alt="SpareFinder" style="max-height:28px;width:auto;display:block;border-radius:6px;" />
                    </td>
                    <td style="text-align:right;vertical-align:middle;font-size:11px;color:#7dd3fc;">
                      Usage reminder · Inactive account
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 16px 28px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#f9fafb;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;">
                  ${data.userName || "There"}, spare parts shouldn’t slow your team down
                </h1>
                <p style="margin:6px 0 0 0;font-size:13px;opacity:.95;">
                  Drop in a photo, get the part, move on with the work – that’s it.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:22px 28px 10px 28px;">
                <h2 style="margin:0 0 10px 0;font-size:15px;color:#e5e7eb;">Perfect for those “what part is this?” moments</h2>
                <ul style="margin:0 0 8px 0;padding-left:18px;font-size:13px;color:#9ca3af;line-height:1.7;">
                  <li>Field engineers needing fast identification from site.</li>
                  <li>Stores teams dealing with unlabelled or legacy stock.</li>
                  <li>Maintenance teams logging parts for repeat orders.</li>
                </ul>

                <div style="margin:18px 0 4px 0;">
                  <a href="${uploadUrl}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#f9fafb;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600;font-size:14px;box-shadow:0 12px 30px rgba(37,99,235,.55);">
                    Open SpareFinder and upload a part
                  </a>
                </div>

                <p style="margin:10px 0 0 0;font-size:12px;color:#9ca3af;">
                  It takes seconds to run a search, and every result is saved to your history so your team can reuse it later.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 28px 12px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:12px;color:#9ca3af;">
                  <tr>
                    <td style="padding-right:10px;vertical-align:top;width:50%;border-right:1px solid rgba(31,41,55,.8);">
                      <p style="margin:0 0 4px 0;color:#e5e7eb;font-weight:600;">Teams who benefit most</p>
                      <ul style="margin:0;padding-left:16px;line-height:1.6;">
                        <li>Maintenance &amp; reliability teams.</li>
                        <li>Stores / inventory / spares managers.</li>
                        <li>Procurement and purchasing teams.</li>
                      </ul>
                    </td>
                    <td style="padding-left:14px;vertical-align:top;width:50%;">
                      <p style="margin:0 0 4px 0;color:#e5e7eb;font-weight:600;">Why come back now</p>
                      <ul style="margin:0;padding-left:16px;line-height:1.6;">
                        <li>Reduce time spent hunting for unknown parts.</li>
                        <li>Keep a clean, searchable record of identifications.</li>
                        <li>Share consistent part info across your whole team.</li>
                      </ul>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 28px 18px 28px;border-top:1px solid rgba(31,41,55,.9);font-size:11px;color:#9ca3af;">
                <p style="margin:0;">
                  Log in any time at <a href="${dashboardUrl}" style="color:#38bdf8;text-decoration:none;">${dashboardUrl}</a> to see your analyses and credit balance.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

      const ok = await this.sendEmail({
        to: data.userEmail,
        subject,
        html,
      });

      if (ok) {
        await supabase.from("notifications").insert({
          user_id: await this.getUserIdByEmail(data.userEmail),
          title: "We’d love to see you back in SpareFinder",
          message:
            "Jump back in to upload a part photo and continue where you left off.",
          type: "info",
          action_url: uploadUrl,
        });
      }

      return ok;
    } catch (e) {
      console.error("Failed to send reengagement email:", e);
      return false;
    }
  }

  /**
   * Referral campaign email – invite friends / colleagues and earn bonus credits
   */
  async sendReferralInviteEmail(
    data: ReferralInviteEmailData
  ): Promise<boolean> {
    try {
      const emailEnabled = await this.isEmailEnabled();
      if (!emailEnabled) return false;

      const frontendUrl =
        process.env.FRONTEND_URL || "https://sparefinder.org";
      const baseUrl = frontendUrl.replace(/\/$/, "");
      const logoUrl = `${baseUrl}/sparefinderlogo.png`;
      const defaultReferralUrl = `${baseUrl}/register`;
      const referralUrl = data.referralUrl || defaultReferralUrl;
      const rewardCredits = data.rewardCredits ?? 3;

      const subject = `Invite your team to SpareFinder & earn ${rewardCredits} credits`;

      const html = `
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#020617;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:radial-gradient(circle at top,#4c1d95 0,#020617 55%,#000 100%);padding:32px 0;">
      <tr>
        <td>
          <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#020617;border-radius:18px;overflow:hidden;box-shadow:0 22px 60px rgba(15,23,42,.9);border:1px solid rgba(147,51,234,.5);">
            <tr>
              <td style="padding:18px 28px 14px 28px;background:#020617;color:#f9fafb;border-bottom:1px solid rgba(15,23,42,.9);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="text-align:left;vertical-align:middle;">
                      <img src="${logoUrl}" alt="SpareFinder" style="max-height:28px;width:auto;display:block;border-radius:6px;" />
                    </td>
                    <td style="text-align:right;vertical-align:middle;font-size:11px;color:#c4b5fd;">
                      Referral program · Bonus credits
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 28px 18px 28px;background:linear-gradient(135deg,#7e22ce,#4f46e5);color:#f9fafb;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;">
                  ${data.userName || "There"}, earn extra searches by inviting your team
                </h1>
                <p style="margin:6px 0 0 0;font-size:13px;opacity:.95;">
                  Share SpareFinder with colleagues and get <strong>${rewardCredits} bonus credits</strong> for every new account that completes a first analysis.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:22px 28px 6px 28px;">
                <p style="margin:0 0 10px 0;font-size:14px;color:#cbd5e1;">
                  Here’s how the referral program works:
                </p>
                <ol style="margin:0 0 10px 0;padding-left:18px;font-size:13px;color:#9ca3af;line-height:1.7;">
                  <li>Share your invite link with your colleagues and partners.</li>
                  <li>They sign up and run their <strong>first successful analysis</strong>.</li>
                  <li>You automatically receive <strong>${rewardCredits} spare part search credits</strong> in your account.</li>
                </ol>

                <div style="margin:18px 0 8px 0;text-align:left;">
                  <a href="${referralUrl}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#f9fafb;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600;font-size:14px;box-shadow:0 12px 30px rgba(88,28,135,.55);">
                    Copy or share your invite link
                  </a>
                </div>

                <p style="margin:10px 0 0 0;font-size:12px;color:#9ca3af;">
                  Invite your maintenance team, stores team, and preferred suppliers so everyone can identify parts in the same place.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 28px 12px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:12px;color:#9ca3af;">
                  <tr>
                    <td style="padding-right:10px;vertical-align:top;width:50%;border-right:1px solid rgba(31,41,55,.8);">
                      <p style="margin:0 0 4px 0;color:#e5e7eb;font-weight:600;">Who to invite</p>
                      <ul style="margin:0;padding-left:16px;line-height:1.6;">
                        <li>Maintenance &amp; reliability engineers.</li>
                        <li>Stores / inventory controllers.</li>
                        <li>Procurement and buyer teams.</li>
                      </ul>
                    </td>
                    <td style="padding-left:14px;vertical-align:top;width:50%;">
                      <p style="margin:0 0 4px 0;color:#e5e7eb;font-weight:600;">Why it helps</p>
                      <ul style="margin:0;padding-left:16px;line-height:1.6;">
                        <li>Reduce duplicate work identifying the same part.</li>
                        <li>Share one clean history of confirmed identifications.</li>
                        <li>Earn extra credits to cover your next set of jobs.</li>
                      </ul>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 28px 18px 28px;border-top:1px solid rgba(31,41,55,.9);font-size:11px;color:#9ca3af;">
                <p style="margin:0;">
                  You can manage referrals and see your credit balance any time from your SpareFinder dashboard.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

      const ok = await this.sendEmail({
        to: data.userEmail,
        subject,
        html,
      });

      if (ok) {
        await supabase.from("notifications").insert({
          user_id: await this.getUserIdByEmail(data.userEmail),
          title: "Invite friends & earn bonus credits",
          message: `You can earn ${rewardCredits} extra credits for each new user you invite who completes their first analysis.`,
          type: "info",
          metadata: {
            referral_url_used: referralUrl,
            reward_credits: rewardCredits,
          },
        });
      }

      return ok;
    } catch (e) {
      console.error("Failed to send referral invite email:", e);
      return false;
    }
  }

  private async getUserIdByEmail(email: string): Promise<string | null> {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      return profile?.id || null;
    } catch (error) {
      console.error("Failed to get user ID by email:", error);
      return null;
    }
  }

  private replacePlaceholders(
    template: string,
    data: AnalysisEmailData
  ): string {
    const frontendUrl =
      process.env.FRONTEND_URL || "https://sparefinder.org";
    const baseUrl = frontendUrl.replace(/\/$/, "");

    return template
      .replace(/{{userName}}/g, data.userName || "User")
      .replace(/{{partName}}/g, data.partName)
      .replace(/{{confidence}}/g, (data.confidence * 100).toFixed(1))
      .replace(/{{description}}/g, data.description)
      .replace(/{{processingTime}}/g, data.processingTime.toFixed(2))
      .replace(/{{analysisId}}/g, data.analysisId)
      .replace(/{{imageUrl}}/g, data.imageUrl || "")
      .replace(
        /{{dashboardUrl}}/g,
        `${baseUrl}/history`
      )
      .replace(/{{currentDate}}/g, new Date().toLocaleDateString())
      .replace(/{{currentTime}}/g, new Date().toLocaleTimeString());
  }

  private getDefaultAnalysisTemplate(data: AnalysisEmailData): string {
    const frontendUrl =
      process.env.FRONTEND_URL || "https://sparefinder.org";
    const baseUrl = frontendUrl.replace(/\/$/, "");

    const confidenceColor =
      data.confidence > 0.8
        ? "#10B981"
        : data.confidence > 0.5
        ? "#F59E0B"
        : "#EF4444";
    const confidenceText =
      data.confidence > 0.8
        ? "Excellent"
        : data.confidence > 0.5
        ? "Good"
        : "Fair";

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
                Hello ${data.userName || "there"}! 👋
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

                ${
                  data.imageUrl
                    ? `
                <div style="margin-top: 20px; text-align: center;">
                    <img src="${data.imageUrl}" alt="Analyzed Part" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                </div>
                `
                    : ""
                }

            </div>

            <!-- Performance Stats -->
            <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #0369a1; margin: 0 0 15px 0; font-size: 18px;">⚡ Analysis Performance</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <span style="color: #374151; font-weight: 500;">Processing Time:</span><br>
                        <span style="color: #0369a1; font-weight: 600;">${data.processingTime.toFixed(
                          2
                        )}s</span>
                    </div>
                    <div>
                        <span style="color: #374151; font-weight: 500;">Analysis ID:</span><br>
                        <span style="color: #6b7280; font-family: monospace; font-size: 12px;">${
                          data.analysisId
                        }</span>
                    </div>
                </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 35px 0;">
                <a href="${baseUrl}/history" 
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
      console.error("Email service connection test failed:", error);
      return false;
    }
  }

  // Add a method to test email configuration
  async sendTestEmail(
    to: string = "noreply.tpsinternational@gmail.com"
  ): Promise<boolean> {
    try {
      const testEmailOptions: EmailOptions = {
        to,
        subject: "SpareFinder AI - SMTP Configuration Test",
        html: `
          <h1>SMTP Configuration Test</h1>
          <p>This is a test email to verify the SMTP configuration for SpareFinder AI.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `,
      };

      return await this.sendEmail(testEmailOptions);
    } catch (error) {
      console.error("Test email sending failed:", error);
      return false;
    }
  }

  // Send analysis started email
  async sendAnalysisStartedEmail(
    data: AnalysisStartedEmailData
  ): Promise<boolean> {
    try {
      // Respect global email enabled setting
      const { data: notificationSettings } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("category", "notifications")
        .eq("setting_key", "email_enabled")
        .single();

      const emailEnabled =
        notificationSettings?.setting_value === "true" ||
        process.env.EMAIL_ENABLED === "true";
      if (!emailEnabled) return false;

      // Get email template
      const { data: template, error: templateError } = await supabase
        .from("email_templates")
        .select("subject, html_content, text_content")
        .eq("name", "Analysis Started")
        .eq("status", "active")
        .single();

      if (templateError || !template) {
        console.error(
          "Failed to fetch Analysis Started email template:",
          templateError
        );
        return false;
      }

      // Replace template variables
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();
      const rawFrontendUrl =
        process.env.FRONTEND_URL || "https://sparefinder.org";
      const baseFrontendUrl = rawFrontendUrl.replace(/\/$/, "");
      const dashboardUrl = `${baseFrontendUrl}/dashboard`;

      const html = template.html_content
        .replace(/\{\{userName\}\}/g, data.userName)
        .replace(/\{\{currentDate\}\}/g, currentDate)
        .replace(/\{\{currentTime\}\}/g, currentTime)
        .replace(/\{\{dashboardUrl\}\}/g, dashboardUrl);

      const text = template.text_content
        .replace(/\{\{userName\}\}/g, data.userName)
        .replace(/\{\{currentDate\}\}/g, currentDate)
        .replace(/\{\{currentTime\}\}/g, currentTime)
        .replace(/\{\{dashboardUrl\}\}/g, dashboardUrl);

      const emailOptions: EmailOptions = {
        to: data.userEmail,
        subject: template.subject,
        html,
        text,
      };

      const success = await this.sendEmail(emailOptions);

      if (success) {
        // Create notification record in database
        await supabase.from("notifications").insert({
          user_id: await this.getUserIdByEmail(data.userEmail),
          title: "Analysis Started Email Sent",
          message: `Email notification sent for analysis start: ${data.analysisId}`,
          type: "info",
          metadata: {
            email_sent: true,
            analysis_id: data.analysisId,
            type: "analysis_started",
          },
        });
      }

      return success;
    } catch (error) {
      console.error("Failed to send analysis started email:", error);
      return false;
    }
  }

  // Send analysis failed email
  async sendAnalysisFailedEmail(
    data: AnalysisFailedEmailData
  ): Promise<boolean> {
    try {
      // Respect global email enabled setting
      const { data: notificationSettings } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("category", "notifications")
        .eq("setting_key", "email_enabled")
        .single();

      const emailEnabled =
        notificationSettings?.setting_value === "true" ||
        process.env.EMAIL_ENABLED === "true";
      if (!emailEnabled) return false;

      // Get email template
      const { data: template, error: templateError } = await supabase
        .from("email_templates")
        .select("subject, html_content, text_content")
        .eq("name", "Analysis Failed")
        .eq("status", "active")
        .single();

      if (templateError || !template) {
        console.error(
          "Failed to fetch Analysis Failed email template:",
          templateError
        );
        return false;
      }

      // Replace template variables
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();
      const rawFrontendUrl =
        process.env.FRONTEND_URL || "https://sparefinder.org";
      const baseFrontendUrl = rawFrontendUrl.replace(/\/$/, "");
      const dashboardUrl = `${baseFrontendUrl}/dashboard`;

      const html = template.html_content
        .replace(/\{\{userName\}\}/g, data.userName)
        .replace(/\{\{errorMessage\}\}/g, data.errorMessage)
        .replace(/\{\{currentDate\}\}/g, currentDate)
        .replace(/\{\{currentTime\}\}/g, currentTime)
        .replace(/\{\{dashboardUrl\}\}/g, dashboardUrl);

      const text = template.text_content
        .replace(/\{\{userName\}\}/g, data.userName)
        .replace(/\{\{errorMessage\}\}/g, data.errorMessage)
        .replace(/\{\{currentDate\}\}/g, currentDate)
        .replace(/\{\{currentTime\}\}/g, currentTime)
        .replace(/\{\{dashboardUrl\}\}/g, dashboardUrl);

      const emailOptions: EmailOptions = {
        to: data.userEmail,
        subject: template.subject,
        html,
        text,
      };

      const success = await this.sendEmail(emailOptions);

      if (success) {
        // Create notification record in database
        await supabase.from("notifications").insert({
          user_id: await this.getUserIdByEmail(data.userEmail),
          title: "Analysis Failed Email Sent",
          message: `Email notification sent for analysis failure: ${data.analysisId}`,
          type: "error",
          metadata: {
            email_sent: true,
            analysis_id: data.analysisId,
            error_message: data.errorMessage,
            type: "analysis_failed",
          },
        });
      }

      return success;
    } catch (error) {
      console.error("Failed to send analysis failed email:", error);
      return false;
    }
  }

  // Send analysis processing email
  async sendAnalysisProcessingEmail(
    data: AnalysisProcessingEmailData
  ): Promise<boolean> {
    try {
      // Respect global email enabled setting
      const { data: notificationSettings } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("category", "notifications")
        .eq("setting_key", "email_enabled")
        .single();

      const emailEnabled =
        notificationSettings?.setting_value === "true" ||
        process.env.EMAIL_ENABLED === "true";
      if (!emailEnabled) return false;

      // Get email template
      const { data: template, error: templateError } = await supabase
        .from("email_templates")
        .select("subject, html_content, text_content")
        .eq("name", "Analysis Processing")
        .eq("status", "active")
        .single();

      if (templateError || !template) {
        console.error(
          "Failed to fetch Analysis Processing email template:",
          templateError
        );
        return false;
      }

      // Replace template variables
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();
      const rawFrontendUrl =
        process.env.FRONTEND_URL || "https://sparefinder.org";
      const baseFrontendUrl = rawFrontendUrl.replace(/\/$/, "");
      const dashboardUrl = `${baseFrontendUrl}/dashboard`;

      const html = template.html_content
        .replace(/\{\{userName\}\}/g, data.userName)
        .replace(/\{\{currentDate\}\}/g, currentDate)
        .replace(/\{\{currentTime\}\}/g, currentTime)
        .replace(/\{\{dashboardUrl\}\}/g, dashboardUrl);

      const text = template.text_content
        .replace(/\{\{userName\}\}/g, data.userName)
        .replace(/\{\{currentDate\}\}/g, currentDate)
        .replace(/\{\{currentTime\}\}/g, currentTime)
        .replace(/\{\{dashboardUrl\}\}/g, dashboardUrl);

      const emailOptions: EmailOptions = {
        to: data.userEmail,
        subject: template.subject,
        html,
        text,
      };

      const success = await this.sendEmail(emailOptions);

      if (success) {
        // Create notification record in database
        await supabase.from("notifications").insert({
          user_id: await this.getUserIdByEmail(data.userEmail),
          title: "Analysis Processing Email Sent",
          message: `Email notification sent for analysis processing: ${data.analysisId}`,
          type: "warning",
          metadata: {
            email_sent: true,
            analysis_id: data.analysisId,
            processing_time_minutes: data.processingTimeMinutes,
            type: "analysis_processing",
          },
        });
      }

      return success;
    } catch (error) {
      console.error("Failed to send analysis processing email:", error);
      return false;
    }
  }

  // Generic method to send emails using templates from database
  async sendTemplateEmail(data: {
    templateName: string;
    userEmail: string;
    variables: Record<string, string>;
  }): Promise<boolean> {
    try {
      // Get template from database
      const { data: template, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("name", data.templateName)
        .eq("status", "active")
        .single();

      if (error || !template) {
        console.error(
          `Template "${data.templateName}" not found or inactive:`,
          error
        );
        return false;
      }

      // Replace variables in content
      let htmlContent = template.html_content || "";
      let textContent = template.text_content || "";
      let subject = template.subject;

      // Replace all variables
      Object.entries(data.variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        htmlContent = htmlContent.replace(
          new RegExp(placeholder, "g"),
          String(value)
        );
        textContent = textContent.replace(
          new RegExp(placeholder, "g"),
          String(value)
        );
        subject = subject.replace(new RegExp(placeholder, "g"), String(value));
      });

      const emailOptions: EmailOptions = {
        to: data.userEmail,
        subject: subject,
        html: htmlContent,
        text: textContent,
      };

      const success = await this.sendEmail(emailOptions);

      if (success) {
        // Create notification record in database
        const userId = await this.getUserIdByEmail(data.userEmail);
        if (userId) {
          await supabase.from("notifications").insert({
            user_id: userId,
            title: `${template.name} Email Sent`,
            message: `Email notification sent: ${template.subject}`,
            type: template.name.includes("Failed")
              ? "error"
              : template.name.includes("Processing")
              ? "warning"
              : "info",
            metadata: {
              email_sent: true,
              template_name: template.name,
              template_id: template.id,
              type: "template_email",
            },
          });
        }
      }

      return success;
    } catch (error) {
      console.error(
        `Failed to send template email "${data.templateName}":`,
        error
      );
      return false;
    }
  }

  // Send trial activation email
  async sendTrialActivatedEmail(data: SubscriptionEmailData): Promise<boolean> {
    try {
      const emailEnabled = await this.isEmailEnabled();
      if (!emailEnabled) return false;

      const dashboardUrl = `${
        process.env.FRONTEND_URL || "https://app.sparefinder.org"
      }/dashboard`;
      const billingUrl = `${
        process.env.FRONTEND_URL || "https://app.sparefinder.org"
      }/dashboard/billing`;
      const trialEndDate = data.trialEndDate || "30 days from now";

      const subject = `🎉 Your ${data.planName} Trial is Active!`;
      const html = `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0b1026;color:#edf2f7;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#0b1026,#1a1033,#0c1226);padding:32px 0;">
    <tr>
      <td>
        <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" style="background:#0f172a;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;">
              <h1 style="margin:0;font-size:24px;">Your Trial is Active! 🎉</h1>
              <p style="margin:6px 0 0 0;opacity:.9;">Welcome to ${
                data.planName
              }</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px 0;color:#cbd5e1;line-height:1.6;">
                Hi ${data.userName || "there"},
              </p>
              <p style="margin:0 0 16px 0;color:#cbd5e1;line-height:1.6;">
                Great news! Your ${
                  data.trialDays || 30
                }-day free trial for the <strong>${
        data.planName
      }</strong> plan has been activated.
              </p>
              <div style="background:#1e293b;border-left:4px solid #10b981;padding:16px;margin:20px 0;border-radius:8px;">
                <p style="margin:0 0 8px 0;color:#e2e8f0;font-weight:600;">Trial Details:</p>
                <ul style="margin:0;padding-left:20px;color:#cbd5e1;line-height:1.8;">
                  <li>Plan: <strong>${data.planName}</strong></li>
                  <li>Trial Period: ${data.trialDays || 30} days</li>
                  <li>Trial Ends: ${trialEndDate}</li>
                  <li>After Trial: £${data.amount || 12.99}/${
        data.currency?.toLowerCase() === "gbp" ? "month" : "month"
      }</li>
                </ul>
              </div>
              <p style="margin:16px 0;color:#cbd5e1;line-height:1.6;">
                During your trial, you have full access to all ${
                  data.planName
                } features. No charges will be made until the trial period ends.
              </p>
              <div style="margin:24px 0;">
                <a href="${dashboardUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;margin-right:12px;">Go to Dashboard</a>
                <a href="${billingUrl}" style="display:inline-block;background:#1e293b;color:#e2e8f0;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;">Manage Subscription</a>
              </div>
              <p style="margin:24px 0 0 0;color:#94a3b8;font-size:14px;line-height:1.6;">
                You can cancel anytime during your trial period with no charges. After the trial ends, your subscription will automatically continue at £${
                  data.amount || 12.99
                }/${data.currency?.toLowerCase() === "gbp" ? "month" : "month"}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const success = await this.sendEmail({
        to: data.userEmail,
        subject,
        html,
      });

      if (success) {
        const userId = await this.getUserIdByEmail(data.userEmail);
        if (userId) {
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Trial Activated",
            message: `Your ${data.planName} trial has been activated`,
            type: "success",
            metadata: {
              email_sent: true,
              plan_name: data.planName,
              trial_days: data.trialDays,
            },
          });
        }
      }

      return success;
    } catch (error) {
      console.error("Failed to send trial activated email:", error);
      return false;
    }
  }

  // Send subscription purchased/upgraded email
  async sendSubscriptionPurchasedEmail(
    data: SubscriptionEmailData
  ): Promise<boolean> {
    try {
      const emailEnabled = await this.isEmailEnabled();
      if (!emailEnabled) return false;

      const dashboardUrl = `${
        process.env.FRONTEND_URL || "https://app.sparefinder.org"
      }/dashboard`;
      const billingUrl = `${
        process.env.FRONTEND_URL || "https://app.sparefinder.org"
      }/dashboard/billing`;

      const subject = `✅ Subscription Confirmed – ${data.planName}`;
      const html = `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0b1026;color:#edf2f7;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#0b1026,#1a1033,#0c1226);padding:32px 0;">
    <tr>
      <td>
        <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" style="background:#0f172a;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;">
              <h1 style="margin:0;font-size:24px;">Subscription Confirmed! ✅</h1>
              <p style="margin:6px 0 0 0;opacity:.9;">Thank you for subscribing</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px 0;color:#cbd5e1;line-height:1.6;">
                Hi ${data.userName || "there"},
              </p>
              <p style="margin:0 0 16px 0;color:#cbd5e1;line-height:1.6;">
                Your subscription to the <strong>${
                  data.planName
                }</strong> plan has been confirmed!
              </p>
              <div style="background:#1e293b;border-left:4px solid #3b82f6;padding:16px;margin:20px 0;border-radius:8px;">
                <p style="margin:0 0 8px 0;color:#e2e8f0;font-weight:600;">Subscription Details:</p>
                <ul style="margin:0;padding-left:20px;color:#cbd5e1;line-height:1.8;">
                  <li>Plan: <strong>${data.planName}</strong></li>
                  <li>Amount: £${data.amount || 12.99}/${
        data.currency?.toLowerCase() === "gbp" ? "month" : "month"
      }</li>
                  ${
                    data.subscriptionStartDate
                      ? `<li>Start Date: ${data.subscriptionStartDate}</li>`
                      : ""
                  }
                  ${
                    data.subscriptionEndDate
                      ? `<li>Next Billing: ${data.subscriptionEndDate}</li>`
                      : ""
                  }
                </ul>
              </div>
              <p style="margin:16px 0;color:#cbd5e1;line-height:1.6;">
                You now have full access to all ${
                  data.planName
                } features. Start using SpareFinder AI to identify and manage your Engineering spares parts!
              </p>
              <div style="margin:24px 0;">
                <a href="${dashboardUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;margin-right:12px;">Go to Dashboard</a>
                <a href="${billingUrl}" style="display:inline-block;background:#1e293b;color:#e2e8f0;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;">Manage Subscription</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const success = await this.sendEmail({
        to: data.userEmail,
        subject,
        html,
      });

      if (success) {
        const userId = await this.getUserIdByEmail(data.userEmail);
        if (userId) {
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Subscription Confirmed",
            message: `Your ${data.planName} subscription has been confirmed`,
            type: "success",
            metadata: {
              email_sent: true,
              plan_name: data.planName,
            },
          });
        }
      }

      return success;
    } catch (error) {
      console.error("Failed to send subscription purchased email:", error);
      return false;
    }
  }

  // Send subscription renewal email
  async sendSubscriptionRenewedEmail(
    data: SubscriptionEmailData
  ): Promise<boolean> {
    try {
      const emailEnabled = await this.isEmailEnabled();
      if (!emailEnabled) return false;

      const billingUrl = `${
        process.env.FRONTEND_URL || "https://app.sparefinder.org"
      }/dashboard/billing`;

      const subject = `🔄 Subscription Renewed – ${data.planName}`;
      const html = `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0b1026;color:#edf2f7;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#0b1026,#1a1033,#0c1226);padding:32px 0;">
    <tr>
      <td>
        <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" style="background:#0f172a;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;">
              <h1 style="margin:0;font-size:24px;">Subscription Renewed 🔄</h1>
              <p style="margin:6px 0 0 0;opacity:.9;">Your monthly credits have been added</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px 0;color:#cbd5e1;line-height:1.6;">
                Hi ${data.userName || "there"},
              </p>
              <p style="margin:0 0 16px 0;color:#cbd5e1;line-height:1.6;">
                Your <strong>${
                  data.planName
                }</strong> subscription has been renewed for another month.
              </p>
              <div style="background:#1e293b;border-left:4px solid #8b5cf6;padding:16px;margin:20px 0;border-radius:8px;">
                <p style="margin:0 0 8px 0;color:#e2e8f0;font-weight:600;">Renewal Details:</p>
                <ul style="margin:0;padding-left:20px;color:#cbd5e1;line-height:1.8;">
                  <li>Plan: <strong>${data.planName}</strong></li>
                  <li>Amount Charged: £${data.amount || 12.99}</li>
                  ${
                    data.subscriptionEndDate
                      ? `<li>Next Billing Date: ${data.subscriptionEndDate}</li>`
                      : ""
                  }
                </ul>
              </div>
              <p style="margin:16px 0;color:#cbd5e1;line-height:1.6;">
                Your monthly credits have been added to your account. Thank you for being a valued customer!
              </p>
              <div style="margin:24px 0;">
                <a href="${billingUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;">View Billing</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const success = await this.sendEmail({
        to: data.userEmail,
        subject,
        html,
      });

      if (success) {
        const userId = await this.getUserIdByEmail(data.userEmail);
        if (userId) {
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Subscription Renewed",
            message: `Your ${data.planName} subscription has been renewed`,
            type: "info",
            metadata: {
              email_sent: true,
              plan_name: data.planName,
            },
          });
        }
      }

      return success;
    } catch (error) {
      console.error("Failed to send subscription renewed email:", error);
      return false;
    }
  }

  // Send payment failed email
  async sendPaymentFailedEmail(data: SubscriptionEmailData): Promise<boolean> {
    try {
      const emailEnabled = await this.isEmailEnabled();
      if (!emailEnabled) return false;

      const billingUrl = `${
        process.env.FRONTEND_URL || "https://app.sparefinder.org"
      }/dashboard/billing`;

      const subject = `⚠️ Payment Failed – Action Required`;
      const html = `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0b1026;color:#edf2f7;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#0b1026,#1a1033,#0c1226);padding:32px 0;">
    <tr>
      <td>
        <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" style="background:#0f172a;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;">
              <h1 style="margin:0;font-size:24px;">Payment Failed ⚠️</h1>
              <p style="margin:6px 0 0 0;opacity:.9;">Action required to maintain your subscription</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px 0;color:#cbd5e1;line-height:1.6;">
                Hi ${data.userName || "there"},
              </p>
              <p style="margin:0 0 16px 0;color:#cbd5e1;line-height:1.6;">
                We were unable to process the payment for your <strong>${
                  data.planName
                }</strong> subscription.
              </p>
              <div style="background:#1e293b;border-left:4px solid #ef4444;padding:16px;margin:20px 0;border-radius:8px;">
                <p style="margin:0 0 8px 0;color:#e2e8f0;font-weight:600;">Payment Details:</p>
                <ul style="margin:0;padding-left:20px;color:#cbd5e1;line-height:1.8;">
                  <li>Plan: <strong>${data.planName}</strong></li>
                  <li>Amount: £${data.amount || 12.99}</li>
                </ul>
              </div>
              <p style="margin:16px 0;color:#cbd5e1;line-height:1.6;">
                Please update your payment method to avoid service interruption. Your subscription will remain active while we retry the payment.
              </p>
              <div style="margin:24px 0;">
                <a href="${billingUrl}" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;">Update Payment Method</a>
              </div>
              <p style="margin:24px 0 0 0;color:#94a3b8;font-size:14px;line-height:1.6;">
                If you have any questions, please contact our support team.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const success = await this.sendEmail({
        to: data.userEmail,
        subject,
        html,
      });

      if (success) {
        const userId = await this.getUserIdByEmail(data.userEmail);
        if (userId) {
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Payment Failed",
            message: `Payment failed for ${data.planName} subscription. Please update your payment method.`,
            type: "error",
            metadata: {
              email_sent: true,
              plan_name: data.planName,
            },
          });
        }
      }

      return success;
    } catch (error) {
      console.error("Failed to send payment failed email:", error);
      return false;
    }
  }

  // Send admin notification for purchases/subscriptions
  async sendAdminPurchaseNotification(data: {
    purchaseType: "trial" | "purchase" | "renewal";
    userEmail: string;
    userName: string;
    planName: string;
    planTier: string;
    amount?: number;
    currency?: string;
    trialDays?: number;
    userId: string;
  }): Promise<boolean> {
    try {
      const emailEnabled = await this.isEmailEnabled();
      if (!emailEnabled) return false;

      // Get all admin users
      const { data: adminUsers, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, first_name, last_name")
        .in("role", ["admin", "super_admin"]);

      if (error || !adminUsers || adminUsers.length === 0) {
        console.warn("No admin users found for purchase notification");
        return false;
      }

      // Support payment failure notifications (check metadata or add explicit type)
      const isPaymentFailure = (data as any).isPaymentFailure === true;
      const subject = isPaymentFailure
        ? `⚠️ Payment Failed: ${data.planName}`
        : `💰 New ${
            data.purchaseType === "trial"
              ? "Trial"
              : data.purchaseType === "renewal"
              ? "Renewal"
              : "Purchase"
          }: ${data.planName}`;
      const purchaseTitle = isPaymentFailure
        ? "Payment Failed ⚠️"
        : data.purchaseType === "trial"
        ? "Trial Started"
        : data.purchaseType === "renewal"
        ? "Subscription Renewed"
        : "Subscription Purchased";
      const purchaseDescription = isPaymentFailure
        ? "User's payment failed - action may be required"
        : data.purchaseType === "trial"
        ? `User started a ${data.trialDays || 30}-day free trial`
        : data.purchaseType === "renewal"
        ? "User's subscription was renewed"
        : "User purchased a new subscription";

      const html = `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0b1026;color:#edf2f7;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#0b1026,#1a1033,#0c1226);padding:32px 0;">
    <tr>
      <td>
        <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" style="background:#0f172a;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,${
              isPaymentFailure ? "#ef4444,#dc2626" : "#f59e0b,#d97706"
            });color:#fff;">
              <h1 style="margin:0;font-size:24px;">${purchaseTitle} ${
        isPaymentFailure ? "⚠️" : "💰"
      }</h1>
              <p style="margin:6px 0 0 0;opacity:.9;">${
                isPaymentFailure
                  ? "Payment issue detected"
                  : "New subscription activity"
              }</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px 0;color:#cbd5e1;line-height:1.6;">
                Admin Notification,
              </p>
              <p style="margin:0 0 16px 0;color:#cbd5e1;line-height:1.6;">
                ${purchaseDescription}:
              </p>
              <div style="background:#1e293b;border-left:4px solid ${
                isPaymentFailure ? "#ef4444" : "#f59e0b"
              };padding:16px;margin:20px 0;border-radius:8px;">
                <p style="margin:0 0 8px 0;color:#e2e8f0;font-weight:600;">Purchase Details:</p>
                <ul style="margin:0;padding-left:20px;color:#cbd5e1;line-height:1.8;">
                  <li>User: <strong>${data.userName}</strong> (${
        data.userEmail
      })</li>
                  <li>Plan: <strong>${data.planName}</strong> (${
        data.planTier
      })</li>
                  ${
                    data.amount
                      ? `<li>Amount: £${data.amount} ${
                          data.currency || "GBP"
                        }</li>`
                      : ""
                  }
                  ${
                    data.trialDays
                      ? `<li>Trial Period: ${data.trialDays} days</li>`
                      : ""
                  }
                  <li>User ID: ${data.userId}</li>
                  <li>Time: ${new Date().toLocaleString("en-GB", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</li>
                </ul>
              </div>
              <p style="margin:16px 0;color:#cbd5e1;line-height:1.6;">
                This is an automated notification for admin review.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      // Send email to all admins
      let successCount = 0;
      for (const admin of adminUsers) {
        const adminEmail = admin.email;
        if (adminEmail) {
          const success = await this.sendEmail({
            to: adminEmail,
            subject,
            html,
          });
          if (success) {
            successCount++;
            // Create notification record for admin
            await supabase.from("notifications").insert({
              user_id: admin.id,
              title: purchaseTitle,
              message: `${data.userName} (${data.userEmail}) - ${data.planName} ${data.purchaseType}`,
              type: "info",
              metadata: {
                email_sent: true,
                purchase_type: data.purchaseType,
                customer_email: data.userEmail,
                customer_name: data.userName,
                plan_name: data.planName,
                plan_tier: data.planTier,
                amount: data.amount,
                user_id: data.userId,
              },
            });
          }
        }
      }

      console.log(
        `📧 Admin purchase notification sent to ${successCount}/${adminUsers.length} admins`
      );
      return successCount > 0;
    } catch (error) {
      console.error("Failed to send admin purchase notification:", error);
      return false;
    }
  }

  // Helper method to check if email is enabled
  private async isEmailEnabled(): Promise<boolean> {
    try {
      const { data: notificationSettings } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("category", "notifications")
        .eq("setting_key", "email_enabled")
        .single();

      return (
        notificationSettings?.setting_value === true ||
        notificationSettings?.setting_value === "true" ||
        process.env.EMAIL_ENABLED === "true"
      );
    } catch {
      return false;
    }
  }

  // Method to refresh SMTP configuration (useful when admin updates settings)
  async refreshSmtpConfiguration(): Promise<boolean> {
    try {
      console.log("🔄 Refreshing SMTP configuration...");
      this.transporter = null;
      this.isConfigured = false;
      await this.initializeTransporter();
      return this.isConfigured;
    } catch (error) {
      console.error("Failed to refresh SMTP configuration:", error);
      return false;
    }
  }

  // Method to get current SMTP configuration status
  getConfigurationStatus(): {
    isConfigured: boolean;
    senderName: string;
    senderEmail: string;
  } {
    return {
      isConfigured: this.isConfigured,
      senderName: this.senderName,
      senderEmail: this.senderEmail,
    };
  }
}

export const emailService = new EmailService();
export {
  EmailService,
  AnalysisEmailData,
  AnalysisStartedEmailData,
  AnalysisFailedEmailData,
  AnalysisProcessingEmailData,
  SubscriptionEmailData,
};
