import { useEffect, useId, useState } from "react";
import {
  animate,
  motion,
  useReducedMotion,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AdminKpiAnimationKind = "integer" | "percent1" | "currencyGBP";

function formatAnimatedValue(kind: AdminKpiAnimationKind, n: number): string {
  switch (kind) {
    case "integer":
      return Math.round(n).toLocaleString();
    case "percent1":
      return `${n.toFixed(1)}%`;
    case "currencyGBP":
      return `£${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
  }
}

/** Decorative spark paths (not real data) — Synaptix-style accent */
const SPARK_PATHS = [
  "M0 14 C8 4 14 18 22 9 S36 15 44 7 S52 13 60 10",
  "M0 10 Q15 20 28 8 T52 14 L60 11",
  "M0 16 L10 6 L20 14 L32 5 L42 12 L52 7 L60 13",
  "M0 8 C12 16 20 4 32 12 S48 6 60 9",
  "M0 12 Q12 4 24 14 T48 6 L60 11",
  "M0 15 L8 7 L18 14 L30 6 L40 13 L50 8 L60 12",
  "M0 9 C10 18 22 5 34 13 S50 7 60 10",
  "M0 13 Q20 6 40 15 T60 8",
];

export type AdminKpiStatCardProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  index: number;
  /** Extra delay (seconds) before this card’s stagger, e.g. second row */
  staggerGroupDelay?: number;
  iconClassName: string;
  /** Final display when not animating */
  value: string;
  /** Smooth count from 0 → target on mount / when target changes */
  animation?: {
    target: number;
    kind: AdminKpiAnimationKind;
  };
};

export function AdminKpiStatCard({
  title,
  subtitle,
  icon: Icon,
  index,
  staggerGroupDelay = 0,
  iconClassName,
  value,
  animation,
}: AdminKpiStatCardProps) {
  const reduceMotion = useReducedMotion();
  const sparkGradientId = useId().replace(/:/g, "");
  const sparkPath = SPARK_PATHS[index % SPARK_PATHS.length]!;
  const animTarget = animation?.target;
  const animKind = animation?.kind;
  const [displayValue, setDisplayValue] = useState(() =>
    animation ? formatAnimatedValue(animation.kind, 0) : value
  );

  useEffect(() => {
    if (animKind === undefined || animTarget === undefined) {
      setDisplayValue(value);
      return;
    }

    if (reduceMotion) {
      setDisplayValue(formatAnimatedValue(animKind, animTarget));
      return;
    }

    setDisplayValue(formatAnimatedValue(animKind, 0));
    const controls = animate(0, animTarget, {
      duration: 0.82,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplayValue(formatAnimatedValue(animKind, v)),
    });
    return () => controls.stop();
  }, [animTarget, animKind, reduceMotion, value]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 20, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 34,
        mass: 0.72,
        delay: staggerGroupDelay + index * 0.055,
      }}
      className="h-full"
    >
      <Card
        className={cn(
          "admin-kpi-card group relative h-full overflow-hidden border-0 bg-transparent shadow-none",
          "rounded-2xl text-card-foreground"
        )}
      >
        <CardContent className="relative z-[1] p-6 pt-6 sm:p-6">
          <svg
            className="admin-kpi-spark pointer-events-none absolute right-[4.75rem] top-5 hidden h-8 w-[4.25rem] opacity-[0.2] sm:block"
            viewBox="0 0 60 20"
            fill="none"
            aria-hidden
          >
            <defs>
              <linearGradient
                id={sparkGradientId}
                x1="0"
                y1="0"
                x2="60"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="hsl(270, 85%, 62%)" />
                <stop offset="0.5" stopColor="hsl(190, 90%, 55%)" />
                <stop offset="1" stopColor="hsl(270, 75%, 70%)" />
              </linearGradient>
            </defs>
            <path
              d={sparkPath}
              stroke={`url(#${sparkGradientId})`}
              strokeWidth="1.35"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[0.8125rem] font-medium leading-snug tracking-tight text-muted-foreground">
                {title}
              </p>
              <p
                className="text-[1.65rem] font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-[1.75rem] dark:text-zinc-50"
                aria-live="polite"
              >
                {displayValue}
              </p>
              <p className="pt-1 text-[0.8125rem] leading-snug text-muted-foreground/90">
                {subtitle}
              </p>
            </div>
            <div
              className={cn(
                "admin-kpi-icon relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1",
                iconClassName
              )}
            >
              <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={1.85} aria-hidden />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
