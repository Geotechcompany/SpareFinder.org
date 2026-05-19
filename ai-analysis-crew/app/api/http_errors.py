"""Shared HTTP errors for API routes."""

from __future__ import annotations

from fastapi import HTTPException, status

from .supabase_resilience import is_transient_http_error


def raise_service_unavailable(exc: BaseException | None = None) -> None:
    """Raise 503 so clients retry instead of treating auth as invalid."""
    detail = "Service temporarily unavailable. Please try again in a moment."
    if exc is not None and is_transient_http_error(exc):
        detail = "Database connection interrupted. Please try again shortly."
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=detail,
        headers={"Retry-After": "3"},
    )
