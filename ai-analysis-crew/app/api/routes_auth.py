"""Authentication routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from .auth_dependencies import CurrentUser, get_current_user
from .responses import api_ok, api_error

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/current-user")
async def current_user(user: CurrentUser = Depends(get_current_user)):
    """
    Get the current authenticated user's profile.
    Requires a valid Clerk JWT token in the Authorization header.
    """
    return api_ok(
        data={
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "clerk_user_id": user.clerk_user_id
            }
        }
    )


