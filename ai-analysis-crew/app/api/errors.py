"""API error classes."""

from fastapi import HTTPException


class ApiError(HTTPException):
    """Custom API error exception."""
    
    def __init__(self, status_code: int, message: str, code: str | None = None):
        super().__init__(
            status_code=status_code,
            detail={"message": message, "code": code or "error"}
        )


