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


