import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  welcomeDescription = "I'll guide you through a quick tour to upload and analyze a part.",
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
    let el = document.querySelector(step.selector) as HTMLElement | null;
    // Fallbacks for known selectors we control
    if (!el && step.selector.includes("upload")) {
      el = document.getElementById("tour-upload-dropzone");
    }
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect(r);
  }, [stepIndex, steps]);

  if (!visible) return null;

  // Welcome modal shown before starting the tour
  if (showWelcome && !started) {
    return (
      <>
        <div className="fixed inset-0 bg-black/60 z-[60]" />
        <div className="fixed inset-0 z-[62] flex items-center justify-center p-4">
          <Card
            className={`max-w-md w-full bg-black/90 border-white/10 ${className}`}
          >
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-purple-400" />
                {welcomeTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm mb-4">{welcomeDescription}</p>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-gray-300"
                  onClick={() => dismiss("session")}
                >
                  Maybe later
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-gray-300"
                    onClick={() => dismiss("forever")}
                  >
                    Don’t show again
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
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
        className={`bg-black/20 backdrop-blur-xl border-blue-500/20 ${className}`}
      >
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-purple-400" />
              Getting Started
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-1 text-gray-300 text-sm">
            <li>Choose a clear photo of the part (max 10MB).</li>
            <li>
              Optionally add 3–5 precise keywords (part no., make/model/year).
            </li>
            <li>
              Click{" "}
              <span className="font-semibold text-white">Analyze Part</span> –
              you’ll be redirected to History to track it live.
            </li>
          </ol>
          <div className="mt-3 text-xs text-gray-400">
            Tip: Image analysis gives the most accurate results.
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-gray-300"
              onClick={() => dismiss("session")}
            >
              Dismiss until next login
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-emerald-600 to-green-600"
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
      <div className="fixed inset-0 bg-black/60 z-[1000]" />
      {rect && (
        <div
          className="fixed z-[1001] rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] border-2 border-blue-400 pointer-events-none"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      )}
      <div
        className="fixed z-[1002] max-w-sm bg-black/90 border border-white/10 rounded-xl p-4 text-gray-200"
        style={{
          top: rect ? Math.min(rect.bottom + 12, window.innerHeight - 140) : 80,
          left: rect
            ? Math.min(Math.max(rect.left, 96), window.innerWidth - 360)
            : 96,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-white font-semibold">
            <Sparkles className="w-4 h-4 mr-2 text-purple-400" />{" "}
            {step?.title || "Step"}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={() => dismiss("session")}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-300 mb-3">{step?.description}</div>
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-gray-300"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-gray-300"
              onClick={() => dismiss("session")}
            >
              Skip
            </Button>
            {stepIndex < steps.length - 1 ? (
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600"
                onClick={() =>
                  setStepIndex((i) => Math.min(steps.length - 1, i + 1))
                }
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-600 to-green-600"
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
