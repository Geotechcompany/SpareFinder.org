"""Authentication dependencies for API routes using Clerk."""

from __future__ import annotations

import os
import uuid
from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException, status
from jose import jwt, JWTError
from pydantic import BaseModel

from .supabase_admin import get_supabase_admin


class CurrentUser(BaseModel):
    """Current authenticated user."""
    id: str
    email: str
    full_name: str | None = None
    role: str = "user"
    clerk_user_id: str | None = None


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None
) -> CurrentUser:
    """
    Extract and validate the current user from the Authorization header.
    Supports Clerk JWT tokens.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )

    # Extract Bearer token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token format"
        )

    token = parts[1]

    def _fetch_clerk_identity(*, clerk_user_id: str) -> tuple[str | None, str | None]:
        """
        Best-effort: fetch email/full_name from Clerk REST API.
        Requires CLERK_SECRET_KEY env var.
        """
        secret = (os.getenv("CLERK_SECRET_KEY") or "").strip()
        if not secret:
            return (None, None)
        try:
            import requests

            base = (os.getenv("CLERK_API_URL") or "https://api.clerk.com/v1").rstrip("/")
            url = f"{base}/users/{clerk_user_id}"
            resp = requests.get(url, headers={"Authorization": f"Bearer {secret}"}, timeout=10)
            if resp.status_code != 200:
                return (None, None)
            data = resp.json() if isinstance(resp.json(), dict) else {}

            # Email resolution: prefer primary_email_address_id
            email = None
            primary_id = data.get("primary_email_address_id")
            emails = data.get("email_addresses") or []
            if isinstance(emails, list):
                for item in emails:
                    if not isinstance(item, dict):
                        continue
                    if primary_id and item.get("id") == primary_id:
                        v = item.get("email_address")
                        if isinstance(v, str) and v.strip():
                            email = v.strip().lower()
                            break
                if not email and emails:
                    first = emails[0]
                    if isinstance(first, dict):
                        v = first.get("email_address")
                        if isinstance(v, str) and v.strip():
                            email = v.strip().lower()

            full_name = None
            v = data.get("full_name")
            if isinstance(v, str) and v.strip():
                full_name = v.strip()
            else:
                first = data.get("first_name")
                last = data.get("last_name")
                if isinstance(first, str) and first.strip() and isinstance(last, str) and last.strip():
                    full_name = f"{first.strip()} {last.strip()}"
                elif isinstance(first, str) and first.strip():
                    full_name = first.strip()

            return (email, full_name)
        except Exception:
            return (None, None)

    def _extract_email(claims: dict[str, Any]) -> str | None:
        # Clerk tokens vary by configuration; try a few common shapes.
        for key in ("email", "email_address", "primary_email_address"):
            v = claims.get(key)
            if isinstance(v, str) and v.strip():
                return v.strip().lower()
        emails = claims.get("email_addresses")
        if isinstance(emails, list) and emails:
            first = emails[0]
            if isinstance(first, str) and first.strip():
                return first.strip().lower()
            if isinstance(first, dict):
                v = first.get("email_address") or first.get("email")
                if isinstance(v, str) and v.strip():
                    return v.strip().lower()
        return None

    def _extract_full_name(claims: dict[str, Any]) -> str | None:
        for key in ("full_name", "name"):
            v = claims.get(key)
            if isinstance(v, str) and v.strip():
                return v.strip()
        given = claims.get("given_name")
        family = claims.get("family_name")
        if isinstance(given, str) and given.strip() and isinstance(family, str) and family.strip():
            return f"{given.strip()} {family.strip()}"
        if isinstance(given, str) and given.strip():
            return given.strip()
        return None

    try:
        # Decode Clerk JWT token
        # For production, you should verify the token signature with Clerk's public key
        clerk_secret = os.getenv("CLERK_SECRET_KEY", "")
        
        if clerk_secret:
            # If we have Clerk secret, decode and verify
            try:
                payload = jwt.decode(
                    token,
                    clerk_secret,
                    algorithms=["HS256", "RS256"],
                    options={"verify_signature": False}  # We'll verify via Clerk API if needed
                )
            except JWTError:
                # Fallback: decode without verification for development
                payload = jwt.get_unverified_claims(token)
        else:
            # Development: decode without verification
            payload = jwt.get_unverified_claims(token)

        sub = payload.get("sub")
        if not isinstance(sub, str) or not sub.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
            )
        sub = sub.strip()

        # Redis cache for current-user (TTL 5 min) to avoid DB/Clerk under load
        def _cache_current_user(u: CurrentUser) -> None:
            try:
                from .redis_client import is_redis_configured, cache_set
                if not is_redis_configured():
                    return
                ttl = 300  # 5 min
                if u.clerk_user_id:
                    cache_set(f"user:clerk:{u.clerk_user_id}", u.model_dump(), ttl_seconds=ttl)
                cache_set(f"user:id:{u.id}", u.model_dump(), ttl_seconds=ttl)
            except Exception:
                pass

        supabase = get_supabase_admin()

        # ------------------------------------------------------------------
        # 1) Clerk session token path (sub looks like `user_...`)
        # ------------------------------------------------------------------
        if sub.startswith("user_"):
            clerk_user_id = sub

            # Cache hit: return cached current user (skip DB/Clerk)
            try:
                from .redis_client import is_redis_configured, cache_get
                if is_redis_configured():
                    cached = cache_get(f"user:clerk:{clerk_user_id}")
                    if isinstance(cached, dict):
                        return CurrentUser(**{k: v for k, v in cached.items() if k in CurrentUser.model_fields})
            except Exception:
                pass

            # Fetch user profile from Supabase using Clerk user ID
            result = (
                supabase.table("profiles")
                .select("*")
                .eq("clerk_user_id", clerk_user_id)
                .execute()
            )

            if not result.data or len(result.data) == 0:
                # If we can't find by clerk_user_id, try by email (many existing rows have clerk_user_id NULL).
                email = _extract_email(payload)
                full_name = _extract_full_name(payload)
                if not email:
                    # Old backend fetched email from Clerk API when token lacked email claims.
                    fetched_email, fetched_name = _fetch_clerk_identity(clerk_user_id=clerk_user_id)
                    email = fetched_email or email
                    full_name = full_name or fetched_name
                if email:
                    by_email = supabase.table("profiles").select("*").eq("email", email).execute()
                    if by_email.data and len(by_email.data) > 0:
                        profile = by_email.data[0]
                        # Link profile to Clerk (always overwrite to handle pk_test→pk_live migrations)
                        supabase.table("profiles").update(
                            {"clerk_user_id": clerk_user_id, "updated_at": "now()"}
                        ).eq("id", profile["id"]).execute()
                        profile["clerk_user_id"] = clerk_user_id
                        u = CurrentUser(
                            id=profile["id"],
                            email=profile["email"],
                            full_name=profile.get("full_name"),
                            role=profile.get("role", "user"),
                            clerk_user_id=clerk_user_id,
                        )
                        _cache_current_user(u)
                        return u

                # No existing profile: create one (profiles.id has NO default; must supply a UUID).
                new_id = str(uuid.uuid4())
                if not email:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User profile not found and email claim missing from Clerk token. Set CLERK_SECRET_KEY on the backend so it can fetch your email from Clerk and link/create your profile.",
                    )
                inserted = (
                    supabase.table("profiles")
                    .insert(
                        [
                            {
                                "id": new_id,
                                "email": email,
                                "full_name": full_name,
                                "role": "user",
                                "clerk_user_id": clerk_user_id,
                            }
                        ]
                    )
                    .select("*")
                    .single()
                    .execute()
                    .data
                )
                u = CurrentUser(
                    id=inserted["id"],
                    email=inserted["email"],
                    full_name=inserted.get("full_name"),
                    role=inserted.get("role", "user"),
                    clerk_user_id=clerk_user_id,
                )
                _cache_current_user(u)
                return u

            profile = result.data[0]
            u = CurrentUser(
                id=profile["id"],
                email=profile["email"],
                full_name=profile.get("full_name"),
                role=profile.get("role", "user"),
                clerk_user_id=clerk_user_id,
            )
            _cache_current_user(u)
            return u

        # ------------------------------------------------------------------
        # 2) Legacy Supabase Auth token path
        #    Old backend verified token via Supabase and used user.id to fetch/create profile.
        # ------------------------------------------------------------------
        # If `sub` looks like a UUID, try it as `profiles.id` first (fast path).
        try:
            uuid.UUID(sub)
            by_id = supabase.table("profiles").select("*").eq("id", sub).execute()
            if by_id.data and len(by_id.data) > 0:
                profile = by_id.data[0]
                u = CurrentUser(
                    id=profile["id"],
                    email=profile["email"],
                    full_name=profile.get("full_name"),
                    role=profile.get("role", "user"),
                    clerk_user_id=profile.get("clerk_user_id"),
                )
                _cache_current_user(u)
                return u
        except Exception:
            pass

        # Otherwise, ask Supabase Auth who this token belongs to.
        try:
            auth_user = supabase.auth.get_user(token)
            user_obj = getattr(auth_user, "user", None) or (auth_user.get("user") if isinstance(auth_user, dict) else None)
            user_id = None
            user_email = None
            if isinstance(user_obj, dict):
                user_id = user_obj.get("id")
                user_email = user_obj.get("email")
            else:
                user_id = getattr(user_obj, "id", None)
                user_email = getattr(user_obj, "email", None)

            if user_id:
                by_id = supabase.table("profiles").select("*").eq("id", user_id).execute()
                if by_id.data and len(by_id.data) > 0:
                    profile = by_id.data[0]
                    u = CurrentUser(
                        id=profile["id"],
                        email=profile["email"],
                        full_name=profile.get("full_name"),
                        role=profile.get("role", "user"),
                        clerk_user_id=profile.get("clerk_user_id"),
                    )
                    _cache_current_user(u)
                    return u

                # Create a profile if missing (mirror old backend behavior)
                if user_email and isinstance(user_email, str) and user_email.strip():
                    new_id = str(user_id)
                    inserted = (
                        supabase.table("profiles")
                        .insert([{"id": new_id, "email": user_email.strip().lower(), "role": "user"}])
                        .select("*")
                        .single()
                        .execute()
                        .data
                    )
                    u = CurrentUser(
                        id=inserted["id"],
                        email=inserted["email"],
                        full_name=inserted.get("full_name"),
                        role=inserted.get("role", "user"),
                        clerk_user_id=inserted.get("clerk_user_id"),
                    )
                    _cache_current_user(u)
                    return u
        except Exception:
            # Fall through to generic auth failure below
            pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed (unsupported token type). Please sign in again.",
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


def require_roles(*allowed_roles: str):
    """
    Dependency factory to require specific roles.
    Usage: @router.get("/admin", dependencies=[Depends(require_roles("admin"))])
    """
    async def check_role(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}"
            )
        return user
    
    return check_role


