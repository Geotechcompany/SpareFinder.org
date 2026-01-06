import React from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ANNUAL_DISCOUNT_PERCENT,
  calculateAnnualPrice,
  type PlanFeature,
} from "@/lib/plans";

type BillingCycle = "monthly" | "annually";

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
  return (
    <div className="w-full">
      <div className="mt-5 select-none flex flex-col items-center justify-center gap-3 sm:gap-5">
        <div className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Choose Your Plan
        </div>
        <span className="text-center text-sm text-muted-foreground sm:text-base">
          Start with our free tier and scale as you grow. All plans include core
          AI features.
        </span>
      </div>

      <div className="mt-6 flex items-center justify-center">
        <div
          className={cn(
            "z-50 flex h-9 w-56 items-center justify-between rounded-full px-1",
            "bg-gradient-to-br from-muted via-muted/70 to-muted",
            billingCycle === "annually" &&
              "bg-gradient-to-bl from-muted via-muted/70 to-muted"
          )}
        >
          <button
            type="button"
            className={cn(
              "cursor-pointer rounded-full px-5 py-1 text-sm",
              billingCycle === "monthly" && "bg-foreground text-background"
            )}
            onClick={() => onBillingCycleChange("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={cn(
              "cursor-pointer rounded-full px-2 py-1 text-sm",
              billingCycle === "annually" && "bg-foreground text-background"
            )}
            onClick={() => onBillingCycleChange("annually")}
          >
            Annually
            <span className="ml-1 rounded-full bg-background px-1 text-xs text-foreground">
              -{ANNUAL_DISCOUNT_PERCENT}%
            </span>
          </button>
        </div>
      </div>

      <div className="mb-3 mt-8 flex flex-wrap items-stretch justify-center gap-4 px-2">
        {plans.map((plan) => {
          const price =
            billingCycle === "monthly"
              ? plan.price
              : calculateAnnualPrice(plan.price);
          const periodLabel =
            billingCycle === "annually" ? "annually" : "per month";

          // Provide a nicer CTA label consistent with existing app copy
          const cta =
            plan.id === "enterprise"
              ? "Contact Sales"
              : plan.popular
              ? "Go Professional"
              : "Get Started";

          return (
            <div
              key={plan.id}
              className={cn(
                "z-50 w-80 rounded-2xl bg-card pb-10 shadow-soft-elevated",
                plan.popular && "ring-2 ring-primary/30"
              )}
            >
              <div className="rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-foreground">{plan.name}</span>
                  {plan.popular ? (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      Most Popular
                    </span>
                  ) : null}
                </div>

                <div className="mb-2 mt-3">
                  <span className="text-3xl font-bold text-foreground">
                    £{price.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {periodLabel}
                    </span>
                  </span>
                </div>

                <span className="text-sm text-muted-foreground">
                  {plan.description}
                </span>

                <div className="mt-5">
                  <Button
                    className={cn(
                      "h-10 w-full font-semibold",
                      plan.popular || plan.id === "enterprise"
                        ? "bg-gradient-to-r from-[#3A5AFE] via-[#4C5DFF] to-[#06B6D4] text-white shadow-[0_16px_40px_rgba(15,23,42,0.35)] hover:from-[#324EDC] hover:via-[#3A5AFE] hover:to-[#0891B2] dark:from-purple-600 dark:to-blue-600 dark:hover:from-purple-700 dark:hover:to-blue-700"
                        : "bg-muted text-foreground hover:bg-muted/80 border border-border dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
                    )}
                    onClick={() => onSelectPlan(plan)}
                  >
                    {cta}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl bg-card pl-5 pr-5 pt-2">
                <span className="text-foreground">Features</span>
                <div className="mt-2 space-y-2">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


