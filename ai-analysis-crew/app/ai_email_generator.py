"""AI-powered email content generation for reengagement emails using OpenAI."""

import os
import logging
from typing import Dict, Optional, Any
from openai import OpenAI

logger = logging.getLogger(__name__)


class AIEmailGenerator:
    """Generate complete email content using AI (OpenAI GPT-4o)."""

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self._client = None

    def _get_client(self) -> OpenAI:
        """Get or create OpenAI client."""
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        if self._client is None:
            self._client = OpenAI(api_key=self.api_key)
        
        return self._client

    def generate_reengagement_email_content(
        self,
        user_name: str,
        hero_image_url: str,
        inline_image_url: str,
        dashboard_url: str,
        upload_url: str,
        help_url: str,
        contact_url: str,
        settings_url: str,
        logo_url: str,
        unsubscribe_url: str,
    ) -> Dict[str, str]:
        """
        Generate reengagement email content using AI, but render it into a
        consistent, centered, mobile-friendly HTML email template.
        
        Args:
            user_name: Recipient's name
            hero_image_url: URL for the hero image at the top
            inline_image_url: URL for an inline image in the content
            dashboard_url: Link to dashboard
            upload_url: Link to upload page
            help_url: Link to help page
            contact_url: Link to contact page
            settings_url: Link to settings page
            logo_url: URL for the logo
            unsubscribe_url: Unsubscribe link (required for compliance)
            
        Returns:
            Dictionary with subject, html_content, and text_content
        """
        if not self.api_key:
            logger.warning("OPENAI_API_KEY not configured, using fallback content")
            return self._get_fallback_content(
                user_name, hero_image_url, inline_image_url,
                dashboard_url, upload_url, help_url, contact_url, settings_url, logo_url, unsubscribe_url
            )

        try:
            client = self._get_client()
            
            # Ask AI for copy only (no HTML) so we can keep layout consistent and responsive.
            prompt = f"""You are an expert email marketing copywriter specializing in re-engagement emails for B2B SaaS products.

Generate compelling, personalized re-engagement EMAIL COPY (not HTML) for SpareFinder, an AI-powered industrial parts identification platform.

**User Details:**
- Name: {user_name}
- They haven't used the app in a while and need to be re-engaged

**Requirements:**
1. Create a catchy, personalized subject line (max 60 characters)
2. Provide concise, scannable copy:
   - A compelling headline (short)
   - A short intro paragraph (1–2 sentences)
   - 3–5 benefit bullet points (plain text, no emojis)
   - A short closing line (optional)
   - CTA labels for 2 buttons (primary + secondary)

**Context (for you, not to output as links):**
- Primary CTA goes to Upload page: {upload_url}
- Secondary CTA goes to Dashboard: {dashboard_url}
- Footer includes Help/Contact/Settings and Unsubscribe: {unsubscribe_url}

**Style Guidelines:**
- Professional but friendly tone
- Focus on solving their problem (identifying parts quickly)
- Use action-oriented language
- Keep paragraphs short and scannable
- Avoid gimmicks and excessive hype

**Output Format:**
Return a JSON object with:
{{
  "subject": "email subject line",
  "headline": "headline text",
  "intro": "1-2 sentence intro paragraph",
  "bullets": ["...", "...", "..."],
  "primary_cta_label": "short label (2-4 words)",
  "secondary_cta_label": "short label (2-4 words)",
  "closing": "optional short closing sentence"
}}
Only valid JSON. No markdown."""

            logger.info("Generating email content with OpenAI GPT-4o")
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert email marketing copywriter. Always respond with valid JSON only, no markdown formatting."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,  # Creative but consistent
                max_tokens=4000,
                response_format={"type": "json_object"}
            )
            
            # Parse AI response
            import json
            ai_content: Dict[str, Any] = json.loads(response.choices[0].message.content)
            
            logger.info("Email content generated successfully by AI")

            subject = (ai_content.get("subject") or f"Welcome back, {user_name}!").strip()
            headline = (ai_content.get("headline") or f"{user_name}, identify parts faster").strip()
            intro = (ai_content.get("intro") or "Upload a photo, get an instant match, and share clean results with your team.").strip()
            bullets = ai_content.get("bullets") or []
            if not isinstance(bullets, list):
                bullets = []
            bullets = [str(b).strip() for b in bullets if str(b).strip()][:5]
            if not bullets:
                bullets = [
                    "Identify unknown parts in seconds from a photo.",
                    "Save results to your history for future reuse.",
                    "Share consistent part info with your team.",
                ]

            primary_cta_label = (ai_content.get("primary_cta_label") or "Upload & Identify").strip()
            secondary_cta_label = (ai_content.get("secondary_cta_label") or "View Dashboard").strip()
            closing = (ai_content.get("closing") or "").strip()

            html_content = self._render_centered_email_html(
                user_name=user_name,
                headline=headline,
                intro=intro,
                bullets=bullets,
                closing=closing,
                primary_cta_label=primary_cta_label,
                secondary_cta_label=secondary_cta_label,
                hero_image_url=hero_image_url,
                inline_image_url=inline_image_url,
                dashboard_url=dashboard_url,
                upload_url=upload_url,
                help_url=help_url,
                contact_url=contact_url,
                settings_url=settings_url,
                logo_url=logo_url,
                unsubscribe_url=unsubscribe_url,
            )

            text_content = self._render_text_version(
                user_name=user_name,
                headline=headline,
                intro=intro,
                bullets=bullets,
                closing=closing,
                primary_cta_label=primary_cta_label,
                secondary_cta_label=secondary_cta_label,
                dashboard_url=dashboard_url,
                upload_url=upload_url,
                help_url=help_url,
                contact_url=contact_url,
                settings_url=settings_url,
                unsubscribe_url=unsubscribe_url,
            )

            return {"subject": subject, "html_content": html_content, "text_content": text_content}
            
        except Exception as e:
            logger.error(f"Failed to generate AI email content: {e}")
            import traceback
            logger.error(traceback.format_exc())
            # Fallback to template-based content
            return self._get_fallback_content(
                user_name, hero_image_url, inline_image_url,
                dashboard_url, upload_url, help_url, contact_url, settings_url, logo_url, unsubscribe_url
            )
    
    def _get_fallback_content(
        self,
        user_name: str,
        hero_image_url: str,
        inline_image_url: str,
        dashboard_url: str,
        upload_url: str,
        help_url: str,
        contact_url: str,
        settings_url: str,
        logo_url: str,
        unsubscribe_url: str,
    ) -> Dict[str, str]:
        """Fallback content if AI generation fails."""
        from datetime import datetime
        year = datetime.now().year
        
        subject = f"Welcome back, {user_name}! Your parts are waiting"
        
        html_content = f"""
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 0;">
      <tr>
        <td>
          <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(2,6,23,.10);border:1px solid rgba(2,6,23,.08);">
            <tr>
              <td style="padding:18px 28px 14px 28px;border-bottom:1px solid rgba(2,6,23,.08);">
                <img src="{logo_url}" alt="SpareFinder" style="max-height:28px;width:auto;display:block;" />
              </td>
            </tr>
            <tr>
              <td style="padding:0;">
                <img src="{hero_image_url}" alt="Industrial parts identification" style="display:block;width:100%;height:auto;max-height:260px;object-fit:cover;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;color:#0f172a;">
                  Welcome back, {user_name}!
                </h1>
                <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#64748b;">
                  We've missed you! SpareFinder makes identifying industrial parts faster and easier than ever.
                </p>
                <img src="{inline_image_url}" alt="Parts identification workflow" style="display:block;width:100%;max-width:500px;margin:20px auto;border-radius:8px;" />
                <p style="margin:20px 0;font-size:14px;line-height:1.6;color:#64748b;">
                  Upload a photo, get instant identification, and share results with your team—all in seconds.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
                  <tr>
                    <td style="padding-right:10px;">
                      <a href="{upload_url}" style="display:inline-block;text-decoration:none;padding:12px 20px;border-radius:8px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;font-weight:700;font-size:14px;">
                        Start Identifying Parts
                      </a>
                    </td>
                    <td>
                      <a href="{dashboard_url}" style="display:inline-block;text-decoration:none;padding:12px 16px;border-radius:8px;background:#ffffff;color:#1d4ed8;border:1px solid rgba(29,78,216,.35);font-weight:700;font-size:14px;">
                        View Dashboard
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px;border-top:1px solid rgba(2,6,23,.10);font-size:12px;color:#64748b;">
                <p style="margin:0 0 8px 0;">
                  Manage preferences in <a href="{settings_url}" style="color:#2563eb;text-decoration:none;">Settings</a>
                </p>
                <p style="margin:0 0 8px 0;">
                  © {year} SpareFinder. <a href="{help_url}" style="color:#2563eb;text-decoration:none;">Help</a> | <a href="{contact_url}" style="color:#2563eb;text-decoration:none;">Contact</a>
                </p>
                <p style="margin:0;font-size:11px;">
                  <a href="{unsubscribe_url}" style="color:#64748b;text-decoration:underline;">Unsubscribe from marketing emails</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""
        
        text_content = f"""Welcome back, {user_name}!

We've missed you! SpareFinder makes identifying industrial parts faster and easier than ever.

Upload a photo, get instant identification, and share results with your team—all in seconds.

Start Identifying Parts: {upload_url}
View Dashboard: {dashboard_url}

Manage preferences: {settings_url}
Help: {help_url}
Contact: {contact_url}

Unsubscribe: {unsubscribe_url}

© {year} SpareFinder. All rights reserved."""

        return {
            "subject": subject,
            "html_content": html_content,
            "text_content": text_content,
        }

    def _render_centered_email_html(
        self,
        *,
        user_name: str,
        headline: str,
        intro: str,
        bullets: list[str],
        closing: str,
        primary_cta_label: str,
        secondary_cta_label: str,
        hero_image_url: str,
        inline_image_url: str,
        dashboard_url: str,
        upload_url: str,
        help_url: str,
        contact_url: str,
        settings_url: str,
        logo_url: str,
        unsubscribe_url: str,
    ) -> str:
        # Table-based, centered, 600px max-width, mobile padding/stacking.
        # Keep content left-aligned inside the centered card.
        bullets_html = "".join([f"<li style=\"margin:0 0 8px 0;\">{b}</li>" for b in bullets])
        closing_html = f"<p style=\"margin:18px 0 0 0;font-size:14px;line-height:1.6;color:#64748b;\">{closing}</p>" if closing else ""

        return f"""<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      /* Email-safe responsive helpers */
      @media only screen and (max-width: 620px) {{
        .container {{ width: 100% !important; max-width: 100% !important; }}
        .px {{ padding-left: 16px !important; padding-right: 16px !important; }}
        .py {{ padding-top: 18px !important; padding-bottom: 18px !important; }}
        .stack td {{ display: block !important; width: 100% !important; padding-right: 0 !important; }}
        .btn {{ display: block !important; width: 100% !important; text-align: center !important; }}
        .btnwrap {{ width: 100% !important; }}
        .hero {{ max-height: none !important; }}
      }}
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(2,6,23,.10);border:1px solid rgba(2,6,23,.08);">
            <tr>
              <td class="px py" style="padding:18px 28px 14px 28px;border-bottom:1px solid rgba(2,6,23,.08);">
                <img src="{logo_url}" alt="SpareFinder" style="max-height:28px;width:auto;display:block;" />
              </td>
            </tr>
            <tr>
              <td style="padding:0;">
                <img class="hero" src="{hero_image_url}" alt="Industrial parts identification" style="display:block;width:100%;height:auto;max-height:260px;object-fit:cover;" />
              </td>
            </tr>
            <tr>
              <td class="px py" style="padding:24px 28px;">
                <h1 style="margin:0 0 10px 0;font-size:22px;line-height:1.25;color:#0f172a;">{headline}</h1>
                <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#64748b;">Hi {user_name},<br />{intro}</p>
                <img src="{inline_image_url}" alt="Parts identification workflow" style="display:block;width:100%;max-width:520px;margin:18px auto;border-radius:12px;" />
                <ul style="margin:18px 0 0 0;padding-left:18px;font-size:14px;line-height:1.6;color:#0f172a;">
                  {bullets_html}
                </ul>
                {closing_html}
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 0 0;width:100%;" class="btnwrap">
                  <tr class="stack">
                    <td style="padding-right:10px;">
                      <a class="btn" href="{upload_url}" style="display:inline-block;text-decoration:none;padding:12px 18px;border-radius:10px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;font-weight:800;font-size:14px;">
                        {primary_cta_label}
                      </a>
                    </td>
                    <td style="padding-top:0;">
                      <a class="btn" href="{dashboard_url}" style="display:inline-block;text-decoration:none;padding:12px 16px;border-radius:10px;background:#ffffff;color:#1d4ed8;border:1px solid rgba(29,78,216,.35);font-weight:800;font-size:14px;">
                        {secondary_cta_label}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="px" style="padding:14px 28px;border-top:1px solid rgba(2,6,23,.10);font-size:12px;color:#64748b;">
                <p style="margin:0 0 8px 0;">
                  Manage preferences in <a href="{settings_url}" style="color:#2563eb;text-decoration:none;">Settings</a>
                </p>
                <p style="margin:0 0 8px 0;">
                  <a href="{help_url}" style="color:#2563eb;text-decoration:none;">Help</a> ·
                  <a href="{contact_url}" style="color:#2563eb;text-decoration:none;">Contact</a>
                </p>
                <p style="margin:0;font-size:11px;">
                  <a href="{unsubscribe_url}" style="color:#64748b;text-decoration:underline;">Unsubscribe from marketing emails</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>""".strip()

    def _render_text_version(
        self,
        *,
        user_name: str,
        headline: str,
        intro: str,
        bullets: list[str],
        closing: str,
        primary_cta_label: str,
        secondary_cta_label: str,
        dashboard_url: str,
        upload_url: str,
        help_url: str,
        contact_url: str,
        settings_url: str,
        unsubscribe_url: str,
    ) -> str:
        bullet_lines = "\n".join([f"- {b}" for b in bullets])
        closing_line = f"\n\n{closing}" if closing else ""
        return (
            f"Hi {user_name},\n\n"
            f"{headline}\n\n"
            f"{intro}\n\n"
            f"{bullet_lines}"
            f"{closing_line}\n\n"
            f"{primary_cta_label}: {upload_url}\n"
            f"{secondary_cta_label}: {dashboard_url}\n\n"
            f"Help: {help_url}\n"
            f"Contact: {contact_url}\n"
            f"Settings: {settings_url}\n\n"
            f"Unsubscribe: {unsubscribe_url}"
        )


# Global instance
ai_email_generator = AIEmailGenerator()

