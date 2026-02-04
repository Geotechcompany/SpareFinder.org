"""Email sending functionality via SMTP or email-service.

Supports Hostinger / custom SMTP via:
- SMTP_HOST, SMTP_PORT
- SMTP_USER, SMTP_PASSWORD
- SMTP_SECURE=true (for implicit SSL/TLS, typically port 465)
- SMTP_FROM, SMTP_FROM_NAME

Back-compat (older deployments):
- GMAIL_USER/GMAIL_PASS (treated as SMTP_USER/SMTP_PASSWORD)
"""

import os
import smtplib
import logging
import socket
from typing import Optional
from email.utils import formataddr
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path
import httpx

logger = logging.getLogger(__name__)

def _env_bool(name: str, default: bool = False) -> bool:
    raw = (os.getenv(name) or "").strip().lower()
    if raw in ("1", "true", "yes", "y", "on"):
        return True
    if raw in ("0", "false", "no", "n", "off"):
        return False
    return default


def _resolve_smtp_credentials() -> tuple[str, str] | None:
    # Prefer generic SMTP_* vars; fall back to legacy Gmail vars.
    user = (os.getenv("SMTP_USER") or os.getenv("GMAIL_USER") or "").strip()
    password = (os.getenv("SMTP_PASSWORD") or os.getenv("SMTP_PASS") or os.getenv("GMAIL_PASS") or "").strip()
    if not user or not password:
        return None
    return user, password


def _resolve_smtp_host_port() -> tuple[str, int] | None:
    """
    Resolve SMTP host/port from env vars, handling empty-string misconfigs.

    Important: Render can store env vars with empty values. `os.getenv("SMTP_HOST", "smtp.gmail.com")`
    would return "" (empty) in that case, which breaks TLS with:
    "server_hostname cannot be an empty string or start with a leading dot."
    """
    raw_host = os.getenv("SMTP_HOST")
    host = (raw_host or "").strip()
    if not host:
        host = "smtp.gmail.com"

    if host.startswith("."):
        logger.error(f"❌ Invalid SMTP_HOST (starts with '.'): {host!r}")
        return None

    raw_port = os.getenv("SMTP_PORT")
    try:
        port = int((raw_port or "").strip() or "587")
    except ValueError:
        logger.warning(f"⚠️ Invalid SMTP_PORT value {raw_port!r}; defaulting to 587")
        port = 587

    logger.info(f"📧 SMTP config: host={host!r} port={port}")
    return host, port


def send_basic_email_smtp(
    *,
    to_email: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
) -> bool:
    """Send a basic email via SMTP using SMTP_USER/SMTP_PASSWORD (or legacy GMAIL_*)."""
    creds = _resolve_smtp_credentials()
    if not creds:
        logger.warning("⚠️ Email not configured (SMTP_USER/SMTP_PASSWORD not set) - skipping email send")
        return False
    smtp_user, smtp_password = creds

    smtp_cfg = _resolve_smtp_host_port()
    if not smtp_cfg:
        return False
    smtp_host, smtp_port = smtp_cfg
    is_secure = _env_bool("SMTP_SECURE", default=(smtp_port == 465))

    from_email = (os.getenv("SMTP_FROM") or smtp_user).strip()
    # Always prefer showing a brand display-name in inboxes
    from_name = (os.getenv("SMTP_FROM_NAME") or "SpareFinder").strip()
    from_header = formataddr((str(Header(from_name, "utf-8")), from_email))

    msg = MIMEMultipart("alternative")
    msg["From"] = from_header
    msg["To"] = to_email
    msg["Subject"] = subject
    if text:
        msg.attach(MIMEText(text, "plain"))
    if html:
        msg.attach(MIMEText(html, "html"))

    # Quick connectivity test
    try:
        test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        test_socket.settimeout(5)
        result = test_socket.connect_ex((smtp_host, smtp_port))
        test_socket.close()
        if result != 0:
            logger.warning(f"⚠️ Cannot reach {smtp_host}:{smtp_port} - skipping email send")
            return False
    except Exception as conn_test_error:
        logger.warning(f"⚠️ Network connectivity test failed: {conn_test_error}")
        return False

    try:
        server = None
        try:
            if is_secure:
                server = smtplib.SMTP_SSL(host=smtp_host, port=smtp_port, timeout=30)
            else:
                # Pass host/port into constructor so smtplib stores a non-empty internal hostname for TLS SNI.
                server = smtplib.SMTP(host=smtp_host, port=smtp_port, timeout=30)
                server._host = smtp_host  # type: ignore[attr-defined]
                server.starttls()

            server.login(smtp_user, smtp_password)
            server.sendmail(from_email, [to_email], msg.as_string())
            logger.info(f"✅ Email sent successfully to {to_email}")
            return True
        finally:
            if server:
                try:
                    server.quit()
                except Exception:
                    try:
                        server.close()
                    except Exception:
                        pass
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"❌ SMTP authentication failed: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"❌ SMTP error: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error sending email: {e}")
        return False


def send_email_via_email_service(
    *,
    to_email: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
) -> bool:
    """
    Send an email via the separate email-service HTTP API.
    Expects EMAIL_SERVICE_URL to be set (e.g. https://sparefinder-org-1.onrender.com).
    """
    base_url = (os.getenv("EMAIL_SERVICE_URL") or "").strip().rstrip("/")
    if not base_url:
        return False

    url = f"{base_url}/send-email"
    payload = {"to": to_email, "subject": subject, "html": html, "text": text}

    try:
        with httpx.Client(timeout=30) as client:
            res = client.post(url, json=payload)
        if 200 <= res.status_code < 300:
            logger.info(f"✅ Email-service sent email to {to_email}")
            return True
        logger.error(f"❌ Email-service failed ({res.status_code}): {res.text}")
        return False
    except Exception as e:
        logger.error(f"❌ Email-service request failed: {e}")
        return False


def send_no_regional_suppliers_email(
    *,
    to_email: str,
    region_label: str,
    settings_url: str = "https://sparefinder.org/dashboard/settings",
) -> bool:
    """
    Send an email when no suppliers were found in the user's region.
    Suggests retrying with another region or disabling the region preference (global search).
    """
    subject = "SpareFinder: No suppliers found in your region – retry or switch to global"
    text = f"""Hi,

Your SpareFinder Research completed, but no suppliers were found in your selected region ({region_label}).

You can:
1. Retry with global search – run the same search again with region preference turned off to see worldwide suppliers.
2. Change your region – update your country/region in Settings (Preferences) and run a new search.

Settings: {settings_url}

Your report is still attached / available in your History.
"""
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>No suppliers in region</title></head>
<body style="font-family: sans-serif; max-width: 560px;">
  <p>Hi,</p>
  <p>Your SpareFinder Research completed, but <strong>no suppliers were found</strong> in your selected region (<strong>{region_label}</strong>).</p>
  <p>You can:</p>
  <ol>
    <li><strong>Retry with global search</strong> – run the same search again with region preference turned off to see worldwide suppliers.</li>
    <li><strong>Change your region</strong> – update your country/region in Settings → Preferences and run a new search.</li>
  </ol>
  <p><a href="{settings_url}">Open Settings (Preferences)</a></p>
  <p>Your report is still available in your History.</p>
  <p>— SpareFinder</p>
</body>
</html>"""
    ok = send_basic_email_smtp(to_email=to_email, subject=subject, html=html, text=text)
    if not ok:
        ok = send_email_via_email_service(to_email=to_email, subject=subject, html=html, text=text)
    return ok


def _send_billing_email(*, to_email: str, subject: str, html: str, text: str) -> bool:
    """Send a billing-related email (SMTP first, then email-service fallback)."""
    ok = send_basic_email_smtp(to_email=to_email, subject=subject, html=html, text=text)
    if not ok:
        ok = send_email_via_email_service(to_email=to_email, subject=subject, html=html, text=text)
    return ok


def _email_header() -> str:
    """Modern branded header for subscription emails (solid colors for email client compatibility)."""
    return """
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <tr>
    <td style="background: #6366f1; padding: 24px 32px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">SpareFinder</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #e0e7ff;">AI-powered spare parts identification</p>
    </td>
  </tr>
</table>
"""


def _email_footer(billing_url: str = "https://sparefinder.org/dashboard/billing") -> str:
    """Shared footer with support and links."""
    return f"""
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <tr>
    <td style="padding: 24px 32px; background: #f8fafc; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
      <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
        Need help? <a href="mailto:support@sparefinder.org" style="color: #6366f1; text-decoration: none;">support@sparefinder.org</a>
        &nbsp;·&nbsp;
        <a href="{billing_url}" style="color: #6366f1; text-decoration: none;">Billing</a>
        &nbsp;·&nbsp;
        <a href="https://sparefinder.org" style="color: #6366f1; text-decoration: none;">SpareFinder.org</a>
      </p>
      <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8; text-align: center;">You received this email because you have a SpareFinder account.</p>
    </td>
  </tr>
</table>
"""


def _wrap_subscription_email(body_content: str, billing_url: str = "https://sparefinder.org/dashboard/billing") -> str:
    """Wrap body in full email layout with header and footer."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SpareFinder</title>
</head>
<body style="margin: 0; padding: 24px 16px; background: #f1f5f9;">
{_email_header()}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <tr>
    <td style="padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none;">
{body_content}
    </td>
  </tr>
</table>
{_email_footer(billing_url)}
</body>
</html>"""


def send_purchase_confirmation_email(
    *,
    to_email: str,
    plan_name: str,
    amount_paid: Optional[str] = None,
    billing_url: str = "https://sparefinder.org/dashboard/billing",
    is_subscription: bool = True,
) -> bool:
    """
    Send a purchase confirmation email after a successful plan purchase (checkout.session.completed).
    Modern SaaS-style: clear confirmation, what they get, and link to manage subscription.
    """
    subject = f"🎉 Your SpareFinder {plan_name} plan is active"
    amount_line = f"\nAmount paid: {amount_paid}" if amount_paid else ""
    text = f"""Hi,

Thank you for subscribing to SpareFinder. Your {plan_name} plan is now active.

What's next:
• Use your full access in the dashboard
• Manage your subscription, invoices, and payment methods at: {billing_url}
• Contact us at support@sparefinder.org if you have any questions
{amount_line}

— SpareFinder
"""
    amount_block = f"""
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 20px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
        <tr><td style="padding: 12px 16px; font-size: 14px; color: #166534;"><strong>Amount paid:</strong> {amount_paid}</td></tr>
      </table>""" if amount_paid else ""
    body = f"""
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="text-align: center; padding-bottom: 20px;">
            <span style="display: inline-block; width: 56px; height: 56px; line-height: 56px; font-size: 28px; background: #10b981; border-radius: 50%; color: #fff;">✓</span>
          </td>
        </tr>
        <tr>
          <td>
            <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #0f172a;">Congratulations!</h2>
            <p style="margin: 0; font-size: 16px; color: #475569; line-height: 1.6;">Your <strong style="color: #059669;">{plan_name}</strong> plan is now active. You have full access to all features included in your subscription.</p>
          </td>
        </tr>
        <tr><td height="20"></td></tr>
        <tr>
          <td style="background: #f8fafc; border-radius: 8px; padding: 16px; border-left: 4px solid #6366f1;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #334155;">What you can do now</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.8;">
              <li>Upload parts and run AI-powered identification in the <a href="https://sparefinder.org/dashboard" style="color: #6366f1; text-decoration: none;">dashboard</a></li>
              <li>View usage, invoices, and payment methods in <a href="{billing_url}" style="color: #6366f1; text-decoration: none;">Billing</a></li>
              <li>Get help anytime at <a href="mailto:support@sparefinder.org" style="color: #6366f1; text-decoration: none;">support@sparefinder.org</a></li>
            </ul>
          </td>
        </tr>
        {amount_block}
      </table>"""
    html = _wrap_subscription_email(body, billing_url)
    return _send_billing_email(to_email=to_email, subject=subject, html=html, text=text)


def send_receipt_email(
    *,
    to_email: str,
    plan_name: str,
    amount_paid: str,
    currency: str = "GBP",
    receipt_url: Optional[str] = None,
    billing_url: str = "https://sparefinder.org/dashboard/billing",
) -> bool:
    """
    Send a receipt email (e.g. after invoice.payment_succeeded) with optional link to Stripe receipt.
    """
    subject = f"Receipt for your SpareFinder payment – {amount_paid} {currency}"
    receipt_line = f"\nDownload or view your receipt: {receipt_url}" if receipt_url else ""
    text = f"""Hi,

Your payment has been received.

Plan: {plan_name}
Amount: {amount_paid} {currency}
{receipt_line}

Manage subscriptions and view past invoices: {billing_url}

— SpareFinder
"""
    receipt_block = f"""
        <tr>
          <td style="padding-top: 16px;">
            <a href="{receipt_url}" style="display: inline-block; padding: 12px 20px; background: #6366f1; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px;">View or download receipt</a>
          </td>
        </tr>""" if receipt_url else ""
    body = f"""
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="text-align: center; padding-bottom: 16px;">
            <span style="display: inline-block; width: 52px; height: 52px; line-height: 52px; font-size: 24px; background: #6366f1; border-radius: 50%; color: #fff;">📄</span>
          </td>
        </tr>
        <tr>
          <td>
            <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Payment received</h2>
            <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">We've received your payment for your SpareFinder subscription.</p>
          </td>
        </tr>
        <tr><td height="16"></td></tr>
        <tr>
          <td>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <tr><td style="padding: 16px 20px; font-size: 14px; color: #334155;"><strong>Plan</strong></td><td style="padding: 16px 20px; font-size: 14px; color: #475569; text-align: right;">{plan_name}</td></tr>
              <tr><td colspan="2" style="border-top: 1px solid #e2e8f0;"></td></tr>
              <tr><td style="padding: 16px 20px; font-size: 14px; color: #334155;"><strong>Amount</strong></td><td style="padding: 16px 20px; font-size: 18px; font-weight: 700; color: #059669; text-align: right;">{amount_paid} {currency}</td></tr>
            </table>
          </td>
        </tr>
        {receipt_block}
        <tr><td style="padding-top: 20px; font-size: 13px; color: #64748b;"><a href="{billing_url}" style="color: #6366f1; text-decoration: none;">Manage subscriptions and view past invoices →</a></td></tr>
      </table>"""
    html = _wrap_subscription_email(body, billing_url)
    return _send_billing_email(to_email=to_email, subject=subject, html=html, text=text)


def send_payment_failed_email(
    *,
    to_email: str,
    amount_due: Optional[str] = None,
    billing_url: str = "https://sparefinder.org/dashboard/billing",
) -> bool:
    """
    Send when a payment fails (invoice.payment_failed). Asks user to update payment method.
    """
    subject = "Action required: SpareFinder payment could not be processed"
    amount_line = f"\nAmount due: {amount_due}" if amount_due else ""
    text = f"""Hi,

We couldn't process your payment for your SpareFinder subscription.
{amount_line}

Please update your payment method to avoid any interruption to your plan:
{billing_url}

If you have questions, contact us at support@sparefinder.org.

— SpareFinder
"""
    amount_block = f"""
        <tr>
          <td style="padding: 12px 16px; margin-top: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-size: 15px; color: #b91c1c;"><strong>Amount due:</strong> {amount_due}</td>
        </tr>""" if amount_due else ""
    body = f"""
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="text-align: center; padding-bottom: 16px;">
            <span style="display: inline-block; width: 52px; height: 52px; line-height: 52px; font-size: 24px; background: #dc2626; border-radius: 50%; color: #fff;">!</span>
          </td>
        </tr>
        <tr>
          <td>
            <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Payment could not be processed</h2>
            <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">We were unable to charge your payment method for your SpareFinder subscription. This can happen if your card has expired, funds are insufficient, or the bank declined the transaction.</p>
          </td>
        </tr>
        {amount_block}
        <tr><td height="20"></td></tr>
        <tr>
          <td style="background: #fffbeb; border-radius: 8px; padding: 16px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #92400e;">What to do next</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #78350f; line-height: 1.5;">Update your payment method to avoid any interruption. Your subscription will remain active while we retry.</p>
            <a href="{billing_url}" style="display: inline-block; padding: 12px 20px; background: #d97706; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px;">Update payment method</a>
          </td>
        </tr>
        <tr><td style="padding-top: 16px; font-size: 13px; color: #64748b;">Questions? Reply to this email or contact <a href="mailto:support@sparefinder.org" style="color: #6366f1; text-decoration: none;">support@sparefinder.org</a>.</td></tr>
      </table>"""
    html = _wrap_subscription_email(body, billing_url)
    return _send_billing_email(to_email=to_email, subject=subject, html=html, text=text)


def send_subscription_canceled_email(
    *,
    to_email: str,
    plan_name: str = "subscription",
    end_date: Optional[str] = None,
    billing_url: str = "https://sparefinder.org/dashboard/billing",
) -> bool:
    """
    Send when a subscription is canceled (customer.subscription.deleted).
    """
    subject = "Your SpareFinder subscription has ended"
    end_line = f"\nYour access ended on: {end_date}" if end_date else ""
    text = f"""Hi,

Your SpareFinder {plan_name} plan has been canceled.
{end_line}

You can resubscribe anytime from your dashboard:
{billing_url}

We're sorry to see you go. If you change your mind, we're here to help – contact support@sparefinder.org.

— SpareFinder
"""
    end_block = f"""
        <tr>
          <td style="padding: 12px 16px; margin-top: 8px; background: #f1f5f9; border-radius: 8px; font-size: 14px; color: #475569;">Access ended on: <strong>{end_date}</strong></td>
        </tr>""" if end_date else ""
    body = f"""
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="text-align: center; padding-bottom: 16px;">
            <span style="display: inline-block; width: 52px; height: 52px; line-height: 52px; font-size: 24px; background: #64748b; border-radius: 50%; color: #fff;">·</span>
          </td>
        </tr>
        <tr>
          <td>
            <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Subscription ended</h2>
            <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">Your <strong>{plan_name}</strong> plan has been canceled. You no longer have access to paid features.</p>
          </td>
        </tr>
        {end_block}
        <tr><td height="20"></td></tr>
        <tr>
          <td style="background: #f8fafc; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #334155;">Want to come back?</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569; line-height: 1.5;">You can resubscribe anytime and get back full access to AI identification, catalog storage, and more.</p>
            <a href="{billing_url}" style="display: inline-block; padding: 10px 18px; background: #6366f1; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px;">View plans & resubscribe</a>
          </td>
        </tr>
        <tr><td style="padding-top: 16px; font-size: 13px; color: #64748b;">We're sorry to see you go. Questions? <a href="mailto:support@sparefinder.org" style="color: #6366f1; text-decoration: none;">support@sparefinder.org</a></td></tr>
      </table>"""
    html = _wrap_subscription_email(body, billing_url)
    return _send_billing_email(to_email=to_email, subject=subject, html=html, text=text)


def send_subscription_renewing_soon_email(
    *,
    to_email: str,
    plan_name: str,
    renew_date: str,
    billing_url: str = "https://sparefinder.org/dashboard/billing",
) -> bool:
    """
    Send before renewal (e.g. from a cron job). Reminds user when their plan renews.
    """
    subject = f"Reminder: Your SpareFinder plan renews on {renew_date}"
    text = f"""Hi,

This is a reminder that your SpareFinder {plan_name} plan will renew on {renew_date}.

You can manage or cancel your subscription here:
{billing_url}

— SpareFinder
"""
    body = f"""
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="text-align: center; padding-bottom: 16px;">
            <span style="display: inline-block; width: 52px; height: 52px; line-height: 52px; font-size: 24px; background: #06b6d4; border-radius: 50%; color: #fff;">📅</span>
          </td>
        </tr>
        <tr>
          <td>
            <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Renewal reminder</h2>
            <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">Your <strong>{plan_name}</strong> plan will automatically renew on <strong style="color: #059669;">{renew_date}</strong>. No action is needed if you want to continue.</p>
          </td>
        </tr>
        <tr><td height="16"></td></tr>
        <tr>
          <td style="background: #ecfdf5; border-radius: 8px; padding: 16px; border-left: 4px solid #10b981;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #065f46;">Need to make changes?</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #047857; line-height: 1.5;">Update payment method, switch plans, or cancel before the renewal date from your billing page.</p>
            <a href="{billing_url}" style="display: inline-block; padding: 10px 18px; background: #10b981; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px;">Manage subscription</a>
          </td>
        </tr>
      </table>"""
    html = _wrap_subscription_email(body, billing_url)
    return _send_billing_email(to_email=to_email, subject=subject, html=html, text=text)


def send_email_with_attachment(
    to_email: str,
    subject: str,
    body: str,
    attachment_path: str
) -> bool:
    """
    Send an email with PDF attachment via Gmail SMTP.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Email body text
        attachment_path: Path to PDF file to attach
        
    Returns:
        True if successful, False otherwise
    """
    creds = _resolve_smtp_credentials()
    if not creds:
        logger.warning("⚠️ Email not configured (SMTP_USER/SMTP_PASSWORD not set) - skipping email send")
        return False
    smtp_user, smtp_password = creds
    
    # Check if attachment exists
    if not Path(attachment_path).exists():
        logger.error(f"❌ Attachment file not found: {attachment_path}")
        return False
    
    smtp_cfg = _resolve_smtp_host_port()
    if not smtp_cfg:
        return False
    smtp_host, smtp_port = smtp_cfg
    is_secure = _env_bool("SMTP_SECURE", default=(smtp_port == 465))

    from_email = (os.getenv("SMTP_FROM") or smtp_user).strip()
    # Always prefer showing a brand display-name in inboxes
    from_name = (os.getenv("SMTP_FROM_NAME") or "SpareFinder").strip()
    from_header = formataddr((str(Header(from_name, "utf-8")), from_email))
    
    try:
        # Test network connectivity first
        logger.info(f"📧 Attempting to send email to {to_email} via {smtp_host}:{smtp_port}")
        
        # Check network connectivity before attempting connection
        try:
            test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            test_socket.settimeout(5)  # 5 second timeout for connectivity test
            result = test_socket.connect_ex((smtp_host, smtp_port))
            test_socket.close()
            
            if result != 0:
                logger.warning(f"⚠️ Cannot reach {smtp_host}:{smtp_port} - network may be unreachable")
                logger.warning("⚠️ Email sending will be skipped - analysis will continue")
                return False
        except Exception as conn_test_error:
            logger.warning(f"⚠️ Network connectivity test failed: {conn_test_error}")
            logger.warning("⚠️ Email sending will be skipped - analysis will continue")
            return False
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = from_header
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add body
        msg.attach(MIMEText(body, 'plain'))
        
        # Attach PDF
        with open(attachment_path, "rb") as attachment:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment.read())
        
        encoders.encode_base64(part)
        part.add_header(
            'Content-Disposition',
            f'attachment; filename= {Path(attachment_path).name}'
        )
        msg.attach(part)
        
        # Connect to SMTP server with timeout and better error handling
        server = None
        try:
            if is_secure:
                server = smtplib.SMTP_SSL(host=smtp_host, port=smtp_port, timeout=30)
            else:
                server = smtplib.SMTP(host=smtp_host, port=smtp_port, timeout=30)  # 30 second timeout
                server._host = smtp_host  # type: ignore[attr-defined]
                server.starttls()

            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(from_email, to_email, text)
            logger.info(f"✅ Email sent successfully to {to_email}")
            return True
        finally:
            # Always close the connection
            if server:
                try:
                    server.quit()
                except:
                    try:
                        server.close()
                    except:
                        pass
        
    except socket.gaierror as e:
        # DNS resolution failure or network unreachable
        logger.error(f"❌ Network error (DNS/connection): {e}")
        logger.warning("⚠️ Email sending failed due to network issues - analysis will continue")
        return False
    except socket.timeout as e:
        # Connection timeout
        logger.error(f"❌ SMTP connection timeout: {e}")
        logger.warning("⚠️ Email sending timed out - analysis will continue")
        return False
    except ConnectionRefusedError as e:
        # Connection refused
        logger.error(f"❌ SMTP connection refused: {e}")
        logger.warning("⚠️ Email server refused connection - analysis will continue")
        return False
    except OSError as e:
        # Network unreachable or other OS-level errors
        if "Network is unreachable" in str(e) or e.errno == 101:
            logger.error(f"❌ Network is unreachable: {e}")
            logger.warning("⚠️ Email sending failed - network unreachable. Analysis will continue.")
        else:
            logger.error(f"❌ Network/OS error: {e}")
        return False
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"❌ SMTP authentication failed: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"❌ SMTP error: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error sending email: {e}")
        logger.warning("⚠️ Email sending failed - analysis will continue")
        return False


