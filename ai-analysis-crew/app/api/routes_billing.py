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
from ..email_sender import (
    send_payment_failed_email,
    send_purchase_confirmation_email,
    send_receipt_email,
    send_subscription_canceled_email,
    send_subscription_renewing_soon_email,
)

router = APIRouter(prefix="/billing", tags=["billing"])

# Subscription limits configuration (strict: features per plan only)
SUBSCRIPTION_LIMITS = {
    "free": {
        "searches": 20,
        "api_calls": 0,
        "storage": 1024,  # MB
        "priority_support": False,
        "custom_branding": False,
    },
    "starter": {
        "searches": 20,
        "api_calls": 0,
        "storage": 1024,
        "priority_support": False,
        "custom_branding": False,
    },
    "pro": {
        "searches": 500,
        "api_calls": 5000,
        "storage": 25 * 1024,  # MB
        "priority_support": True,
        "custom_branding": False,
    },
    "enterprise": {
        "searches": -1,  # Unlimited
        "api_calls": -1,
        "storage": -1,
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
            # Recurring subscription – attach tier to subscription via subscription_data so webhooks get correct tier
            interval_map = {
                "monthly": "month",
                "annually": "year",
                "yearly": "year",
            }
            interval = interval_map.get(billing_cycle_lower, "month")
            tier = _plan_to_tier(payload.plan)

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
                    "tier": tier,
                    "billing_cycle": payload.billing_cycle,
                    "payment_type": "subscription",
                },
                subscription_data={
                    "metadata": {
                        "user_id": user.id,
                        "plan": payload.plan,
                        "tier": tier,
                    },
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

    supabase = get_supabase_admin()

    if event.type == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = (session.get("metadata") or {}).get("user_id")
        plan = (session.get("metadata") or {}).get("plan")
        if not user_id:
            print("⚠️ checkout.session.completed: missing metadata.user_id")
            return api_ok(data={"received": True})
        if not plan:
            print("⚠️ successfully paid with Stripe but no plan was given in session metadata")
        tier = _plan_to_tier(plan or "")
        now = datetime.utcnow()
        period_end = datetime(now.year, now.month, now.day) + timedelta(days=30)
        payload = {
            "user_id": user_id,
            "tier": tier,
            "status": "active",
            "stripe_customer_id": session.get("customer") or "",
            "stripe_subscription_id": session.get("subscription") or "",
            "current_period_start": now.isoformat(),
            "current_period_end": period_end.isoformat(),
            "cancel_at_period_end": False,
        }
        try:
            existing = (
                supabase.table("subscriptions")
                .select("id")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            if existing.data and len(existing.data) > 0:
                row_id = existing.data[0]["id"]
                supabase.table("subscriptions").update(payload).eq("id", row_id).execute()
            else:
                supabase.table("subscriptions").insert(payload).execute()
            print(f"✅ Subscription updated for user {user_id}, tier={tier} (plan={plan})")
            # Send purchase confirmation email (modern SaaS)
            customer_email = (
                session.get("customer_email")
                or (session.get("customer_details") or {}).get("email")
                or ""
            ).strip()
            if customer_email:
                amount_total = session.get("amount_total")
                amount_paid_str = None
                if amount_total is not None and isinstance(amount_total, (int, float)):
                    amount_paid_str = f"£{amount_total / 100:.2f}"
                try:
                    send_purchase_confirmation_email(
                        to_email=customer_email,
                        plan_name=plan or tier,
                        amount_paid=amount_paid_str,
                        is_subscription=bool(session.get("subscription")),
                    )
                except Exception as mail_err:
                    print(f"⚠️ Purchase confirmation email failed: {mail_err}")
        except Exception as e:
            print(f"❌ Failed to update subscription: {e}")
        return api_ok(data={"received": True})

    if event.type == "invoice.payment_succeeded":
        invoice = event["data"]["object"]
        customer_id = invoice.get("customer")
        subscription_id = invoice.get("subscription")
        if not customer_id and not subscription_id:
            return api_ok(data={"received": True})
        try:
            plan = None
            tier_from_sub = None
            period_start = datetime.utcnow()
            period_end = period_start + timedelta(days=30)
            if subscription_id:
                sub = stripe.Subscription.retrieve(subscription_id)
                meta = (sub.metadata or {}) if hasattr(sub, "metadata") else (sub.get("metadata") or {})
                plan = meta.get("plan")
                tier_from_sub = meta.get("tier")
                if not plan:
                    plan = (sub.get("metadata") or {}).get("plan")
                if sub.current_period_start:
                    period_start = datetime.utcfromtimestamp(sub.current_period_start)
                if sub.current_period_end:
                    period_end = datetime.utcfromtimestamp(sub.current_period_end)
                if not plan and sub.get("items") and sub["items"].get("data"):
                    first_item = sub["items"]["data"][0]
                    price = first_item.get("price") or {}
                    plan = price.get("nickname") or ""
                    if not plan and isinstance(price.get("product"), str):
                        try:
                            plan = getattr(stripe.Product.retrieve(price["product"]), "name", "") or ""
                        except Exception:
                            pass
            existing = None
            if customer_id:
                r = supabase.table("subscriptions").select("id", "user_id").eq("stripe_customer_id", customer_id).limit(1).execute()
                if r.data and len(r.data) > 0:
                    existing = r.data[0]
            if not existing and subscription_id:
                r = supabase.table("subscriptions").select("id", "user_id").eq("stripe_subscription_id", subscription_id).limit(1).execute()
                if r.data and len(r.data) > 0:
                    existing = r.data[0]
            if not existing:
                print("⚠️ invoice.payment_succeeded: no subscription row for customer/subscription, cannot set plan")
                return api_ok(data={"received": True})
            row_id = existing["id"]
            user_id = existing["user_id"]
            tier = (tier_from_sub and tier_from_sub.strip().lower() in ("free", "pro", "enterprise")) and tier_from_sub.strip().lower() or _plan_to_tier(plan or "")
            payload = {
                "status": "active",
                "stripe_customer_id": customer_id or existing.get("stripe_customer_id") or "",
                "stripe_subscription_id": subscription_id or "",
                "current_period_start": period_start.isoformat(),
                "current_period_end": period_end.isoformat(),
                "cancel_at_period_end": False,
                "tier": tier,
            }
            supabase.table("subscriptions").update(payload).eq("id", row_id).execute()
            print(f"✅ Subscription updated from invoice.payment_succeeded for user {user_id}, tier={tier} (plan={plan})")
            # Send receipt email (modern SaaS)
            customer_email = (invoice.get("customer_email") or "").strip()
            if not customer_email and customer_id:
                try:
                    cust = stripe.Customer.retrieve(customer_id)
                    customer_email = (getattr(cust, "email", None) or (cust.get("email") if isinstance(cust, dict) else None) or "").strip()
                except Exception:
                    pass
            if customer_email:
                amount_cents = invoice.get("amount_paid") or invoice.get("amount_due") or 0
                amount_paid_str = f"{amount_cents / 100:.2f}"
                currency = (invoice.get("currency") or "gbp").upper()
                receipt_url = invoice.get("hosted_invoice_url") or invoice.get("invoice_pdf") or None
                try:
                    send_receipt_email(
                        to_email=customer_email,
                        plan_name=plan or tier,
                        amount_paid=amount_paid_str,
                        currency=currency,
                        receipt_url=receipt_url,
                    )
                except Exception as mail_err:
                    print(f"⚠️ Receipt email failed: {mail_err}")
        except Exception as e:
            print(f"❌ invoice.payment_succeeded handler error: {e}")
        return api_ok(data={"received": True})

    if event.type == "invoice.payment_failed":
        invoice = event["data"]["object"]
        customer_id = invoice.get("customer")
        customer_email = (invoice.get("customer_email") or "").strip()
        if not customer_email and customer_id:
            try:
                cust = stripe.Customer.retrieve(customer_id)
                customer_email = (getattr(cust, "email", None) or (cust.get("email") if isinstance(cust, dict) else None) or "").strip()
            except Exception:
                pass
        if customer_email:
            amount_cents = invoice.get("amount_due") or invoice.get("amount_paid") or 0
            amount_due_str = f"£{amount_cents / 100:.2f}" if amount_cents else None
            try:
                send_payment_failed_email(to_email=customer_email, amount_due=amount_due_str)
            except Exception as mail_err:
                print(f"⚠️ Payment failed email error: {mail_err}")
        return api_ok(data={"received": True})

    if event.type == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")
        plan_name = "subscription"
        try:
            sub_plan = (subscription.get("metadata") or {}).get("plan") or ""
            if sub_plan:
                plan_name = sub_plan
            elif subscription.get("items") and subscription["items"].get("data"):
                first = subscription["items"]["data"][0]
                price = (first.get("price") or {})
                plan_name = price.get("nickname") or plan_name
        except Exception:
            pass
        end_ts = subscription.get("canceled_at") or subscription.get("ended_at")
        end_date = None
        if end_ts:
            end_date = datetime.utcfromtimestamp(end_ts).strftime("%Y-%m-%d")
        customer_email = ""
        if customer_id:
            try:
                cust = stripe.Customer.retrieve(customer_id)
                customer_email = (getattr(cust, "email", None) or (cust.get("email") if isinstance(cust, dict) else None) or "").strip()
            except Exception:
                pass
        if customer_email:
            try:
                send_subscription_canceled_email(to_email=customer_email, plan_name=plan_name, end_date=end_date)
            except Exception as mail_err:
                print(f"⚠️ Subscription canceled email error: {mail_err}")
        # Update our DB: set status canceled / inactive
        try:
            r = supabase.table("subscriptions").select("id").eq("stripe_subscription_id", subscription.get("id")).limit(1).execute()
            if r.data and len(r.data) > 0:
                supabase.table("subscriptions").update({"status": "canceled"}).eq("id", r.data[0]["id"]).execute()
        except Exception as e:
            print(f"⚠️ Failed to update subscription status on delete: {e}")
        return api_ok(data={"received": True})

    return api_ok(data={"received": True})


@router.get("/cron/renewal-reminders")
async def cron_renewal_reminders():
    """
    Public cron endpoint: send renewal reminder emails for subscriptions
    whose current_period_end is 3–7 days from now. Call daily (e.g. cron-job.org).
    """
    now = datetime.utcnow()
    start = now + timedelta(days=3)
    end = now + timedelta(days=7)
    start_iso = start.strftime("%Y-%m-%d")
    end_iso = end.strftime("%Y-%m-%dT23:59:59.999Z")
    supabase = get_supabase_admin()
    sent = 0
    errors = 0
    try:
        rows = (
            supabase.table("subscriptions")
            .select("id, user_id, tier, current_period_end, stripe_customer_id")
            .eq("status", "active")
            .gte("current_period_end", start_iso)
            .lte("current_period_end", end_iso)
            .execute()
        )
        subs = rows.data or []
    except Exception as e:
        print(f"❌ Cron renewal-reminders query error: {e}")
        return api_error("Failed to fetch subscriptions", status_code=500)
    for sub in subs:
        user_id = sub.get("user_id")
        period_end = sub.get("current_period_end")
        tier = sub.get("tier") or sub.get("plan_type") or "subscription"
        try:
            renew_date = datetime.fromisoformat(period_end.replace("Z", "+00:00")).strftime("%Y-%m-%d") if period_end else ""
        except Exception:
            renew_date = period_end or ""
        email = None
        if user_id:
            try:
                pr = supabase.table("profiles").select("email").eq("id", user_id).limit(1).execute()
                if pr.data and len(pr.data) > 0 and (pr.data[0].get("email") or "").strip():
                    email = (pr.data[0]["email"] or "").strip()
            except Exception:
                pass
        if not email and sub.get("stripe_customer_id"):
            try:
                cust = stripe.Customer.retrieve(sub["stripe_customer_id"])
                email = (getattr(cust, "email", None) or (cust.get("email") if isinstance(cust, dict) else None) or "").strip()
            except Exception:
                pass
        if not email:
            errors += 1
            continue
        try:
            ok = send_subscription_renewing_soon_email(
                to_email=email,
                plan_name=tier,
                renew_date=renew_date,
            )
            if ok:
                sent += 1
            else:
                errors += 1
        except Exception as e:
            print(f"⚠️ Renewal reminder email failed for {email}: {e}")
            errors += 1
    return api_ok(
        data={
            "sent": sent,
            "errors": errors,
            "total_eligible": len(subs),
            "message": f"Renewal reminders: {sent} sent, {errors} errors.",
        }
    )
