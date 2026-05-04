import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Archive,
  BadgeCheck,
  ImagePlus,
  Inbox,
  Loader2,
  Lock,
  Mail,
  Save,
  Send,
  Timer,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ticketStatusIconClass } from "@/lib/ticketBadgeStyles";
import { toast } from "sonner";

export type TicketStatus = "open" | "in_progress" | "answered" | "closed";

const statusMeta: Record<
  TicketStatus,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  open: { label: "Open", Icon: Inbox },
  in_progress: { label: "In progress", Icon: Timer },
  answered: { label: "Answered", Icon: BadgeCheck },
  closed: { label: "Closed", Icon: Archive },
};

const MAX_IMAGES = 6;

async function fileToCompressedDataUrl(file: File, maxW = 1280, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Not an image");
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxW) {
        h = (h * maxW) / w;
        w = maxW;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w));
      canvas.height = Math.max(1, Math.round(h));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unsupported"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function countEmbeddedImages(text: string): number {
  const re = /!\[[^\]]*\]\([^)]+\)/g;
  let n = 0;
  while (re.exec(text)) n += 1;
  return n;
}

function buildComposedBody(text: string, images: readonly { dataUrl: string }[]): string {
  const chunks: string[] = [];
  const t = text.trim();
  if (t) chunks.push(t);
  for (const img of images) {
    chunks.push(`![image](${img.dataUrl})`);
  }
  return chunks.join("\n\n");
}

type PendingImage = { id: string; dataUrl: string; name: string };

export type AdminTicketReplyComposerProps = {
  ticketId: string;
  replyDraft: string;
  onReplyDraftChange: (value: string) => void;
  internalOnly: boolean;
  onInternalOnlyChange: (value: boolean) => void;
  notifyEmail: boolean;
  onNotifyEmailChange: (value: boolean) => void;
  editStatus: TicketStatus;
  onEditStatusChange: (value: TicketStatus) => void;
  onSaveStatusOnly: () => void;
  saving: boolean;
  sendingReply: boolean;
  /** Returns true when the message was accepted so local attachments can clear. */
  onSend: (composedBody: string) => Promise<boolean>;
  onClose: () => void;
  maxLength: number;
  quickReplies: readonly string[];
  /** `dock` = compact bottom chat bar (single-column ticket UI). `panel` = fills a side panel. */
  variant?: "panel" | "dock";
};

export function AdminTicketReplyComposer({
  ticketId,
  replyDraft,
  onReplyDraftChange,
  internalOnly,
  onInternalOnlyChange,
  onNotifyEmailChange,
  notifyEmail,
  editStatus,
  onEditStatusChange,
  onSaveStatusOnly,
  saving,
  sendingReply,
  onSend,
  onClose,
  maxLength,
  quickReplies,
  variant = "panel",
}: AdminTicketReplyComposerProps) {
  const dock = variant === "dock";
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(0);
  const [slashHighlight, setSlashHighlight] = useState(0);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  useEffect(() => {
    setPendingImages([]);
  }, [ticketId]);

  const composedBody = useMemo(
    () => buildComposedBody(replyDraft, pendingImages),
    [replyDraft, pendingImages]
  );
  const composedLength = composedBody.length;

  const updateCursor = useCallback(() => {
    const el = taRef.current;
    if (el) setCursor(el.selectionStart ?? 0);
  }, []);

  const slashState = useMemo(() => {
    const value = replyDraft;
    const pos = Math.min(cursor, value.length);
    const before = value.slice(0, pos);
    const lineStart = before.lastIndexOf("\n") + 1;
    const lineToCursor = before.slice(lineStart);
    if (!lineToCursor.startsWith("/")) return null;
    if (/\s/.test(lineToCursor.slice(1))) return null;
    const filter = lineToCursor.slice(1).toLowerCase();
    return { lineStart, replaceTo: pos, filter };
  }, [replyDraft, cursor]);

  const filteredQuick = useMemo(() => {
    if (!slashState) return [];
    const f = slashState.filter;
    return quickReplies.filter((q) => q.toLowerCase().includes(f));
  }, [quickReplies, slashState]);

  const showSlashMenu = Boolean(slashState && filteredQuick.length > 0);

  const applyQuickAtSlash = useCallback(
    (text: string) => {
      if (!slashState || !taRef.current) return;
      const { lineStart, replaceTo } = slashState;
      const value = replyDraft;
      const next = `${value.slice(0, lineStart)}${text}${value.slice(replaceTo)}`.slice(0, maxLength);
      onReplyDraftChange(next);
      const pos = lineStart + text.length;
      requestAnimationFrame(() => {
        const el = taRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(pos, pos);
          setCursor(pos);
        }
      });
    },
    [maxLength, onReplyDraftChange, replyDraft, slashState]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSlashMenu || !slashState) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashHighlight((i) => Math.min(i + 1, filteredQuick.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashHighlight((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const pick = filteredQuick[slashHighlight];
        if (pick) applyQuickAtSlash(pick);
      } else if (e.key === "Escape") {
        e.preventDefault();
        const { lineStart, replaceTo } = slashState;
        const value = replyDraft;
        const next = `${value.slice(0, lineStart)}${value.slice(replaceTo)}`;
        onReplyDraftChange(next);
        requestAnimationFrame(() => {
          const el = taRef.current;
          if (el) {
            el.focus();
            el.setSelectionRange(lineStart, lineStart);
            setCursor(lineStart);
          }
        });
      }
    },
    [applyQuickAtSlash, filteredQuick, onReplyDraftChange, replyDraft, showSlashMenu, slashHighlight, slashState]
  );

  React.useEffect(() => {
    if (showSlashMenu) setSlashHighlight(0);
  }, [slashState?.filter, showSlashMenu]);

  const attachImages = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!list.length) {
        toast.error("Choose image files only");
        return;
      }
      for (const file of list) {
        let dataUrl: string;
        try {
          dataUrl = await fileToCompressedDataUrl(file);
        } catch {
          toast.error(`Could not attach ${file.name}`);
          continue;
        }
        setPendingImages((prev) => {
          const embedded = countEmbeddedImages(replyDraft);
          if (embedded + prev.length >= MAX_IMAGES) {
            toast.error(`Maximum ${MAX_IMAGES} images per message`);
            return prev;
          }
          const next: PendingImage[] = [
            ...prev,
            { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, dataUrl, name: file.name },
          ];
          if (buildComposedBody(replyDraft, next).length > maxLength) {
            toast.error("Message too large — remove an image or shorten text");
            return prev;
          }
          return next;
        });
      }
      if (fileRef.current) fileRef.current.value = "";
    },
    [maxLength, replyDraft]
  );

  const removePendingImage = useCallback((id: string) => {
    setPendingImages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleSend = useCallback(async () => {
    const body = composedBody.trim();
    if (!body) {
      toast.error("Write a message or attach an image before sending");
      return;
    }
    const ok = await onSend(body);
    if (ok) setPendingImages([]);
  }, [composedBody, onSend]);

  const StatusIcon = statusMeta[editStatus].Icon;

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex flex-col gap-3", !dock && "min-h-0 flex-1")}>
        <div
          className={cn(
            "relative flex flex-col rounded-2xl border border-border/70 bg-background shadow-inner dark:border-border/80",
            !dock && "min-h-0 flex-1"
          )}
        >
          <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border/50 px-1.5 py-1.5 sm:gap-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Status applied when you send a public reply"
                  className={cn("h-9 w-9 rounded-xl", ticketStatusIconClass(editStatus))}
                  aria-label="Ticket status"
                >
                  <StatusIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel>Ticket status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(statusMeta) as TicketStatus[]).map((s) => {
                  const { Icon, label } = statusMeta[s];
                  return (
                    <DropdownMenuItem key={s} className="gap-2" onClick={() => onEditStatusChange(s)}>
                      <Icon className={cn("h-4 w-4 shrink-0", ticketStatusIconClass(s))} />
                      <span className="flex-1">{label}</span>
                      {editStatus === s ? <span className="text-xs text-muted-foreground">✓</span> : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("h-9 w-9 rounded-xl", saving && "opacity-60")}
                  onClick={() => onSaveStatusOnly()}
                  disabled={saving}
                  aria-label="Save status only"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Save status without sending a message</TooltipContent>
            </Tooltip>

            <div className="mx-0.5 hidden h-5 w-px bg-border/80 sm:block" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-xl",
                    internalOnly && "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                  )}
                  onClick={() => {
                    const next = !internalOnly;
                    onInternalOnlyChange(next);
                    if (next) onNotifyEmailChange(false);
                    else onNotifyEmailChange(true);
                  }}
                  aria-pressed={internalOnly}
                  aria-label="Internal note"
                >
                  <Lock className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Internal — hidden from customer</TooltipContent>
            </Tooltip>

            {!internalOnly ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-xl",
                      notifyEmail ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground"
                    )}
                    onClick={() => onNotifyEmailChange(!notifyEmail)}
                    aria-pressed={notifyEmail}
                    aria-label="Email customer"
                    title={notifyEmail ? "Customer will get an email copy (if SMTP is set up)" : "Email copy disabled"}
                  >
                    <Mail className={cn("h-4 w-4", !notifyEmail && "opacity-40")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Email customer a copy (needs SMTP)</TooltipContent>
              </Tooltip>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Attach images"
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Attach photos (compressed, up to {MAX_IMAGES}). Shown as thumbnails — not pasted into the text box.
              </TooltipContent>
            </Tooltip>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void attachImages(e.target.files)}
            />

            <p className="ml-auto hidden pr-2 text-[10px] text-muted-foreground sm:block">Type / for quick replies</p>
          </div>

          {pendingImages.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-b border-border/40 px-2 py-2">
              {pendingImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/40 shadow-sm"
                >
                  <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    disabled={sendingReply}
                    className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-90 ring-1 ring-white/20 transition hover:bg-black/70 disabled:pointer-events-none disabled:opacity-40"
                    aria-label={`Remove ${img.name}`}
                    onClick={() => removePendingImage(img.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className={cn("relative", !dock && "min-h-0 flex-1")}>
            <Textarea
              ref={taRef}
              id="reply-draft"
              value={replyDraft}
              onChange={(e) => {
                onReplyDraftChange(e.target.value.slice(0, maxLength));
                setCursor(e.target.selectionStart ?? 0);
              }}
              onSelect={updateCursor}
              onClick={updateCursor}
              onKeyUp={updateCursor}
              onKeyDown={onKeyDown}
              placeholder={
                internalOnly
                  ? "Team-only note…  Type / for templates"
                  : "Write a reply…  Type / for quick templates  ·  Attach images with the photo icon"
              }
              className={cn(
                "resize-y rounded-none border-0 bg-transparent px-3 py-3 text-base shadow-none focus-visible:ring-0 sm:text-sm",
                dock
                  ? "min-h-[88px] max-h-[min(32vh,220px)] overflow-y-auto"
                  : "min-h-[160px] flex-1 sm:min-h-[200px]"
              )}
            />

            {showSlashMenu ? (
              <div
                className="absolute bottom-full left-2 right-2 z-20 mb-1 max-h-48 overflow-y-auto rounded-xl border border-border/80 bg-popover p-1 shadow-lg"
                role="listbox"
              >
                {filteredQuick.map((q, idx) => (
                  <button
                    key={q}
                    type="button"
                    role="option"
                    aria-selected={idx === slashHighlight}
                    className={cn(
                      "flex w-full rounded-lg px-2 py-2 text-left text-xs text-popover-foreground hover:bg-accent",
                      idx === slashHighlight && "bg-accent"
                    )}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      applyQuickAtSlash(q);
                    }}
                  >
                    <span className="line-clamp-3">{q}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border/50 px-2 py-1.5 text-xs text-muted-foreground">
            <span className="pl-1 sm:hidden">/ quick · photo icon</span>
            <span className="ml-auto flex flex-wrap items-center gap-x-2 tabular-nums sm:ml-0">
              {pendingImages.length > 0 ? (
                <span className="text-[10px] font-medium text-violet-700 dark:text-violet-300">
                  {pendingImages.length} photo{pendingImages.length !== 1 ? "s" : ""} (sent with message)
                </span>
              ) : null}
              <span>
                {composedLength} / {maxLength}
              </span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="h-11 w-full rounded-xl sm:w-auto sm:min-w-[120px]" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            disabled={sendingReply || !composedBody.trim()}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 sm:w-auto sm:min-w-[160px]"
            onClick={() => void handleSend()}
          >
            {sendingReply ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {internalOnly ? "Save note" : "Send reply"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
