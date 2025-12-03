import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

type DismissMode = "forever" | "session";

type Step = {
  selector: string; // CSS selector for target element
  title: string;
  description: string;
  aiHint?: string; // optional AI/personalized hint to show under the description
};

interface OnboardingGuideProps {
  storageKey?: string;
  userId?: string | null;
  className?: string;
  onDismiss?: (mode: DismissMode) => void;
  steps?: Step[];
  showWelcome?: boolean;
  welcomeTitle?: string;
  welcomeDescription?: string;
  aiSummary?: string; // optional AI-driven summary/tip shown in the welcome card
  onStart?: () => void;
  force?: boolean;
}

const getKeys = (base: string, userId?: string | null) => {
  const suffix = userId ? `_${userId}` : "_anon";
  return {
    local: `${base}${suffix}`,
    session: `${base}_session${suffix}`,
  };
};

const hasDismissed = (base: string, userId?: string | null) => {
  const keys = getKeys(base, userId);
  try {
    if (sessionStorage.getItem(keys.session) === "1") return true;
  } catch {}
  try {
    if (localStorage.getItem(keys.local) === "1") return true;
  } catch {}
  return false;
};

const setDismissed = (
  base: string,
  mode: DismissMode,
  userId?: string | null
) => {
  const { local, session } = getKeys(base, userId);
  try {
    if (mode === "forever") localStorage.setItem(local, "1");
    if (mode === "session") sessionStorage.setItem(session, "1");
  } catch {}
};

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({
  storageKey = "onboarding_seen_v1",
  userId,
  className = "",
  onDismiss,
  steps = [],
  showWelcome = true,
  welcomeTitle = "Welcome to SpareFinder",
  welcomeDescription = "I'll guide you through a quick tour to upload and analyze a part with SpareFinder AI.",
  aiSummary,
  onStart,
  force,
}) => {
  const [visible, setVisible] = React.useState(
    (typeof force === "boolean" && force) || !hasDismissed(storageKey, userId)
  );
  const [stepIndex, setStepIndex] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const [started, setStarted] = React.useState(false);

  const dismiss = (mode: DismissMode) => {
    setDismissed(storageKey, mode, userId);
    setVisible(false);
    onDismiss?.(mode);
  };

  React.useEffect(() => {
    if (!steps.length) return;
    const step = steps[Math.max(0, Math.min(stepIndex, steps.length - 1))];
    if (!step) return;

    // Add a small delay to ensure element is rendered
    const timer = setTimeout(() => {
      let el = document.querySelector(step.selector) as HTMLElement | null;
      // Fallbacks for known selectors we control
      if (!el && step.selector.includes("upload")) {
        el = document.getElementById("tour-upload-dropzone");
      }
      if (!el) {
        console.log(
          "OnboardingGuide: Element not found for selector:",
          step.selector
        );
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      console.log("OnboardingGuide: Element found, rect:", r);
      setRect(r);
    }, 100);

    return () => clearTimeout(timer);
  }, [stepIndex, steps]);

  if (!visible) return null;

  // Welcome modal shown before starting the tour
  if (showWelcome && !started) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-[9998]" />
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <Card
            className={cn(
              "max-w-md w-full rounded-2xl border border-border bg-card text-foreground shadow-soft-elevated",
              "dark:bg-black/90 dark:border-white/10 dark:text-white",
              className
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center text-foreground dark:text-white">
                <Sparkles className="w-4 h-4 mr-2 text-[#8B5CF6]" />
                {welcomeTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4 text-muted-foreground dark:text-gray-300">
                {welcomeDescription}
              </p>
              {aiSummary && (
                <div className="mb-4 text-xs rounded-lg p-3 border bg-[#E0E7FF] text-[#1E293B] border-[#C7D2FE] dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-200">
                  <div className="font-semibold mb-1">AI insight</div>
                  <p>{aiSummary}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-muted-foreground hover:bg-muted dark:border-white/20 dark:text-gray-300"
                  onClick={() => dismiss("session")}
                >
                  Maybe later
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:bg-muted dark:border-white/20 dark:text-gray-300"
                    onClick={() => dismiss("forever")}
                  >
                    Don’t show again
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#3A5AFE] to-[#8B5CF6] text-white shadow-sm hover:from-[#4C5DFF] hover:to-[#A855F7]"
                    onClick={() => {
                      setStarted(true);
                      onStart?.();
                    }}
                  >
                    Start tour
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!steps.length) {
    // Fallback simple card (no highlight)
    return (
      <Card
        className={cn(
          "backdrop-blur-xl rounded-2xl border border-border bg-card text-foreground shadow-soft-elevated",
          "dark:bg-black/20 dark:border-blue-500/20 dark:text-white",
          className
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground dark:text-white">
            <span className="flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-[#8B5CF6]" />
              Getting Started
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground dark:text-gray-300">
            <li>Choose a clear photo of the part (max 10MB).</li>
            <li>
              Optionally add 3–5 precise keywords (part no., make/model/year).
            </li>
            <li>
              Click{" "}
              <span className="font-semibold text-foreground dark:text-white">
                Analyze Part
              </span>{" "}
              –
              you’ll be redirected to History to track it live.
            </li>
          </ol>
          <div className="mt-3 text-xs text-muted-foreground dark:text-gray-400">
            Tip: Image analysis gives the most accurate results.
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-muted dark:border-white/20 dark:text-gray-300"
              onClick={() => dismiss("session")}
            >
              Dismiss until next login
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm hover:from-emerald-600 hover:to-green-600"
              onClick={() => dismiss("forever")}
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Don’t show again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const step = steps[Math.max(0, Math.min(stepIndex, steps.length - 1))];

  return (
    <>
      {/* Dim background above everything */}
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-[9999]" />
      {rect && (
        <div
          className="fixed z-[10000] rounded-xl border-2 border-[#3A5AFE] pointer-events-none shadow-[0_0_0_9999px_rgba(15,23,42,0.25)] dark:shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      )}
      <div
        className="fixed z-[10001] max-w-sm rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-soft-elevated dark:bg-black/90 dark:border-white/10 dark:text-gray-200"
        style={{
          top: rect ? Math.min(rect.bottom + 12, window.innerHeight - 140) : 80,
          left: rect
            ? Math.min(Math.max(rect.left, 120), window.innerWidth - 360)
            : 120,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center font-semibold text-foreground dark:text-white">
            <Sparkles className="w-4 h-4 mr-2 text-[#8B5CF6]" />{" "}
            {step?.title || "Step"}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white"
            onClick={() => dismiss("session")}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="mb-3 text-sm text-muted-foreground dark:text-gray-300">
          {step?.description}
          {step?.aiHint && (
            <div className="mt-2 text-xs rounded-md border border-[#C7D2FE] bg-[#E0E7FF] px-2 py-1 text-[#1E293B] dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-200">
              {step.aiHint}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:bg-muted dark:border-white/20 dark:text-gray-300"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-muted dark:border-white/20 dark:text-gray-300"
              onClick={() => dismiss("session")}
            >
              Skip
            </Button>
            {stepIndex < steps.length - 1 ? (
              <Button
                size="sm"
                className="bg-gradient-to-r from-[#3A5AFE] to-[#8B5CF6] text-white shadow-sm hover:from-[#4C5DFF] hover:to-[#A855F7]"
                onClick={() =>
                  setStepIndex((i) => Math.min(steps.length - 1, i + 1))
                }
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm hover:from-emerald-600 hover:to-green-600"
                onClick={() => dismiss("forever")}
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingGuide;
