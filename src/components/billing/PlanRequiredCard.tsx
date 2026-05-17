import React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  CreditCard,
  History,
  LockKeyhole,
  Sparkles,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const UNLOCK_FEATURES = [
  { icon: Upload, label: "AI part uploads", accent: "from-brand to-brand-light" },
  { icon: History, label: "Search history", accent: "from-sky-500 to-cyan-400" },
  { icon: BarChart3, label: "Analytics", accent: "from-emerald-500 to-teal-400" },
  { icon: Clock3, label: "Priority processing", accent: "from-amber-500 to-orange-400" },
] as const;

export const PlanRequiredCard: React.FC<{
  title?: string;
  description?: string;
  className?: string;
}> = ({
  title = "No active plan",
  description = "Choose a plan to unlock uploads, history, reviews, and analytics across your workspace.",
  className,
}) => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const handleSelectPlan = () => {
    const needsOnboarding =
      !isLoading && user && (!user.company || user.company.trim().length === 0);
    navigate(
      needsOnboarding
        ? `/onboarding/profile?next=${encodeURIComponent("/dashboard/billing")}`
        : "/onboarding/trial"
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex min-h-[min(70dvh,640px)] items-center justify-center px-4 py-10 sm:py-14",
        className
      )}
    >
      <motion.div
        className="relative w-full max-w-xl"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05, duration: 0.45 }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-brand/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl"
          aria-hidden
        />

        <article
          className={cn(
            "group relative overflow-hidden rounded-2xl border border-border/50",
            "bg-card/85 shadow-sm backdrop-blur-xl",
            "transition-shadow duration-300 hover:shadow-md",
            "dark:border-white/10 dark:bg-card/60"
          )}
        >
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-brand-light to-sky-400"
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/15 blur-2xl"
            aria-hidden
          />

          <div className="relative px-6 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-5">
                <div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-brand/30 to-sky-400/20 blur-xl"
                  aria-hidden
                />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg shadow-brand/25 ring-1 ring-white/20">
                  <Sparkles className="h-7 w-7" aria-hidden />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-amber-500/15 text-amber-700 ring-2 ring-card dark:text-amber-200">
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
                </div>
              </div>

              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                <LockKeyhole className="h-3 w-3" aria-hidden />
                Workspace locked
              </span>

              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {title}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {description}
              </p>
            </div>

            <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3">
              {UNLOCK_FEATURES.map(({ icon: Icon, label, accent }, index) => (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + index * 0.05, duration: 0.35 }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5",
                    "text-left text-xs font-medium text-foreground sm:text-sm",
                    "dark:border-white/10 dark:bg-white/[0.04]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                      accent
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="leading-snug">{label}</span>
                </motion.li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={handleSelectPlan}
                className="h-11 w-full bg-gradient-to-r from-brand to-brand-dark shadow-md shadow-brand/20 hover:from-brand-dark hover:to-brand-dark sm:w-auto sm:min-w-[180px]"
              >
                Select a plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/dashboard/billing")}
                className="h-11 w-full border-border/80 bg-background/60 backdrop-blur-sm sm:w-auto sm:min-w-[160px]"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Go to Billing
              </Button>
            </div>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              You can browse account settings, but core features stay locked until a plan is
              active. Plans start from{" "}
              <span className="font-medium text-foreground">£12.99/month</span> with a free
              trial for new accounts.
            </p>
          </div>
        </article>
      </motion.div>
    </motion.div>
  );
};
