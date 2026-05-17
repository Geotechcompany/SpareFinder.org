import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { CloudSun, Moon, Sun, Sunrise, Upload, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFirstName, getTimeOfDayGreeting, type TimeOfDay } from "@/lib/greeting";
import { cn } from "@/lib/utils";

const MANUFACTURING_BG = "/welcome_banner.png";

const PERIOD_ICON: Record<TimeOfDay, React.ComponentType<{ className?: string }>> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: CloudSun,
  night: Moon,
};

export type DashboardWelcomeBannerProps = {
  fullName?: string | null;
  email?: string | null;
  onNewUpload: () => void;
  onStartTour: () => void;
  className?: string;
};

export function DashboardWelcomeBanner({
  fullName,
  email,
  onNewUpload,
  onStartTour,
  className,
}: DashboardWelcomeBannerProps) {
  const { greeting, subtitle, period } = useMemo(() => getTimeOfDayGreeting(), []);
  const firstName = getFirstName(fullName, email);
  const PeriodIcon = PERIOD_ICON[period];
  const todayLabel = format(new Date(), "EEEE, d MMMM");

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn("relative overflow-hidden rounded-2xl sm:rounded-3xl", className)}
      aria-label="Dashboard welcome"
    >
      <div className="absolute inset-0">
        <img
          src={MANUFACTURING_BG}
          alt=""
          aria-hidden
          className="h-full w-full object-cover object-center scale-105"
          loading="eager"
          decoding="async"
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-slate-950/92 via-slate-900/78 to-brand-dark/65"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/25 blur-3xl"
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden
        />
      </div>

      <motion.div className="relative z-10 flex flex-col gap-5 p-5 sm:p-6 lg:p-8">
        <motion.div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
            <PeriodIcon className="h-3.5 w-3.5 text-amber-300" aria-hidden />
            {todayLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-brand-light/25 bg-brand/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-light">
            Industrial workspace
          </span>
        </motion.div>

        <motion.div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <motion.div className="max-w-2xl space-y-2">
            <motion.p
              className="text-sm font-medium text-brand-light/90 sm:text-base"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {greeting},
            </motion.p>
            <motion.h1
              className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              {firstName}
            </motion.h1>
            <motion.p
              className="max-w-xl text-sm leading-relaxed text-white/75 sm:text-base"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {subtitle}
            </motion.p>
          </motion.div>

          <motion.div
            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Button
              type="button"
              onClick={onNewUpload}
              className="h-11 w-full rounded-xl border-0 bg-white text-sm font-semibold text-brand-dark shadow-lg shadow-black/20 hover:bg-white/95 sm:w-auto"
            >
              <Upload className="mr-2 h-4 w-4" aria-hidden />
              New Analysis
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onStartTour}
              className="h-11 w-full rounded-xl border-white/25 bg-white/10 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20 hover:text-white sm:w-auto"
            >
              <Zap className="mr-2 h-4 w-4" aria-hidden />
              Start Guided Tour
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
