"""Backward-compatible re-exports; use error_notify.py instead."""

from .error_notify import notify_marketing_error, resolve_error_notify_email, send_error_notify_email

__all__ = ["notify_marketing_error", "resolve_error_notify_email", "send_error_notify_email"]
