/** Stripe success redirect — session_id is replaced by Stripe after checkout completes. */
export function buildCheckoutSuccessUrl(tier: string): string {
  const normalizedTier = tier === "free" ? "starter" : tier;
  const params = new URLSearchParams({
    payment_success: "true",
    tier: normalizedTier,
    session_id: "{CHECKOUT_SESSION_ID}",
  });
  return `${window.location.origin}/dashboard/billing?${params.toString()}`;
}

export const CHECKOUT_CANCEL_URL = `${window.location.origin}/dashboard/billing?payment_cancelled=true`;
