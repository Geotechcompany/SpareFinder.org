import React, { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import {
  profileLocationWithTrialNext,
  resolveSelectedTier,
  savePendingPlan,
  trialLocationForTier,
} from "@/lib/pending-plan";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const Trial: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuth();
  const cardRefs = useRef<Partial<Record<PlanTier, HTMLDivElement | null>>>({});
  const { needsSetup, isLoading: workspaceLoading } = useWorkspace();
  const { toast } = useToast();
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [loadingMode, setLoadingMode] = useState<"trial" | "paid" | null>(null);
  const [trialUsed, setTrialUsed] = useState(false);
  const [trialUsedLoading, setTrialUsedLoading] = useState(true);
  const [routeReady, setRouteReady] = useState(false);

  const preselectedTier = React.useMemo(
    () => resolveSelectedTier(searchParams.get("plan"), null),
    [searchParams]
  );

  // Persist tier from URL so profile ↔ trial redirects stay aligned with landing selection.
  React.useEffect(() => {
    const tier = resolveSelectedTier(searchParams.get("plan"), null);
    if (!tier) return;
    savePendingPlan({
      tier,
      planName: PLAN_CONFIG[tier].name,
    });
  }, [searchParams]);

  React.useEffect(() => {
    if (!preselectedTier) return;
    const el = cardRefs.current[preselectedTier];
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [preselectedTier, trialUsedLoading, routeReady]);

  // Require profile onboarding before plan checkout (avoids profile ↔ trial redirect loop).
  React.useEffect(() => {
    if (isLoading || workspaceLoading) return;
    if (!user) {
      setRouteReady(true);
      return;
    }

    const mustCompleteProfile = needsSetup || !user.company?.trim();
    if (mustCompleteProfile) {
      const tier = resolveSelectedTier(searchParams.get("plan"), null);
      if (tier) {
        navigate(profileLocationWithTrialNext(tier), { replace: true });
      } else {
        navigate("/onboarding/profile", { replace: true });
      }
      return;
    }

    setRouteReady(true);
  }, [isLoading, workspaceLoading, user, needsSetup, navigate, searchParams]);

  // If URL is missing ?plan= but session has one, normalize the URL.
  React.useEffect(() => {
    if (!routeReady || isLoading || workspaceLoading) return;
    const urlTier = resolveSelectedTier(searchParams.get("plan"), null);
    const sessionTier = resolveSelectedTier(null, null);
    if (!urlTier && sessionTier) {
      navigate(trialLocationForTier(sessionTier), { replace: true });
    }
  }, [routeReady, isLoading, workspaceLoading, searchParams, navigate]);

  // Fetch whether user has already used a trial (one trial per account).
  React.useEffect(() => {
    let mounted = true;
    api.billing
      .getBillingInfo()
      .then((res: any) => {
        if (!mounted) return;
        const data = res?.data ?? res;
        setTrialUsed(Boolean(data?.trial_used));
      })
      .catch(() => {
        if (mounted) setTrialUsed(false);
      })
      .finally(() => {
        if (mounted) setTrialUsedLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const startCheckout = async (args: { tier: PlanTier; mode: "trial" | "paid" }) => {
    try {
      setLoadingTier(args.tier);
      setLoadingMode(args.mode);
      const selectedPlan = PLAN_CONFIG[args.tier];
      // Backend also enforces one trial; pass 0 if user already used trial.
      const trialDays =
        args.mode === "trial" && !trialUsed ? selectedPlan.trial?.days ?? 0 : 0;

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
        data?: { checkout_url?: string; trial_denied?: boolean };
        error?: string;
      };
      if (resp.success && resp.data?.checkout_url) {
        if (args.mode === "trial" && resp.data?.trial_denied) {
          setTrialUsed(true);
          toast({
            variant: "destructive",
            title: "Free trial already used",
            description:
              "Your account has already used the free trial. Subscribe without a trial to continue.",
          });
          return;
        }
        window.location.href = resp.data.checkout_url;
      } else {
        navigate("/dashboard");
      }
    } finally {
      setLoadingTier(null);
      setLoadingMode(null);
    }
  };

  if (!routeReady || isLoading || workspaceLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <p className="text-sm text-muted-foreground">Loading your plan options…</p>
      </div>
    );
  }

  const tiers: Array<{ tier: PlanTier; icon: typeof ShieldCheck; accent: string }> = [
    { tier: "free", icon: ShieldCheck, accent: "from-slate-700 to-slate-900" },
    { tier: "pro", icon: Zap, accent: "from-brand to-brand-dark" },
    { tier: "enterprise", icon: Crown, accent: "from-emerald-600 to-green-600" },
  ];

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 p-4 sm:p-6">
      <div className="relative w-full max-w-6xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-r from-brand/20 to-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/10 blur-3xl" />

        <Card className="relative w-full border-border bg-card/90 backdrop-blur-xl shadow-soft-elevated">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand/5 via-transparent to-blue-500/5 dark:from-brand/10 dark:to-blue-500/10" />

          <CardHeader className="relative text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-brand to-brand-dark">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl text-foreground">Choose your plan</CardTitle>
          <CardDescription className="text-muted-foreground">
            Select a plan to start your free trial (where available) or continue with a paid subscription.
          </CardDescription>
          {preselectedTier ? (
            <div className="mx-auto mt-4 max-w-lg rounded-xl border border-brand/25 bg-brand/10 px-4 py-3 text-sm text-foreground">
              You chose{" "}
              <span className="font-semibold text-brand dark:text-brand-light">
                {PLAN_CONFIG[preselectedTier].name}
              </span>{" "}
              on the pricing page — activate it below to continue.
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {tiers.map(({ tier, icon: Icon, accent }) => {
              const plan = PLAN_CONFIG[tier];
              const hasTrial = (plan.trial?.days ?? 0) > 0;
              const isLoading = loadingTier === tier;
              const isTrialLoading = isLoading && loadingMode === "trial";
              const isPaidLoading = isLoading && loadingMode === "paid";

              const isPreselected = preselectedTier === tier;

              return (
                <div
                  key={tier}
                  ref={(el) => {
                    cardRefs.current[tier] = el;
                  }}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border bg-background/70 p-5 backdrop-blur-xl shadow-sm transition-shadow dark:bg-white/5",
                    isPreselected
                      ? "border-brand/50 ring-2 ring-brand/30 shadow-lg shadow-brand/15"
                      : "border-border"
                  )}
                >
                  <div className="pointer-events-none absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-r from-brand/10 to-blue-500/10 blur-2xl" />
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
                            <Badge className="bg-brand/15 text-brand-dark border-brand/30 dark:bg-brand/20 dark:text-brand-light">
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
                      trialUsed ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
                          Trial already used. Subscribe below to get started.
                        </div>
                      ) : (
                        <Button
                          onClick={() => startCheckout({ tier, mode: "trial" })}
                          disabled={loadingTier !== null || trialUsedLoading}
                          className="h-11 w-full bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark shadow-lg shadow-brand/20"
                        >
                          {isTrialLoading
                            ? "Redirecting…"
                            : `Start ${plan.trial?.days}-day Free Trial`}
                        </Button>
                      )
                    ) : tier === "enterprise" ? (
                      <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                        Enterprise plans are provisioned with a custom agreement. Contact our sales team to get started.
                      </div>
                    ) : null}

                    {tier === "enterprise" ? (
                      <Button
                        onClick={() => navigate("/contact")}
                        className="h-11 w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                      >
                        Contact Sales
                      </Button>
                    ) : (
                      <Button
                        onClick={() => startCheckout({ tier, mode: "paid" })}
                        variant="secondary"
                        disabled={loadingTier !== null}
                        className="h-11 w-full"
                      >
                        {isPaidLoading ? "Redirecting…" : trialUsed && hasTrial ? "Subscribe now" : "Continue without trial"}
                      </Button>
                    )}
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
