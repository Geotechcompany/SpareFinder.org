import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle,
  Info,
  AlertTriangle,
  Loader2,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

type PreviewNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  action_url?: string | null;
  created_at: string;
};

const typeIcon = (type: string) => {
  switch (type) {
    case "success":
      return CheckCircle;
    case "warning":
    case "error":
      return AlertTriangle;
    case "info":
    default:
      return Info;
  }
};

const formatRelative = (iso: string) => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < 60_000) return "Just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86_400_000);
  return `${days}d ago`;
};

export type NotificationBellDropdownProps = {
  /** Merged onto the trigger button (e.g. admin toolbar ghost style). */
  triggerButtonClassName?: string;
  /** Dropdown panel title. */
  heading?: string;
  /** Footer button label. */
  viewAllLabel?: string;
  /** Path prefixes that highlight the bell (active state). */
  activePathPrefixes?: string[];
};

export function NotificationBellDropdown({
  triggerButtonClassName,
  heading = "Notifications",
  viewAllLabel = "View all",
  activePathPrefixes = ["/dashboard/notifications"],
}: NotificationBellDropdownProps = {}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PreviewNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        notificationsApi.getNotifications({ limit: 12, page: 1 }),
        notificationsApi.getStats(),
      ]);

      if (listRes.success && listRes.data) {
        const raw = (listRes.data as { notifications?: PreviewNotification[] })
          ?.notifications;
        setItems(Array.isArray(raw) ? raw : []);
      }
      if (statsRes.success && statsRes.data) {
        const u = (statsRes.data as { unread?: number })?.unread;
        setUnread(typeof u === "number" ? u : 0);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 90_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) load();
  };

  const handleItemActivate = async (n: PreviewNotification) => {
    if (!n.read) {
      try {
        await notificationsApi.markAsRead(n.id);
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        );
        setUnread((c) => Math.max(0, c - 1));
      } catch {
        /* ignore */
      }
    }
    if (n.action_url && /^https?:\/\//i.test(n.action_url)) {
      window.open(n.action_url, "_blank", "noopener,noreferrer");
    } else if (n.action_url?.startsWith("/")) {
      navigate(n.action_url);
      setOpen(false);
    }
  };

  const active = activePathPrefixes.some((p) => pathname.startsWith(p));

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            active && "bg-primary/10 text-primary hover:bg-primary/15",
            triggerButtonClassName
          )}
          aria-label={heading}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-brand to-fuchsia-500 px-1 text-[10px] font-semibold text-white shadow-sm">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-2rem,22rem)] rounded-2xl border border-border/80 bg-card/95 p-0 shadow-lg backdrop-blur-xl"
      >
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 text-sm font-semibold">
          <span>{heading}</span>
          {unread > 0 ? (
            <Badge
              variant="secondary"
              className="rounded-full border border-border/60 bg-muted/60 text-xs font-medium"
            >
              {unread} new
            </Badge>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        <ScrollArea className="max-h-80">
          <div className="px-1 py-2">
            {loading && items.length === 0 ? (
              <div className="flex justify-center py-10 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-50" aria-hidden />
                <p className="text-sm">You are all caught up.</p>
              </div>
            ) : (
              items.map((n) => {
                const Icon = typeIcon(n.type);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemActivate(n)}
                    className={cn(
                      "flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/70",
                      !n.read && "bg-primary/[0.06]"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
                        n.type === "success" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                        n.type === "warning" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                        n.type === "error" && "bg-red-500/15 text-red-600 dark:text-red-400",
                        n.type === "info" && "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "line-clamp-1 text-sm font-medium text-foreground",
                            !n.read && "font-semibold"
                          )}
                        >
                          {n.title}
                        </p>
                        {!n.read ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground/80">
                        {formatRelative(n.created_at)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
        <DropdownMenuSeparator className="my-0" />
        <div className="p-2">
          <Button
            type="button"
            variant="secondary"
            className="h-9 w-full rounded-xl text-sm font-medium"
            onClick={() => {
              navigate("/dashboard/notifications");
              setOpen(false);
            }}
          >
            {viewAllLabel}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
