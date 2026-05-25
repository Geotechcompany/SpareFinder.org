import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Check,
  Crown,
  Layers,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ANNUAL_DISCOUNT_PERCENT,
  calculateAnnualPrice,
  formatGBP,
  type PlanFeature,
} from "@/lib/plans";

type BillingCycle = "monthly" | "annually";

const PLAN_ICONS: Record<string, typeof Shield> = {
  starter: Shield,
  professional: Zap,
  enterprise: Building2,
};

function planIcon(plan: PlanFeature) {
  return PLAN_ICONS[plan.id] ?? plan.icon ?? Shield;
}

export function PricingSection({
  plans,
  billingCycle,
  onBillingCycleChange,
  onSelectPlan,
}: {
  plans: PlanFeature[];
  billingCycle: BillingCycle;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  onSelectPlan: (plan: PlanFeature) => void;
}) {
  const ordered = [...plans].sort((a, b) => {
    const order = { starter: 0, professional: 1, enterprise: 2 };
    return (order[a.id as keyof typeof order] ?? 1) - (order[b.id as keyof typeof order] ?? 1);
  });

  return (
    <div className="relative w-full">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[min(100%,720px)] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand/20 via-violet-500/15 to-cyan-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand dark:text-brand-light"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Transparent pricing
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          Choose the plan built for your{" "}
          <span className="bg-gradient-to-r from-brand via-violet-600 to-cyan-500 bg-clip-text text-transparent">
            spare parts workflow
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          Sign up free, then continue with the plan you pick — workspaces, teams, and
          regional supplier intelligence included at every tier.
        </motion.p>
      </div>

      {/* Billing toggle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15 }}
        className="relative mt-10 flex justify-center"
      >
        <div
          className={cn(
            "relative flex h-11 items-center rounded-full border border-border/80 bg-card/80 p-1 shadow-lg shadow-black/5 backdrop-blur-xl",
            "ring-1 ring-black/[0.04] dark:ring-white/10"
          )}
        >
          {(["monthly", "annually"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => onBillingCycleChange(cycle)}
              className={cn(
                "relative z-10 rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                billingCycle === cycle
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {billingCycle === cycle ? (
                <motion.span
                  layoutId="billing-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-brand to-brand-dark shadow-md shadow-brand/30"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ) : null}
              <span className="relative flex items-center gap-1.5">
                {cycle === "monthly" ? "Monthly" : "Annual"}
                {cycle === "annually" ? (
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    −{ANNUAL_DISCOUNT_PERCENT}%
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Cards */}
      <div className="relative mt-12 lg:mt-16">
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3 lg:gap-5 xl:gap-8">
          {ordered.map((plan, index) => {
            const Icon = planIcon(plan);
            const isPopular = Boolean(plan.popular);
            const isEnterprise = plan.id === "enterprise";
            const monthlyPrice = plan.price;
            const displayPrice =
              billingCycle === "monthly"
                ? monthlyPrice
                : calculateAnnualPrice(monthlyPrice);
            const periodLabel =
              billingCycle === "annually" ? "per year" : "per month";
            const cta =
              isEnterprise
                ? "Contact Sales"
                : plan.trial?.days
                ? `Start ${plan.trial.days}-day trial`
                : "Get started";

            return (
              <motion.article
                key={plan.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ y: isPopular ? -6 : -4 }}
                className={cn(
                  "relative flex flex-col",
                  isPopular && "lg:z-10 lg:-mt-4 lg:mb-4"
                )}
              >
                {isPopular ? (
                  <div className="absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-brand/30 bg-gradient-to-r from-brand to-brand-dark px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/35">
                    <Crown className="h-3.5 w-3.5" />
                    Most popular
                  </div>
                ) : null}

                <div
                  className={cn(
                    "relative flex h-full flex-col overflow-hidden rounded-3xl border backdrop-blur-xl transition-shadow duration-300",
                    isPopular
                      ? "border-brand/40 bg-gradient-to-b from-card via-card to-brand/[0.06] shadow-2xl shadow-brand/20 ring-2 ring-brand/25"
                      : "border-border/70 bg-card/90 shadow-xl shadow-black/[0.06] ring-1 ring-black/[0.03] hover:shadow-2xl dark:ring-white/[0.06]",
                    isEnterprise &&
                      !isPopular &&
                      "border-emerald-500/25 bg-gradient-to-b from-card to-emerald-500/[0.04]"
                  )}
                >
                  {/* Card shine */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20"
                    aria-hidden
                  />

                  <div className="flex flex-1 flex-col p-6 sm:p-7 lg:p-8">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg",
                          plan.color,
                          isPopular && "shadow-brand/30"
                        )}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      {plan.trial?.days && !isEnterprise ? (
                        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          {plan.trial.days}-day trial
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground">
                      {plan.name}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {plan.description}
                    </p>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight text-foreground sm:text-[2.5rem]">
                        {formatGBP(displayPrice, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {periodLabel}
                      </span>
                    </div>
                    {billingCycle === "annually" && !isEnterprise ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatGBP(monthlyPrice)}/mo billed annually
                      </p>
                    ) : null}

                    <Button
                      size="lg"
                      className={cn(
                        "mt-6 h-12 w-full rounded-xl text-base font-semibold transition-all",
                        isPopular || isEnterprise
                          ? "group bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40"
                          : "border border-border bg-background/80 text-foreground hover:border-brand/30 hover:bg-brand/5"
                      )}
                      onClick={() => onSelectPlan(plan)}
                    >
                      {cta}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>

                    <div className="mt-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Layers className="h-3.5 w-3.5" />
                      What&apos;s included
                    </div>

                    <ul className="mt-4 flex-1 space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm">
                          <span
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                              isPopular
                                ? "bg-brand/15 text-brand dark:text-brand-light"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                          <span className="leading-snug text-foreground/90">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-10 text-center text-sm text-muted-foreground"
      >
        Create your account first — we&apos;ll bring you back to activate the plan you selected.
      </motion.p>
    </div>
  );
}
