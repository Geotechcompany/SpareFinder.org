import type { LucideIcon } from "lucide-react";
import {
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  XCircle,
} from "lucide-react";

export type NotificationLike = {
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, unknown> | null;
};

export function isAnalysisNotification(notification: NotificationLike): boolean {
  const meta = notification.metadata;
  return meta?.category === "analysis";
}

export function getAnalysisEvent(
  notification: NotificationLike
): "started" | "completed" | "failed" | undefined {
  const event = notification.metadata?.event;
  if (event === "started" || event === "completed" || event === "failed") {
    return event;
  }
  return undefined;
}

export function getNotificationIcon(
  notification: NotificationLike
): LucideIcon {
  if (isAnalysisNotification(notification)) {
    const event = getAnalysisEvent(notification);
    if (event === "completed") return CheckCircle;
    if (event === "failed") return XCircle;
    return Sparkles;
  }
  switch (notification.type) {
    case "success":
      return CheckCircle;
    case "warning":
      return AlertTriangle;
    case "error":
      return AlertTriangle;
    case "info":
    default:
      return Info;
  }
}

export function getNotificationAccentClass(notification: NotificationLike): string {
  if (isAnalysisNotification(notification)) {
    const event = getAnalysisEvent(notification);
    if (event === "completed") {
      return "from-emerald-600 to-teal-600";
    }
    if (event === "failed") {
      return "from-red-600 to-rose-600";
    }
    return "from-brand to-violet-600";
  }
  switch (notification.type) {
    case "success":
      return "from-green-600 to-emerald-600";
    case "warning":
      return "from-yellow-600 to-orange-600";
    case "error":
      return "from-red-600 to-pink-600";
    case "info":
    default:
      return "from-blue-600 to-cyan-600";
  }
}

export function getNotificationBadgeLabel(
  notification: NotificationLike
): string | null {
  if (!isAnalysisNotification(notification)) return null;
  const event = getAnalysisEvent(notification);
  if (event === "started") return "In progress";
  if (event === "completed") return "Complete";
  if (event === "failed") return "Failed";
  return "Analysis";
}
