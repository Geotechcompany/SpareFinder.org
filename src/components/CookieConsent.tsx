import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sparefinder-cookie-consent";

type ConsentChoice = "accepted" | "declined";

function saveConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* private browsing */
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(STORAGE_KEY));
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = (choice: ConsentChoice) => {
    saveConsent(choice);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-desc"
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 left-4 right-4 z-[90] sm:left-auto sm:right-6 sm:max-w-[26rem]"
          style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border p-5 sm:p-6",
              "border-slate-200/90 bg-white/95 shadow-[0_20px_50px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,1)]",
              "backdrop-blur-2xl backdrop-saturate-150",
              "dark:border-white/10 dark:bg-slate-900/95 dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
            )}
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#6A2D95]/10 blur-2xl"
              aria-hidden
            />

            <button
              type="button"
              onClick={() => dismiss("declined")}
              className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Dismiss cookie notice"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex gap-4 pr-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6A2D95]/15 to-[#8F39BB]/10 text-[#6A2D95] ring-1 ring-[#6A2D95]/20">
                <Cookie className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1.5">
                <p
                  id="cookie-consent-title"
                  className="text-sm font-semibold text-slate-900 dark:text-white"
                >
                  We value your privacy
                </p>
                <p
                  id="cookie-consent-desc"
                  className="text-sm leading-relaxed text-slate-600 dark:text-slate-300"
                >
                  We use cookies to improve your experience, analyze traffic, and
                  remember your preferences.{" "}
                  <Link
                    to="/privacy-policy"
                    className="font-medium text-[#6A2D95] underline-offset-2 hover:underline dark:text-violet-300"
                  >
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => dismiss("declined")}
                className="h-10 rounded-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-transparent dark:text-slate-200"
              >
                Decline
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => dismiss("accepted")}
                className="h-10 rounded-full border-0 bg-gradient-to-r from-[#6A2D95] to-[#8F39BB] px-6 font-semibold text-white shadow-lg shadow-[#6A2D95]/30 hover:from-[#5a2580] hover:to-[#7d33a8]"
              >
                Accept all
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
