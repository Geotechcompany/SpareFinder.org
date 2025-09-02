import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Crown,
  Zap,
  Shield,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface Subscription {
  id: string;
  tier: "free" | "pro" | "enterprise";
  status: "active" | "canceled" | "past_due" | "unpaid";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

interface Usage {
  current_period: {
    searches: number;
    api_calls: number;
    storage_used: number;
  };
  limits: {
    searches: number;
    api_calls: number;
    storage: number;
  };
}

interface BillingData {
  subscription: Subscription;
  usage: Usage;
  invoices: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    invoice_url: string;
  }>;
}

const PLAN_FEATURES = {
  free: {
    name: "Starter / Basic",
    price: 12.99,
    currency: "GBP",
    color: "from-gray-600 to-gray-700",
    icon: Shield,
    features: [
      "20 image recognitions per month",
      "Basic search & match results",
      "Access via web portal only",
    ],
  },
  pro: {
    name: "Professional / Business",
    price: 69.99,
    currency: "GBP",
    color: "from-blue-600 to-cyan-600",
    icon: Zap,
    features: [
      "500 recognitions per month",
      "Catalogue storage (part lists, drawings)",
      "API access for ERP/CMMS",
      "Analytics dashboard",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 460,
    currency: "GBP",
    color: "from-purple-600 to-pink-600",
    icon: Crown,
    features: [
      "Unlimited recognition",
      "Advanced AI customisation",
      "ERP/CMMS full integration",
      "Predictive demand analytics",
      "Dedicated support & SLA",
    ],
  },
};

export const SubscriptionManager: React.FC = () => {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<
    Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      created_at: string;
      invoice_url?: string;
    }>
  >([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchBillingData();
  }, [user]);

  const fetchBillingData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await api.billing.getBillingInfo();

      if (response.success && response.data) {
        setBillingData(response.data);

        // Use invoices returned by the billing endpoint
        const preloaded = (response.data as any).invoices as any[] | undefined;
        if (Array.isArray(preloaded)) {
          const normalized = preloaded.map((inv: any) => ({
            id: inv.id,
            amount: Number(inv.amount ?? inv.total ?? 0),
            currency: String(inv.currency || "GBP").toUpperCase(),
            status: inv.status || "paid",
            created_at:
              inv.created_at || inv.created || new Date().toISOString(),
            invoice_url: inv.invoice_url || inv.hosted_invoice_url || "",
          }));
          setInvoices(normalized);
        } else {
          setInvoices([]);
        }
      } else {
        toast.error("Failed to fetch billing details");
      }
    } catch (error) {
      console.error("Billing fetch error:", error);
      toast.error("Failed to fetch billing details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgradeSubscription = async (
    tier: "free" | "pro" | "enterprise"
  ) => {
    if (!user) {
      toast.error("Please log in to manage subscription");
      return;
    }

    setIsUpdating(tier);
    try {
      // Starter (free tier label) -> Stripe checkout with 30-day trial @ £15
      if (tier === "free") {
        const plan = PLAN_FEATURES["free"];
        const checkoutData = {
          plan: plan.name,
          amount: 15,
          currency: "gbp",
          billing_cycle: "monthly",
          trial_days: 30,
          success_url: `${window.location.origin}/dashboard/billing?payment_success=true&tier=starter`,
          cancel_url: `${window.location.origin}/dashboard/billing?payment_cancelled=true`,
        };
        const checkoutResponse = await api.billing.createCheckoutSession(
          checkoutData
        );
        if (checkoutResponse.success && checkoutResponse.data?.checkout_url) {
          window.location.href = checkoutResponse.data.checkout_url;
        } else {
          toast.error("Failed to start Starter trial.");
        }
        return;
      }

      // For paid tiers, create Stripe checkout session
      const plan = PLAN_FEATURES[tier];
      const checkoutData = {
        plan: plan.name,
        amount: plan.price,
        currency: plan.currency.toLowerCase(),
        billing_cycle: "monthly",
        success_url: `${window.location.origin}/dashboard/billing?payment_success=true&tier=${tier}`,
        cancel_url: `${window.location.origin}/dashboard/billing?payment_cancelled=true`,
      };

      const checkoutResponse = await api.billing.createCheckoutSession(
        checkoutData
      );

      if (checkoutResponse.success && checkoutResponse.data?.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = checkoutResponse.data.checkout_url;
      } else {
        toast.error(
          "Failed to create checkout session. Please check if Stripe is configured."
        );
      }
    } catch (error) {
      console.error("Subscription update error:", error);
      toast.error("Failed to process subscription change");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) {
      toast.error("Please log in to cancel subscription");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period."
      )
    ) {
      return;
    }

    try {
      const response = await api.billing.cancelSubscription();

      if (response.success) {
        await fetchBillingData(); // Refresh data
        toast.success(
          "Subscription will be canceled at the end of the current period"
        );
      } else {
        toast.error("Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Subscription cancellation error:", error);
      toast.error("Failed to cancel subscription");
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getUsagePercentage = (used: number, limit: number): number => {
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 100;
    return Math.min((used / limit) * 100, 100);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "past_due":
        return "bg-yellow-500";
      case "canceled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleBuyCredits = async (credits: number) => {
    try {
      if (!user) {
        toast.error("Please log in to purchase credits");
        return;
      }
      if (!Number.isFinite(credits) || credits <= 0) {
        toast.error("Enter a valid credits amount");
        return;
      }
      const resp = await api.billing.createCreditsCheckoutSession({
        credits,
        success_url: `${window.location.origin}/dashboard/billing?payment_success=true`,
        cancel_url: `${window.location.origin}/dashboard/billing?payment_cancelled=true`,
      });
      if (resp.success && (resp.data as any)?.checkout_url) {
        window.location.href = (resp.data as any).checkout_url as string;
      } else {
        toast.error("Failed to start credits checkout");
      }
    } catch (e) {
      console.error("Buy credits error:", e);
      toast.error("Unable to create checkout for credits");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Subscription Details
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading subscription information...
        </CardContent>
      </Card>
    );
  }

  if (!billingData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Subscription Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Unable to load subscription information. Please try refreshing the
            page.
          </p>
          <Button onClick={fetchBillingData}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const subscription = billingData.subscription;
  const usage = billingData.usage;
  const currentPlan = PLAN_FEATURES[subscription.tier];

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-lg bg-gradient-to-r ${currentPlan.color} flex items-center justify-center`}
              >
                <currentPlan.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{currentPlan.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      subscription.status === "active"
                        ? "default"
                        : "destructive"
                    }
                    className={
                      subscription.status === "active"
                        ? getStatusColor(subscription.status)
                        : ""
                    }
                  >
                    {subscription.status}
                  </Badge>
                  {subscription.cancel_at_period_end && (
                    <Badge
                      variant="outline"
                      className="text-yellow-600 border-yellow-600"
                    >
                      Canceling
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {currentPlan.price === 0 ? "Free" : `£${currentPlan.price}`}
                {currentPlan.price > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {subscription.status === "active" && (
                  <span>
                    Renews{" "}
                    {new Date(
                      subscription.current_period_end
                    ).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Usage Statistics */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Current Usage
            </h4>

            {/* Searches */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Part Searches</span>
                <span>
                  {usage.current_period.searches} /{" "}
                  {usage.limits.searches === -1 ? "∞" : usage.limits.searches}
                </span>
              </div>
              <Progress
                value={getUsagePercentage(
                  usage.current_period.searches,
                  usage.limits.searches
                )}
                className="h-2"
              />
            </div>

            {/* API Calls */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>API Calls</span>
                <span>
                  {usage.current_period.api_calls} /{" "}
                  {usage.limits.api_calls === -1 ? "∞" : usage.limits.api_calls}
                </span>
              </div>
              <Progress
                value={getUsagePercentage(
                  usage.current_period.api_calls,
                  usage.limits.api_calls
                )}
                className="h-2"
              />
            </div>

            {/* Storage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Storage Used</span>
                <span>
                  {formatBytes(usage.current_period.storage_used)} /{" "}
                  {usage.limits.storage === -1
                    ? "∞"
                    : formatBytes(usage.limits.storage)}
                </span>
              </div>
              <Progress
                value={getUsagePercentage(
                  usage.current_period.storage_used,
                  usage.limits.storage
                )}
                className="h-2"
              />
            </div>
          </div>

          <Separator className="my-6" />

          {/* Action Buttons */}
          <div className="flex gap-3">
            {subscription.tier === "free" && (
              <>
                <Button
                  onClick={() => handleUpgradeSubscription("pro")}
                  disabled={!!isUpdating}
                  className="flex-1"
                >
                  {isUpdating === "pro" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Processing...
                    </>
                  ) : (
                    <>Upgrade to Pro</>
                  )}
                </Button>
                <Button
                  onClick={() => handleUpgradeSubscription("enterprise")}
                  disabled={!!isUpdating}
                  variant="outline"
                  className="flex-1"
                >
                  {isUpdating === "enterprise" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Processing...
                    </>
                  ) : (
                    <>Enterprise</>
                  )}
                </Button>
              </>
            )}

            {subscription.tier === "pro" && (
              <>
                <Button
                  onClick={() => handleUpgradeSubscription("enterprise")}
                  disabled={!!isUpdating}
                  className="flex-1"
                >
                  {isUpdating === "enterprise" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Processing...
                    </>
                  ) : (
                    <>Upgrade to Enterprise</>
                  )}
                </Button>
                <Button
                  onClick={() => handleUpgradeSubscription("free")}
                  disabled={!!isUpdating}
                  variant="outline"
                >
                  {isUpdating === "free" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Processing...
                    </>
                  ) : (
                    <>Downgrade to Free</>
                  )}
                </Button>
                {!subscription.cancel_at_period_end && (
                  <Button
                    onClick={handleCancelSubscription}
                    variant="destructive"
                  >
                    Cancel
                  </Button>
                )}
              </>
            )}

            {subscription.tier === "enterprise" && (
              <>
                <Button
                  onClick={() => handleUpgradeSubscription("pro")}
                  disabled={!!isUpdating}
                  variant="outline"
                >
                  {isUpdating === "pro" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Processing...
                    </>
                  ) : (
                    <>Downgrade to Pro</>
                  )}
                </Button>
                <Button
                  onClick={() => handleUpgradeSubscription("free")}
                  disabled={!!isUpdating}
                  variant="outline"
                >
                  {isUpdating === "free" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Processing...
                    </>
                  ) : (
                    <>Downgrade to Free</>
                  )}
                </Button>
                {!subscription.cancel_at_period_end && (
                  <Button
                    onClick={handleCancelSubscription}
                    variant="destructive"
                  >
                    Cancel
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(PLAN_FEATURES).map(([tier, plan]) => {
              const isCurrent = subscription.tier === tier;
              return (
                <div
                  key={tier}
                  className={`p-6 rounded-lg border-2 ${
                    isCurrent ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-r ${plan.color} flex items-center justify-center`}
                    >
                      <plan.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <p className="text-2xl font-bold">
                        {plan.price === 0 ? "Free" : `£${plan.price}`}
                        {plan.price > 0 && (
                          <span className="text-sm font-normal text-muted-foreground">
                            /month
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {subscription.tier !== tier ? (
                    <Button
                      onClick={() =>
                        handleUpgradeSubscription(
                          tier as "free" | "pro" | "enterprise"
                        )
                      }
                      disabled={!!isUpdating}
                      variant={tier === "free" ? "outline" : "default"}
                      className="w-full"
                    >
                      {isUpdating === tier ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                          Processing...
                        </>
                      ) : (
                        <>Select {plan.name}</>
                      )}
                    </Button>
                  ) : (
                    <Button disabled className="w-full">
                      Current Plan
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pay-as-you-go Credits */}
      <Card>
        <CardHeader>
          <CardTitle>Pay-as-you-go Credits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="text-sm text-muted-foreground">
              Purchase additional recognitions anytime at £0.70 per credit.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleBuyCredits(10)}>
                Buy 10 (£7.00)
              </Button>
              <Button variant="outline" onClick={() => handleBuyCredits(50)}>
                Buy 50 (£35.00)
              </Button>
              <Button onClick={() => handleBuyCredits(100)}>
                Buy 100 (£70.00)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">Invoice #{inv.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={inv.status === "paid" ? "default" : "secondary"}
                    >
                      {inv.status}
                    </Badge>
                    <span className="font-medium">
                      {inv.currency} {inv.amount}
                    </span>
                    {inv.invoice_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={inv.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionManager;
