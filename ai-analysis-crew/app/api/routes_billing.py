"""Billing and subscription routes."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
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
    import os

    publishable_key = os.getenv("STRIPE_PUBLISHABLE_KEY") or os.getenv("STRIPE_PUBLIC_KEY")

    if not publishable_key:
        return api_ok(data={"configured": False, "publishableKey": None})

    return api_ok(data={"configured": True, "publishableKey": publishable_key})


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
    import os
    import stripe

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
