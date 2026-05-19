import { toast } from "sonner";
import { History, Search, Sparkles } from "lucide-react";
import { dispatchNotificationsRefresh } from "@/lib/notification-events";

type AnalysisStartedOptions = {
  imageName?: string;
  keywords?: string;
  mode?: "image" | "keywords";
  onViewHistory?: () => void;
};

function buildSubtitle(options: AnalysisStartedOptions): string {
  const { imageName, keywords, mode } = options;
  if (mode === "keywords" || (!imageName && keywords)) {
    const label =
      keywords && keywords.length > 80
        ? `${keywords.slice(0, 77)}…`
        : keywords || "your keywords";
    return `AI research is running for “${label}”. Track stages live in History.`;
  }
  const label = imageName || "your image";
  return `We're identifying ${label}. You'll get an email when the report is ready.`;
}

/** Modern Sonner toast when a crew analysis job is queued. */
export function showAnalysisStartedToast(options: AnalysisStartedOptions = {}): void {
  const isKeyword = options.mode === "keywords";
  const Icon = isKeyword ? Search : Sparkles;

  toast.success("Analysis started", {
    description: buildSubtitle(options),
    icon: <Icon className="h-5 w-5 shrink-0 text-white" aria-hidden />,
    duration: 6500,
    action: options.onViewHistory
      ? {
          label: "View History",
          onClick: () => options.onViewHistory?.(),
        }
      : {
          label: "History",
          onClick: () => {
            window.location.assign("/dashboard/history");
          },
        },
  });

  dispatchNotificationsRefresh();
}

/** Shown when analysis fails to start (upload/schedule error). */
export function showAnalysisErrorToast(message: string, timedOut = false): void {
  toast.error(timedOut ? "Request timed out" : "Could not start analysis", {
    description: message,
    duration: 7000,
    action: timedOut
      ? {
          label: "Open History",
          onClick: () => {
            window.location.assign("/dashboard/history");
          },
        }
      : undefined,
  });
}

/** Optional toast when a job finishes (e.g. History polling). */
export function showAnalysisCompletedToast(imageName?: string): void {
  toast.success("Analysis complete", {
    description: imageName
      ? `Your report for ${imageName} is ready.`
      : "Your part analysis report is ready.",
    icon: <History className="h-5 w-5 shrink-0 text-white" aria-hidden />,
    duration: 5500,
    action: {
      label: "View results",
      onClick: () => {
        window.location.assign("/dashboard/history");
      },
    },
  });
  dispatchNotificationsRefresh();
}
