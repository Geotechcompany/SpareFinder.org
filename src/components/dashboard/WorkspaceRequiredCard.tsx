import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Layers, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const WorkspaceRequiredCard: React.FC<{
  title?: string;
  description?: string;
  className?: string;
}> = ({
  title = "Create your workspace",
  description =
    "Before you can upload parts or run analyses, create a workspace for your team or site. This keeps your history and limits organized.",
  className,
}) => {
  const navigate = useNavigate();

  const handleCreate = () => {
    navigate(
      `/onboarding/profile?next=${encodeURIComponent("/dashboard/upload")}`
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
        <article
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border/50",
            "bg-card/85 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-card/60"
          )}
        >
          <motion.div
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/15 blur-2xl"
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-violet-500/10 blur-2xl"
            aria-hidden
          />

          <div className="relative px-6 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
            <motion.div
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="relative mb-5">
                <div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-brand/30 to-violet-400/20 blur-xl"
                  aria-hidden
                />
                <motion.div
                  className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg shadow-brand/25"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Building2 className="h-7 w-7" aria-hidden />
                </motion.div>
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-brand/15 text-brand">
                  <Layers className="h-3.5 w-3.5" aria-hidden />
                </motion.div>
              </motion.div>

              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand">
                <Sparkles className="h-3 w-3" aria-hidden />
                Setup required
              </span>

              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {title}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {description}
              </p>
            </motion.div>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={handleCreate}
                className="h-11 w-full bg-gradient-to-r from-brand to-brand-dark shadow-md shadow-brand/20 sm:w-auto sm:min-w-[200px]"
              >
                Create workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </article>
      </motion.div>
    </motion.div>
  );
};
