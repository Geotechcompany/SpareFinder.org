import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Shield, CheckCircle2, Crown, Zap, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { PLAN_CONFIG, type PlanTier, isUnlimited } from "@/lib/plans";
import { useAuth } from "@/contexts/AuthContext";

const Trial: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [loadingMode, setLoadingMode] = useState<"trial" | "paid" | null>(null);

  // Enforce post-signup onboarding before plan selection.
  React.useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (!user.company || user.company.trim().length === 0) {
      navigate(`/onboarding/profile?next=${encodeURIComponent("/onboarding/trial")}`, {
        replace: true,
      });
    }
  }, [isLoading, user, navigate]);

  const startCheckout = async (args: { tier: PlanTier; mode: "trial" | "paid" }) => {
    try {
      setLoadingTier(args.tier);
      setLoadingMode(args.mode);
      const selectedPlan = PLAN_CONFIG[args.tier];
      const trialDays = args.mode === "trial" ? selectedPlan.trial?.days ?? 0 : 0;

      const resp = (await api.billing.createCheckoutSession({
        plan: selectedPlan.name,
        amount: selectedPlan.price,
        currency: selectedPlan.currency.toUpperCase(),
        billing_cycle: "monthly",
        trial_days: trialDays,
        success_url: `${window.location.origin}/dashboard/billing?payment_success=true&tier=${args.tier}`,
        cancel_url: `${window.location.origin}/onboarding/trial?payment_cancelled=true`,
      })) as {
        success: boolean;
        data?: { checkout_url?: string };
        error?: string;
      };
      if (resp.success && resp.data?.checkout_url) {
        window.location.href = resp.data.checkout_url;
      } else {
        navigate("/dashboard");
      }
    } finally {
      setLoadingTier(null);
      setLoadingMode(null);
    }
  };

  const tiers: Array<{ tier: PlanTier; icon: typeof ShieldCheck; accent: string }> = [
    { tier: "free", icon: ShieldCheck, accent: "from-slate-700 to-slate-900" },
    { tier: "pro", icon: Zap, accent: "from-purple-600 to-blue-600" },
    { tier: "enterprise", icon: Crown, accent: "from-emerald-600 to-green-600" },
  ];

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 p-4 sm:p-6">
      <div className="relative w-full max-w-6xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/10 blur-3xl" />

        <Card className="relative w-full border-border bg-card/90 backdrop-blur-xl shadow-soft-elevated">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5 dark:from-purple-500/10 dark:to-blue-500/10" />

          <CardHeader className="relative text-center space-y-3">
          <Button
            type="button"
            variant="ghost"
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            onClick={() => navigate("/dashboard")}
          >
            Skip for now
          </Button>
          <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl text-foreground">Choose your plan</CardTitle>
          <CardDescription className="text-muted-foreground">
            Select a plan to start your free trial (where available) or continue with a paid subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {tiers.map(({ tier, icon: Icon, accent }) => {
              const plan = PLAN_CONFIG[tier];
              const hasTrial = (plan.trial?.days ?? 0) > 0;
              const isLoading = loadingTier === tier;
              const isTrialLoading = isLoading && loadingMode === "trial";
              const isPaidLoading = isLoading && loadingMode === "paid";

              return (
                <div
                  key={tier}
                  className="relative overflow-hidden rounded-2xl border border-border bg-background/70 p-5 backdrop-blur-xl shadow-sm dark:bg-white/5"
                >
                  <div className="pointer-events-none absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 blur-2xl" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r ${accent}`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                          {tier === "pro" ? (
                            <Badge className="bg-purple-600/15 text-purple-700 border-purple-500/30 dark:bg-purple-600/20 dark:text-purple-200">
                              Popular
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground">
                        £{plan.price}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isUnlimited(plan.limits.searches)
                          ? "Unlimited analyses"
                          : `${plan.limits.searches} analyses/month`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {plan.features.slice(0, 5).map((f) => (
                      <div key={f} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-3">
                    {hasTrial ? (
                      <Button
                        onClick={() => startCheckout({ tier, mode: "trial" })}
                        disabled={loadingTier !== null}
                        className="h-11 w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20"
                      >
                        {isTrialLoading
                          ? "Redirecting…"
                          : `Start ${plan.trial?.days}-day Free Trial`}
                      </Button>
                    ) : (
                      <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                        Enterprise plans are provisioned with a custom agreement.
                      </div>
                    )}

                    <Button
                      onClick={() => startCheckout({ tier, mode: "paid" })}
                      variant="secondary"
                      disabled={loadingTier !== null}
                      className="h-11 w-full"
                    >
                      {isPaidLoading ? "Redirecting…" : "Continue without trial"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            No credits will be granted until checkout completes successfully.
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Trial;
