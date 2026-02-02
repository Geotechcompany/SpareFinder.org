"""Billing and subscription routes."""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any

import stripe
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from .auth_dependencies import CurrentUser, get_current_user
from .responses import api_error, api_ok
from .supabase_admin import get_supabase_admin

router = APIRouter(prefix="/billing", tags=["billing"])

# Subscription limits configuration
SUBSCRIPTION_LIMITS = {
    "free": {
        "searches": 5,
        "api_calls": 50,
        "storage": 100,  # MB
        "priority_support": False,
        "custom_branding": False,
    },
    "pro": {
        "searches": 100,
        "api_calls": 1000,
        "storage": 1000,  # MB
        "priority_support": True,
        "custom_branding": False,
    },
    "enterprise": {
        "searches": -1,  # Unlimited
        "api_calls": -1,  # Unlimited
        "storage": -1,  # Unlimited
        "priority_support": True,
        "custom_branding": True,
    },
}

# Plan pricing
PLAN_PRICING = {
    "free": {"amount": 12.99, "currency": "gbp"},
    "pro": {"amount": 69.99, "currency": "gbp"},
    "enterprise": {"amount": 460, "currency": "gbp"},
}


@router.get("", name="get_billing_info")
@router.get("/", name="get_billing_info_slash")  # Also handle trailing slash
async def get_billing_info(user: CurrentUser = Depends(get_current_user)):
    """
    Get billing information for the current user.
    Returns subscription details, usage, and invoices.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Get subscription info
        sub_result = supabase.table("subscriptions").select("*").eq("user_id", user_id).execute()

        subscription = None
        if sub_result.data and len(sub_result.data) > 0:
            subscription = sub_result.data[0]

        # Get current usage
        now = datetime.now()
        current_month = now.month
        current_year = now.year

        usage_result = (
            supabase.table("usage_tracking")
            .select("*")
            .eq("user_id", user_id)
            .eq("month", current_month)
            .eq("year", current_year)
            .execute()
        )

        usage = None
        if usage_result.data and len(usage_result.data) > 0:
            usage = usage_result.data[0]

        # Default inactive subscription
        inactive_subscription = {
            "id": "inactive",
            "tier": "free",
            "status": "inactive",
            "current_period_start": now.isoformat(),
            "current_period_end": now.isoformat(),
            "cancel_at_period_end": False,
        }

        user_subscription = subscription or inactive_subscription

        # Admins have enterprise-equivalent access
        if user.role in ("admin", "super_admin"):
            user_subscription = {
                **user_subscription,
                "tier": "enterprise",
                "status": "active",
            }

        # Usage data
        user_usage = usage or {
            "searches_count": 0,
            "api_calls_count": 0,
            "storage_used": 0,
        }

        # Get limits based on tier
        tier = user_subscription.get("tier", "free")
        limits = SUBSCRIPTION_LIMITS.get(tier, SUBSCRIPTION_LIMITS["free"])

        if user.role in ("admin", "super_admin"):
            limits = SUBSCRIPTION_LIMITS["enterprise"]

        # Mock invoices (in production, fetch from Stripe)
        invoices = []
        if user_subscription["status"] != "inactive":
            tier_pricing = PLAN_PRICING.get(tier, PLAN_PRICING["free"])
            invoices = [
                {
                    "id": "inv_001",
                    "amount": tier_pricing["amount"],
                    "currency": tier_pricing["currency"].upper(),
                    "status": "paid",
                    "created_at": now.isoformat(),
                    "invoice_url": "#",
                }
            ]

        return api_ok(
            data={
                "subscription": user_subscription,
                "usage": {
                    "current_period": {
                        "searches": user_usage.get("searches_count", 0),
                        "api_calls": user_usage.get("api_calls_count", 0),
                        "storage_used": user_usage.get("storage_used", 0),
                    },
                    "limits": limits,
                },
                "invoices": invoices,
            }
        )

    except Exception as e:
        print(f"❌ Error fetching billing info: {e}")
        return api_error("Failed to fetch billing information", status_code=500)


@router.get("/config")
async def get_billing_config():
    """
    Get Stripe configuration (publishable key).
    Public endpoint - no authentication required.
    """
    publishable_key = os.getenv("STRIPE_PUBLISHABLE_KEY") or os.getenv("STRIPE_PUBLIC_KEY")

    if not publishable_key:
        return api_ok(data={"configured": False, "publishableKey": None})

    return api_ok(data={"configured": True, "publishableKey": publishable_key})


@router.get("/invoices")
async def get_invoices(
    user: CurrentUser = Depends(get_current_user),
    page: int = 1,
    limit: int = 10,
):
    """
    Get invoices for the current user.
    Tries DB first, then Stripe if configured.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id
        offset = (page - 1) * limit

        # Try stored invoices from DB first
        try:
            inv_result = (
                supabase.table("invoices")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            if inv_result.data and len(inv_result.data) > 0:
                return api_ok(
                    data={
                        "invoices": inv_result.data,
                        "pagination": {"page": page, "limit": limit, "total": len(inv_result.data)},
                    }
                )
        except Exception:
            pass

        # Fallback: fetch from Stripe if we have a subscription with stripe_customer_id
        stripe_secret = os.getenv("STRIPE_SECRET_KEY") or os.getenv("STRIPE_API_KEY")
        if stripe_secret:
            stripe.api_key = stripe_secret
            sub_result = (
                supabase.table("subscriptions")
                .select("stripe_customer_id")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            customer_id = None
            if sub_result.data and len(sub_result.data) > 0:
                customer_id = (sub_result.data[0] or {}).get("stripe_customer_id")
            if customer_id:
                try:
                    invs = stripe.Invoice.list(customer=customer_id, limit=limit)
                    if invs and invs.data:
                        mapped = [
                            {
                                "id": inv.id,
                                "amount": (inv.amount_paid or inv.amount_due or 0) / 100,
                                "currency": (inv.currency or "gbp").upper(),
                                "status": inv.status or "open",
                                "created_at": datetime.utcfromtimestamp(inv.created).isoformat() + "Z" if inv.created else None,
                                "invoice_url": inv.hosted_invoice_url or inv.invoice_pdf,
                            }
                            for inv in invs.data
                        ]
                        return api_ok(
                            data={
                                "invoices": mapped,
                                "pagination": {"page": page, "limit": limit, "total": len(mapped)},
                            }
                        )
                except stripe.error.StripeError:
                    pass

        return api_ok(
            data={
                "invoices": [],
                "pagination": {"page": page, "limit": limit, "total": 0},
            }
        )
    except Exception as e:
        print(f"❌ Error fetching invoices: {e}")
        return api_error("Failed to fetch invoices", status_code=500)


class CheckoutSessionRequest(BaseModel):
    plan: str
    amount: float
    currency: str = "GBP"
    billing_cycle: str = "monthly"
    success_url: str
    cancel_url: str


@router.post("/checkout-session")
async def create_checkout_session(
    payload: CheckoutSessionRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Create a Stripe checkout session for subscription payment.
    Requires authentication.
    """
    try:
        stripe_secret_key = os.getenv("STRIPE_SECRET_KEY") or os.getenv("STRIPE_API_KEY")
        
        if not stripe_secret_key:
            return api_error(
                "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.",
                status_code=500
            )

        stripe.api_key = stripe_secret_key

        # Calculate price in pence/cents (Stripe uses smallest currency unit)
        amount_in_cents = int(payload.amount * 100)

        # Determine if this is a one-time payment or subscription
        billing_cycle_lower = payload.billing_cycle.lower()
        is_one_time = "3_months" in billing_cycle_lower or "one_time" in billing_cycle_lower
        
        if is_one_time:
            # One-time payment for 3-month access
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": payload.currency.lower(),
                            "product_data": {
                                "name": payload.plan,
                                "description": f"One-time payment for {payload.billing_cycle} access",
                            },
                            "unit_amount": amount_in_cents,
                        },
                        "quantity": 1,
                    }
                ],
                mode="payment",
                success_url=payload.success_url,
                cancel_url=payload.cancel_url,
                customer_email=user.email,
                metadata={
                    "user_id": user.id,
                    "plan": payload.plan,
                    "billing_cycle": payload.billing_cycle,
                    "payment_type": "one_time",
                },
            )
        else:
            # Recurring subscription
            interval_map = {
                "monthly": "month",
                "annually": "year",
                "yearly": "year",
            }
            interval = interval_map.get(billing_cycle_lower, "month")
            
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": payload.currency.lower(),
                            "product_data": {
                                "name": payload.plan,
                                "description": f"Subscription for {payload.billing_cycle}",
                            },
                            "unit_amount": amount_in_cents,
                            "recurring": {
                                "interval": interval,
                            },
                        },
                        "quantity": 1,
                    }
                ],
                mode="subscription",
                success_url=payload.success_url,
                cancel_url=payload.cancel_url,
                customer_email=user.email,
                metadata={
                    "user_id": user.id,
                    "plan": payload.plan,
                    "billing_cycle": payload.billing_cycle,
                    "payment_type": "subscription",
                },
            )

        return api_ok(
            data={
                "checkout_url": checkout_session.url,
                "session_id": checkout_session.id,
            }
        )

    except stripe.error.StripeError as e:
        print(f"❌ Stripe error creating checkout session: {e}")
        return api_error(
            f"Payment processing error: {str(e)}",
            status_code=400
        )
    except Exception as e:
        print(f"❌ Error creating checkout session: {e}")
        return api_error(
            "Failed to create checkout session",
            status_code=500
        )


def _plan_to_tier(plan: str) -> str:
    """Map Stripe metadata plan name to subscription tier."""
    if not plan:
        return "free"
    normalized = plan.lower()
    if "pro" in normalized or "professional" in normalized or "business" in normalized:
        return "pro"
    if "enterprise" in normalized:
        return "enterprise"
    if "starter" in normalized or "basic" in normalized:
        return "free"
    return "pro" if "pro" in normalized else "free"


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe webhook: on checkout.session.completed, update subscriptions with plan from metadata.
    Configure this URL in Stripe Dashboard (e.g. https://your-api/api/billing/webhook).
    """
    stripe_secret = os.getenv("STRIPE_SECRET_KEY") or os.getenv("STRIPE_API_KEY")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET") or os.getenv("STRIPE_WEBHOOK_SIGNING_SECRET")
    if not stripe_secret:
        return api_error("Stripe not configured", status_code=500)
    if not webhook_secret:
        print("⚠️ STRIPE_WEBHOOK_SECRET not set; webhook signature verification skipped")
    body = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(body, sig, webhook_secret)
        else:
            import json
            event = stripe.Event.construct_from(json.loads(body.decode("utf-8")), stripe.api_key)
    except ValueError as e:
        print(f"❌ Webhook body decode error: {e}")
        return api_error("Invalid payload", status_code=400)
    except stripe.error.SignatureVerificationError as e:
        print(f"❌ Webhook signature error: {e}")
        return api_error("Invalid signature", status_code=400)
    if event.type != "checkout.session.completed":
        return api_ok(data={"received": True})
    session = event["data"]["object"]
    user_id = (session.get("metadata") or {}).get("user_id")
    plan = (session.get("metadata") or {}).get("plan")
    if not user_id:
        print("⚠️ checkout.session.completed: missing metadata.user_id")
        return api_ok(data={"received": True})
    if not plan:
        print("⚠️ successfully paid with Stripe but no plan was given in session metadata")
    tier = _plan_to_tier(plan or "")
    supabase = get_supabase_admin()
    now = datetime.utcnow()
    period_end = datetime(now.year, now.month, now.day) + timedelta(days=30)
    try:
        supabase.table("subscriptions").upsert(
            {
                "user_id": user_id,
                "tier": tier,
                "status": "active",
                "stripe_customer_id": session.get("customer") or "",
                "stripe_subscription_id": session.get("subscription") or "",
                "current_period_start": now.isoformat(),
                "current_period_end": period_end.isoformat(),
                "cancel_at_period_end": False,
            },
            on_conflict="user_id",
        ).execute()
        print(f"✅ Subscription updated for user {user_id}, tier={tier} (plan={plan})")
    except Exception as e:
        print(f"❌ Failed to update subscription: {e}")
    return api_ok(data={"received": True})
