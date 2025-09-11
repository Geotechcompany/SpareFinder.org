from typing import Any, Dict, List, Optional
import os


def _esc(value: Any) -> str:
    try:
        return str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    except Exception:
        return ""


def analysis_started_subject(filename: str) -> str:
    return f"SpareFinder AI – Analysis started ({_esc(filename)})"


def analysis_started_html(filename: str, keywords: Optional[List[str]] = None) -> str:
    keys = ", ".join(keywords or [])
    frontend = os.getenv("FRONTEND_URL", "https://app.sparefinder.org").rstrip("/")
    history_url = f"{frontend}/dashboard/history"
    return f"""
<html>
  <body style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#0b1026; color:#e5e7eb; padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #1f2937;">
        <h2 style="margin:0;color:#c4b5fd;">SpareFinder AI</h2>
        <p style="margin:4px 0 0;color:#9ca3af;">Your part analysis has started.</p>
      </div>
      <div style="padding:20px 24px;">
        <p style="margin:0 0 12px;">Filename: <strong>{_esc(filename)}</strong></p>
        {f'<p style="margin:0 0 12px;">Keywords: <strong>{_esc(keys)}</strong></p>' if keys else ''}
        <p style="margin:12px 0 0;color:#9ca3af;">You will receive another email once the analysis completes.</p>
        <div style="margin-top:18px;">
          <a href="{history_url}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Open Dashboard</a>
        </div>
      </div>
    </div>
  </body>
 </html>
"""


def analysis_completed_subject(result: Dict[str, Any]) -> str:
    name = result.get("precise_part_name") or result.get("class_name") or "Part"
    return f"SpareFinder AI – Analysis completed: {_esc(name)}"


def analysis_completed_html(result: Dict[str, Any]) -> str:
    name = result.get("precise_part_name") or result.get("class_name") or "Part"
    cls = result.get("class_name") or "Unknown"
    conf = f"{round(float(result.get('confidence_score', 0)) * 100)}%" if isinstance(result.get("confidence_score"), (int, float)) else str(result.get("confidence_score", "N/A"))
    processing_time = result.get("processing_time_seconds") or result.get("processing_time") or "N/A"
    frontend = os.getenv("FRONTEND_URL", "https://app.sparefinder.org").rstrip("/")
    history_url = f"{frontend}/dashboard/history"
    return f"""
<html>
  <body style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#0b1026; color:#e5e7eb; padding:24px;">
    <div style="max-width:680px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #1f2937;">
        <h2 style="margin:0;color:#c4b5fd;">Analysis Complete</h2>
        <p style="margin:4px 0 0;color:#9ca3af;">Your part identification results are ready.</p>
      </div>
      <div style="padding:20px 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#9ca3af;">Predicted Name</td>
            <td style="padding:8px 0;"><strong>{_esc(name)}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#9ca3af;">Class</td>
            <td style="padding:8px 0;">{_esc(cls)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#9ca3af;">Confidence</td>
            <td style="padding:8px 0;">{_esc(conf)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#9ca3af;">Processing Time</td>
            <td style="padding:8px 0;">{_esc(processing_time)}s</td>
          </tr>
        </table>
        <div style="margin-top:18px;">
          <a href="{history_url}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">📊 View Results</a>
        </div>
      </div>
    </div>
  </body>
 </html>
"""


# -------------------------------------------------------------
# Additional modern templates (supplier enrichment and failures)
# -------------------------------------------------------------

def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "https://app.sparefinder.org").rstrip("/")


def _history_link(label: str = "📊 View Results", color: str = "#10b981") -> str:
    url = f"{_frontend_url()}/dashboard/history"
    return (
        f"<div style=\"margin-top:18px;\">"
        f"<a href=\"{url}\" style=\"display:inline-block;background:{color};color:#fff;"
        f"text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;\">{label}</a>"
        f"</div>"
    )


def supplier_enrichment_started_subject(name: Optional[str]) -> str:
    part = (name or "Part").strip() or "Part"
    return f"SpareFinder AI – Retrieving supplier info for {_esc(part)}"


def supplier_enrichment_started_html(name: Optional[str]) -> str:
    part = (name or "Part").strip() or "Part"
    return f"""
<html>
  <body style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#0b1026; color:#e5e7eb; padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #1f2937;">
        <h2 style="margin:0;color:#c4b5fd;">Supplier Intelligence</h2>
        <p style="margin:4px 0 0;color:#9ca3af;">We're scanning official sites and directories for contact details.</p>
      </div>
      <div style="padding:20px 24px;">
        <p style="margin:0 0 12px;">Part: <strong>{_esc(part)}</strong></p>
        <p style="margin:12px 0 0;color:#9ca3af;">You'll receive another email once supplier info is available.</p>
        {_history_link("Open Dashboard", "#3b82f6")}
      </div>
    </div>
  </body>
</html>
"""


def supplier_enrichment_completed_subject(name: Optional[str], count: int) -> str:
    part = (name or "Part").strip() or "Part"
    return f"SpareFinder AI – Supplier info ready for {_esc(part)} ({count} found)"


def supplier_enrichment_completed_html(name: Optional[str], suppliers: List[Dict[str, Any]]) -> str:
    part = (name or "Part").strip() or "Part"
    count = len(suppliers or [])
    # Build a compact list (top 5)
    items: List[str] = []
    for s in (suppliers or [])[:5]:
        title = _esc(s.get("company_name") or s.get("title") or s.get("name") or "Supplier")
        link = _esc(s.get("url") or s.get("product_page_url") or s.get("website") or "")
        region = _esc(s.get("shipping_region") or s.get("region") or "")
        items.append(
            f"<li style=\"margin:6px 0;\"><strong>{title}</strong>"
            + (f" &nbsp;•&nbsp; <a href=\"{link}\" style=\"color:#60a5fa;text-decoration:none;\">{link}</a>" if link else "")
            + (f" &nbsp;•&nbsp; {region}" if region else "")
            + "</li>"
        )
    html_list = "".join(items) or "<li style=\"margin:6px 0;\">Suppliers listed in the dashboard</li>"
    return f"""
<html>
  <body style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#0b1026; color:#e5e7eb; padding:24px;">
    <div style="max-width:680px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #1f2937;">
        <h2 style="margin:0;color:#c4b5fd;">Supplier Info Retrieved</h2>
        <p style="margin:4px 0 0;color:#9ca3af;">Top matches for your part are listed below.</p>
      </div>
      <div style="padding:20px 24px;">
        <p style="margin:0 0 8px;">Part: <strong>{_esc(part)}</strong></p>
        <p style="margin:0 0 12px;color:#9ca3af;">Total suppliers found: <strong>{count}</strong></p>
        <ul style="padding-left:18px;list-style:disc;color:#e5e7eb;">{html_list}</ul>
        {_history_link()}
      </div>
    </div>
  </body>
</html>
"""


def supplier_enrichment_failed_subject(name: Optional[str]) -> str:
    part = (name or "Part").strip() or "Part"
    return f"SpareFinder AI – Supplier info unavailable for {_esc(part)}"


def supplier_enrichment_failed_html(name: Optional[str], error: str) -> str:
    part = (name or "Part").strip() or "Part"
    return f"""
<html>
  <body style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#0b1026; color:#e5e7eb; padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #1f2937;">
        <h2 style="margin:0;color:#fca5a5;">Supplier Info Not Available</h2>
      </div>
      <div style="padding:20px 24px;">
        <p style="margin:0 0 8px;">Part: <strong>{_esc(part)}</strong></p>
        <p style="margin:8px 0 0;color:#9ca3af;">Reason: {_esc(error)}</p>
        {_history_link("Open Dashboard", "#3b82f6")}
      </div>
    </div>
  </body>
</html>
"""


def analysis_failed_subject(filename: str) -> str:
    return f"SpareFinder AI – Analysis failed ({_esc(filename)})"


def analysis_failed_html(filename: str, error: str) -> str:
    return f"""
<html>
  <body style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#0b1026; color:#e5e7eb; padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #1f2937;">
        <h2 style="margin:0;color:#fca5a5;">Analysis Failed</h2>
        <p style="margin:4px 0 0;color:#9ca3af;">We could not complete your analysis.</p>
      </div>
      <div style="padding:20px 24px;">
        <p style="margin:0 0 8px;">Filename: <strong>{_esc(filename)}</strong></p>
        <p style="margin:8px 0 0;color:#9ca3af;">Reason: {_esc(error)}</p>
      </div>
    </div>
  </body>
 </html>
"""


def keyword_started_subject(keywords: List[str]) -> str:
    keys = ", ".join(keywords)
    return f"SpareFinder AI – Keyword search started ({_esc(keys)})"


def keyword_started_html(keywords: List[str]) -> str:
    keys = ", ".join(keywords)
    frontend = os.getenv("FRONTEND_URL", "https://app.sparefinder.org").rstrip("/")
    history_url = f"{frontend}/dashboard/history"
    return f"""
<html>
  <body style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#0b1026; color:#e5e7eb; padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #1f2937;">
        <h2 style="margin:0;color:#c4b5fd;">Keyword Search Started</h2>
        <p style="margin:4px 0 0;color:#9ca3af;">We are searching using your keywords.</p>
      </div>
      <div style="padding:20px 24px;">
        <p style="margin:0;">Keywords: <strong>{_esc(keys)}</strong></p>
        <div style="margin-top:18px;">
          <a href="{history_url}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Open Dashboard</a>
        </div>
      </div>
    </div>
  </body>
 </html>
"""


def keyword_completed_subject(keywords: List[str], count: int) -> str:
    keys = ", ".join(keywords)
    return f"SpareFinder AI – Keyword search completed ({_esc(keys)}) – {count} result(s)"


def keyword_completed_html(keywords: List[str], count: int) -> str:
    keys = ", ".join(keywords)
    frontend = os.getenv("FRONTEND_URL", "https://app.sparefinder.org").rstrip("/")
    history_url = f"{frontend}/dashboard/history"
    return f"""
<html>
  <body style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#0b1026; color:#e5e7eb; padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #1f2937;">
        <h2 style="margin:0;color:#c4b5fd;">Keyword Search Complete</h2>
      </div>
      <div style="padding:20px 24px;">
        <p style="margin:0 0 8px;">Keywords: <strong>{_esc(keys)}</strong></p>
        <p style="margin:8px 0 0;color:#9ca3af;">Total results: <strong>{count}</strong></p>
        <div style="margin-top:18px;">
          <a href="{history_url}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">📊 View Results</a>
        </div>
      </div>
    </div>
  </body>
 </html>
"""


