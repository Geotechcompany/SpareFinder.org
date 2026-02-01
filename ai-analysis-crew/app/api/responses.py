"""Standard API response helpers."""

from typing import Any


def api_ok(data: Any = None, **kwargs: Any) -> dict[str, Any]:
    """Return a successful API response."""
    response = {"success": True}
    if data is not None:
        response["data"] = data
    response.update(kwargs)
    return response


def api_error(message: str, code: str | None = None, status_code: int = 400) -> dict[str, Any]:
    """Return an error API response."""
    response = {
        "success": False,
        "error": code or "error",
        "message": message
    }
    return response


