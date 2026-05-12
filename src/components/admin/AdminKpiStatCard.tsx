import { useEffect, useState } from "react";
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
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[0.8125rem] font-medium leading-snug tracking-tight text-muted-foreground">
                {title}
              </p>
              <p
                className="text-[1.65rem] font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-[1.75rem]"
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
