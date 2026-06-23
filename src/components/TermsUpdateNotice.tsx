import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TERMS_NOTICE_STORAGE_KEY } from "@/lib/terms-constants";

function dismissNotice() {
  try {
    localStorage.setItem(TERMS_NOTICE_STORAGE_KEY, "dismissed");
  } catch {
    /* private browsing */
  }
}

export function TermsUpdateNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(TERMS_NOTICE_STORAGE_KEY) !== "dismissed");
    } catch {
      setVisible(true);
    }
  }, []);

  const close = () => {
    dismissNotice();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          role="dialog"
          aria-labelledby="terms-update-title"
          aria-describedby="terms-update-desc"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 left-4 right-4 z-[85] sm:left-auto sm:right-6 sm:max-w-[22rem]"
          style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border p-4 shadow-xl",
              "border-slate-200/80 bg-white/95 backdrop-blur-xl",
              "dark:border-white/10 dark:bg-slate-900/95 dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, transparent 40%, rgba(106,45,149,0.08) 50%, transparent 60%)",
              }}
              aria-hidden
            />

            <button
              type="button"
              onClick={close}
              className="absolute right-2.5 top-2.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss terms update notice"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="inline-flex rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notice
            </span>

            <h2
              id="terms-update-title"
              className="mt-2 pr-6 text-sm font-semibold text-foreground"
            >
              We&apos;ve updated our Terms of Use
            </h2>
            <p id="terms-update-desc" className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Updates include subscription cancellation, free trials, and refund rules aligned with UK
              consumer law.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                <Link to="/terms-of-service" onClick={close}>
                  Learn more
                </Link>
              </Button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
