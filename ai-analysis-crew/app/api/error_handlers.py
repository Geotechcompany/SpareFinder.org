"""Global API error capture for admin + user routes."""

from __future__ import annotations

import logging
import traceback
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from ..app_error_log import http_status_severity, schedule_log_app_error, should_log_http_status

logger = logging.getLogger(__name__)

_ERROR_LOGGED_HEADER = "X-SpareFinder-Error-Logged"


def _request_context(request: Request) -> dict[str, Any]:
    ctx: dict[str, Any] = {
        "query": str(request.url.query)[:500] if request.url.query else "",
    }
    client = request.client.host if request.client else None
    if client:
        ctx["client_ip"] = client
    return ctx


def _log_http_failure(request: Request, status_code: int, message: str, *, source: str = "api") -> None:
    if not should_log_http_status(status_code):
        return
    severity = http_status_severity(status_code) or "error"
    schedule_log_app_error(
        severity=severity,
        message=message[:5000],
        source=source,
        http_status=status_code,
        http_path=request.url.path,
        http_method=request.method,
        context=_request_context(request),
    )


def _json_error_response(
    *,
    status_code: int,
    message: str,
    detail: Any = None,
    extra: dict[str, Any] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {"success": False, "message": message}
    if detail is not None:
        body["detail"] = detail
    if extra:
        body.update(extra)
    response = JSONResponse(status_code=status_code, content=body)
    response.headers[_ERROR_LOGGED_HEADER] = "1"
    return response


def register_error_handlers(app: FastAPI) -> None:
    @app.middleware("http")
    async def capture_api_error_responses(request: Request, call_next):
        response = await call_next(request)
        if response.headers.get(_ERROR_LOGGED_HEADER):
            return response
        path = request.url.path
        if path.startswith("/api") and should_log_http_status(response.status_code):
            _log_http_failure(
                request,
                response.status_code,
                f"{request.method} {path} returned HTTP {response.status_code}",
            )
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        message = "Request validation failed"
        schedule_log_app_error(
            severity="warning",
            message=message,
            source="api",
            http_status=422,
            http_path=request.url.path,
            http_method=request.method,
            context={**_request_context(request), "errors": exc.errors()[:20]},
        )
        return _json_error_response(
            status_code=422,
            message=message,
            detail=exc.errors(),
            extra={"error": "validation_error"},
        )

    @app.exception_handler(HTTPException)
    async def fastapi_http_exception_handler(request: Request, exc: HTTPException):
        detail = exc.detail
        if isinstance(detail, dict):
            message = str(detail.get("message") or detail.get("detail") or detail)
        else:
            message = str(detail)
        _log_http_failure(request, exc.status_code, message)
        body: dict[str, Any] = {"success": False, "message": message}
        if isinstance(detail, dict):
            body.update({k: v for k, v in detail.items() if k not in body})
        else:
            body["detail"] = detail
        response = JSONResponse(status_code=exc.status_code, content=body)
        response.headers[_ERROR_LOGGED_HEADER] = "1"
        return response

    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
        message = str(exc.detail)
        _log_http_failure(request, exc.status_code, message)
        return _json_error_response(status_code=exc.status_code, message=message, detail=exc.detail)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        if isinstance(exc, (HTTPException, StarletteHTTPException)):
            raise exc
        tb = traceback.format_exc()
        logger.error("Unhandled API error on %s %s: %s", request.method, request.url.path, exc)
        schedule_log_app_error(
            severity="critical",
            message=f"Unhandled exception: {exc}",
            source="api",
            http_status=500,
            http_path=request.url.path,
            http_method=request.method,
            context={**_request_context(request), "traceback": tb[:8000]},
        )
        return _json_error_response(
            status_code=500,
            message="Internal server error",
            extra={"error": "internal_error"},
        )
