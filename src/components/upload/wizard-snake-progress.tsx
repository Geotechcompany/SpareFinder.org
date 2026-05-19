import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type WizardSnakeStep = {
  key: string;
  label: string;
};

type WizardSnakeProgressProps = {
  steps: WizardSnakeStep[];
  currentIndex: number;
  className?: string;
};

type StepStatus = "pending" | "active" | "complete";

function getStepStatus(index: number, currentIndex: number): StepStatus {
  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "active";
  return "pending";
}

export function WizardSnakeProgress({
  steps,
  currentIndex,
  className,
}: WizardSnakeProgressProps) {
  const n = steps.length;
  const safeIndex = Math.max(0, Math.min(currentIndex, n - 1));
  const progressPercent =
    n <= 1 ? 100 : Math.round((safeIndex / (n - 1)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("relative", className)}
    >
      <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#3A5AFE]/12 via-[#8F39BB]/10 to-transparent opacity-90 blur-xl dark:from-primary/15 dark:via-brand/10" />

      <motion.div
        className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 px-4 py-4 shadow-soft-elevated backdrop-blur-xl dark:border-white/10 dark:bg-black/35 sm:px-5 sm:py-5"
        layout
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

        <motion.div
          className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-full bg-gradient-to-b from-[#3A5AFE] via-[#8F39BB] to-[#3A5AFE]/40"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: progressPercent / 100 }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
          style={{ transformOrigin: "top" }}
        />

        <motion.div
          className="pointer-events-none absolute inset-y-0 right-0 w-1 rounded-full bg-gradient-to-b from-[#3A5AFE]/40 via-[#8F39BB] to-[#3A5AFE]"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: progressPercent / 100 }}
          transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.05 }}
          style={{ transformOrigin: "bottom" }}
        />

        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">
            Progress
          </span>
          <motion.span
            key={progressPercent}
            initial={{ opacity: 0.6, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-[#3A5AFE] to-[#8F39BB] bg-clip-text text-sm font-bold tabular-nums text-transparent sm:text-base"
          >
            {progressPercent}%
          </motion.span>
        </div>

        <motion.div
          className="relative grid gap-2"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {/* Snake connector track behind nodes */}
          <div
            className="pointer-events-none absolute left-[calc(50%/var(--cols))] right-[calc(50%/var(--cols))] top-5 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-muted/80 sm:top-[22px]"
            style={{ "--cols": n } as CSSProperties}
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#3A5AFE] via-[#6B4FDB] to-[#8F39BB] bg-[length:200%_100%] animate-snake-flow shadow-[0_0_14px_rgba(58,90,254,0.35)]"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            />
          </div>

          {steps.map((step, index) => {
            const status = getStepStatus(index, safeIndex);

            return (
              <motion.div
                key={step.key}
                className="relative z-10 flex flex-col items-center text-center"
                initial={false}
                animate={{ opacity: status === "pending" ? 0.7 : 1 }}
              >
                <motion.div
                  className="relative flex h-10 w-10 items-center justify-center"
                  animate={
                    status === "active"
                      ? { scale: [1, 1.05, 1] }
                      : { scale: 1 }
                  }
                  transition={
                    status === "active"
                      ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.25 }
                  }
                >
                  {status === "active" && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-[#3A5AFE]/40 to-[#8F39BB]/35"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}

                  <motion.div
                    layout
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-shadow duration-300",
                      status === "complete" &&
                        "border-transparent bg-gradient-to-br from-[#3A5AFE] to-[#8F39BB] text-white shadow-[0_4px_16px_rgba(58,90,254,0.45)]",
                      status === "active" &&
                        "border-[#3A5AFE] bg-card shadow-[0_0_0_4px_rgba(58,90,254,0.14),0_4px_18px_rgba(143,57,187,0.22)] dark:bg-background",
                      status === "pending" &&
                        "border-border/90 bg-muted/40 dark:border-white/15 dark:bg-white/5"
                    )}
                  >
                    {status === "complete" ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -24 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 18 }}
                      >
                        <Check className="h-[18px] w-[18px] stroke-[2.5]" />
                      </motion.div>
                    ) : (
                      <motion.span
                        className={cn(
                          "block rounded-full",
                          status === "active"
                            ? "h-2.5 w-2.5 bg-gradient-to-br from-[#3A5AFE] to-[#8F39BB]"
                            : "h-2 w-2 bg-muted-foreground/30"
                        )}
                        animate={
                          status === "active"
                            ? { scale: [1, 1.2, 1] }
                            : undefined
                        }
                        transition={
                          status === "active"
                            ? { duration: 1.4, repeat: Infinity }
                            : undefined
                        }
                      />
                    )}
                  </motion.div>
                </motion.div>

                <motion.span
                  layout
                  className={cn(
                    "mt-2.5 max-w-[7rem] text-[11px] font-medium leading-tight sm:mt-3 sm:text-xs",
                    status === "active" &&
                      "bg-gradient-to-r from-[#3A5AFE] to-[#8F39BB] bg-clip-text font-semibold text-transparent",
                    status === "complete" && "text-foreground/90",
                    status === "pending" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </motion.span>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
