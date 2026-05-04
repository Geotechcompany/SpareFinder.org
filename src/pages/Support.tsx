import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, MessageSquarePlus, Ticket, ChevronRight, ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { ticketPriorityBadgeCn, ticketStatusBadgeCn } from "@/lib/ticketBadgeStyles";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import { PageSkeleton } from "@/components/skeletons";
import { api } from "@/lib/api";
import { toast } from "sonner";

type TicketStatus = "open" | "in_progress" | "answered" | "closed";
type TicketPriority = "low" | "medium" | "high";

interface TicketItem {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  body: string;
  author_role?: string;
  author_display?: string | null;
  created_at: string;
  _legacy?: boolean;
}

interface TicketDetail extends TicketItem {
  message: string;
  admin_notes?: string | null;
  messages?: TicketMessage[];
}

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  answered: "Answered",
  closed: "Closed",
};

const priorityLabels: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const Support = () => {
  const { inLayout } = useDashboardLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<TicketDetail | null>(null);
  const detailFetchGen = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({ subject: "", message: "", priority: "medium" as TicketPriority });
  const [followUp, setFollowUp] = useState("");
  const [followUpSending, setFollowUpSending] = useState(false);

  const limit = 20;

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.tickets.list(page, limit, statusFilter === "all" ? undefined : statusFilter);
      if (res?.success && res?.data) {
        setTickets(res.data.tickets || []);
        setTotal(res.data.total ?? 0);
      } else {
        toast.error(res?.message || "Failed to load tickets");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const closeTicketDetail = useCallback(() => {
    detailFetchGen.current += 1;
    setDetailTicket(null);
  }, []);

  const openDetail = async (id: string) => {
    const myGen = ++detailFetchGen.current;
    const row = tickets.find((t) => t.id === id);
    setFollowUp("");
    if (row) {
      setDetailTicket({
        ...row,
        message: "",
        messages: [],
        admin_notes: null,
      });
    } else {
      setDetailTicket({
        id,
        subject: "Ticket",
        status: "open",
        priority: "medium",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message: "",
        messages: [],
        admin_notes: null,
      });
    }
    try {
      const res = await api.tickets.get(id);
      if (myGen !== detailFetchGen.current) return;
      if (res?.success && res?.data) {
        setDetailTicket(res.data as TicketDetail);
      } else {
        toast.error("Failed to load ticket");
        closeTicketDetail();
      }
    } catch (e) {
      if (myGen !== detailFetchGen.current) return;
      toast.error("Failed to load ticket");
      closeTicketDetail();
    }
  };

  const publicThread = useMemo(() => {
    if (!detailTicket) return [];
    const msgs = [...(detailTicket.messages || [])];
    const legacy = (detailTicket.admin_notes || "").trim();
    if (
      legacy &&
      !msgs.some((m) => (m.body || "").trim() === legacy)
    ) {
      msgs.push({
        id: `legacy-${detailTicket.id}`,
        body: legacy,
        author_role: "admin",
        author_display: "Support",
        created_at: detailTicket.updated_at,
        _legacy: true,
      });
    }
    return msgs.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [detailTicket]);

  const sendFollowUp = async () => {
    if (!detailTicket) return;
    const text = followUp.trim();
    if (!text) {
      toast.error("Enter a message");
      return;
    }
    setFollowUpSending(true);
    try {
      const res = await api.tickets.postMessage(detailTicket.id, text);
      if (res?.success) {
        toast.success(res?.message || "Reply sent");
        setFollowUp("");
        const refreshed = await api.tickets.get(detailTicket.id);
        if (refreshed?.success && refreshed?.data) {
          setDetailTicket(refreshed.data as TicketDetail);
        }
        fetchTickets();
      } else {
        toast.error(res?.message || "Failed to send reply");
      }
    } catch (e) {
      toast.error("Failed to send reply");
    } finally {
      setFollowUpSending(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const subject = createForm.subject.trim();
    const message = createForm.message.trim();
    if (!subject || !message) {
      toast.error("Subject and message are required");
      return;
    }
    if (message.length < 10) {
      toast.error("Message must be at least 10 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.tickets.create({
        subject,
        message,
        priority: createForm.priority,
      });
      if (res?.success) {
        toast.success(res?.message || "Ticket created. We'll get back to you soon.");
        setCreateOpen(false);
        setCreateForm({ subject: "", message: "", priority: "medium" });
        fetchTickets();
      } else {
        toast.error(res?.message || "Failed to create ticket");
      }
    } catch (e) {
      toast.error("Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleDateString(undefined, { dateStyle: "medium" }) + " " + d.toLocaleTimeString(undefined, { timeStyle: "short" });
    } catch {
      return s;
    }
  };

  if (!inLayout) {
    return <PageSkeleton variant="user" showSidebar />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <DashboardSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <main className="flex-1 bg-gradient-to-b from-background via-violet-50/25 to-sky-50/15 pb-10 dark:via-violet-950/15 dark:to-slate-950/30">
        <div className="mx-auto max-w-4xl space-y-6 p-3 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30">
                <Ticket className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Support tickets</h1>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                  Create a ticket or continue a conversation with our team.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-11 shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500 sm:self-start"
            >
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              New ticket
            </Button>
          </div>

          <Card className="overflow-hidden rounded-2xl border-border/60 shadow-md shadow-black/[0.04] dark:border-border/80 dark:shadow-black/25">
            <CardHeader className="space-y-4 border-b border-border/50 bg-card/80 pb-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="text-lg">Your tickets</CardTitle>
                <CardDescription className="mt-1">
                  {total} ticket{total !== 1 ? "s" : ""} total
                </CardDescription>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 w-full rounded-xl border-border/80 sm:w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-9 w-9 animate-spin text-violet-500" />
                </div>
              ) : tickets.length === 0 ? (
                <p className="py-14 text-center text-muted-foreground">
                  No tickets yet. Create one if you need help.
                </p>
              ) : (
                <ul className="space-y-2 sm:space-y-1">
                  {tickets.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => openDetail(t.id)}
                        className="flex min-h-[4.5rem] w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-violet-200/60 hover:bg-violet-500/[0.06] active:scale-[0.99] dark:hover:border-violet-500/20 dark:hover:bg-violet-500/10 sm:min-h-0 sm:rounded-xl sm:px-2 sm:py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-snug text-foreground">{t.subject}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatDate(t.created_at)}</span>
                            <Badge
                              variant="outline"
                              className={ticketPriorityBadgeCn(t.priority, "text-[10px] font-semibold sm:text-xs")}
                            >
                              {priorityLabels[t.priority as TicketPriority] || t.priority}
                            </Badge>
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={ticketStatusBadgeCn(t.status, "shrink-0 rounded-lg text-xs")}
                        >
                          {statusLabels[t.status as TicketStatus] || t.status}
                        </Badge>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {total > limit && (
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 rounded-xl border-border/80 sm:flex-none sm:px-8"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 rounded-xl border-border/80 sm:flex-none sm:px-8"
                    disabled={page * limit >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create ticket dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-2xl border-border/60 p-5 shadow-2xl sm:w-full sm:p-6">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl">New support ticket</DialogTitle>
            <DialogDescription>Describe your issue. We will respond as soon as we can.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={createForm.subject}
                onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Brief summary"
                maxLength={200}
                className="mt-2 h-11 rounded-xl border-border/80"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={createForm.message}
                onChange={(e) => setCreateForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Describe your issue in detail..."
                rows={5}
                maxLength={5000}
                className="mt-2 min-h-[140px] resize-none rounded-xl border-border/80 text-base sm:text-sm"
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={createForm.priority}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, priority: v as TicketPriority }))}
              >
                <SelectTrigger className="mt-2 h-11 rounded-xl border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl sm:w-auto"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 sm:w-auto sm:px-8"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket detail dialog */}
      <Dialog open={!!detailTicket} onOpenChange={(open) => !open && closeTicketDetail()}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border-border/60 p-0 shadow-2xl sm:w-full">
          {detailTicket ? (
            <>
              <div className="shrink-0 border-b border-border/60 bg-gradient-to-r from-violet-500/12 via-background to-sky-500/10 px-4 py-4 sm:px-6">
                <DialogHeader>
                  <div className="flex items-start gap-2 sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={closeTicketDetail}
                      className="h-10 w-10 shrink-0 rounded-xl border-border/80"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="pr-2 text-lg leading-snug">{detailTicket.subject}</DialogTitle>
                      <DialogDescription className="mt-2 flex flex-wrap items-center gap-2 text-foreground/80">
                        <Badge
                          variant="outline"
                          className={ticketStatusBadgeCn(detailTicket.status, "rounded-lg text-xs sm:text-sm")}
                        >
                          {statusLabels[detailTicket.status as TicketStatus]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={ticketPriorityBadgeCn(detailTicket.priority, "rounded-lg text-xs sm:text-sm")}
                        >
                          {priorityLabels[detailTicket.priority as TicketPriority]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">Created {formatDate(detailTicket.created_at)}</span>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="flex min-h-0 flex-1 flex-col border-t border-border/50">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 [-webkit-overflow-scrolling:touch] sm:py-4">
                  <div className="space-y-4 pr-0.5">
                      {(detailTicket.message || "").trim().length > 0 ? (
                        <div>
                          <p className="mb-2 text-xs font-medium text-muted-foreground">Your message</p>
                          <div className="rounded-2xl rounded-tl-md border border-slate-200/80 bg-slate-50/90 px-4 py-3.5 text-sm dark:border-slate-700/80 dark:bg-slate-900/60">
                            <p className="whitespace-pre-wrap leading-relaxed">{detailTicket.message}</p>
                          </div>
                        </div>
                      ) : null}
                      {publicThread.length > 0 && (
                        <>
                          <Separator className="bg-border/60" />
                          <div className="space-y-3">
                            {publicThread.map((m) => {
                              const fromYou = m.author_role === "user";
                              return (
                                <div key={m.id} className={cn("flex", fromYou ? "justify-start" : "justify-end")}>
                                  <div
                                    className={cn(
                                      "max-w-[min(92vw,36rem)] rounded-2xl px-4 py-3.5 text-sm shadow-md",
                                      fromYou
                                        ? "rounded-tl-md border border-slate-200/90 bg-white dark:border-slate-700 dark:bg-slate-800/90"
                                        : "rounded-tr-md border-0 bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25"
                                    )}
                                  >
                                    <p
                                      className={cn(
                                        "mb-1.5 text-xs",
                                        fromYou ? "text-muted-foreground" : "text-white/85"
                                      )}
                                    >
                                      {fromYou ? "You" : m.author_display || "Support"} · {formatDate(m.created_at)}
                                      {m._legacy ? " · earlier reply" : ""}
                                    </p>
                                    <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                      <p className="text-xs text-muted-foreground">Last updated {formatDate(detailTicket.updated_at)}</p>
                  </div>
                </div>

                <div className="shrink-0 border-t border-border/60 bg-muted/15 px-4 pb-4 pt-3 backdrop-blur-md dark:bg-muted/25">
                  <Label htmlFor="follow-up" className="text-sm font-medium">
                    Your reply
                  </Label>
                  <Textarea
                    id="follow-up"
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value.slice(0, 5000))}
                    placeholder="Add details or ask a follow-up question…"
                    className="mt-2 min-h-[88px] max-h-[min(32vh,220px)] resize-y overflow-y-auto rounded-xl border-border/80 text-base sm:text-sm"
                  />
                  <Button
                    type="button"
                    className="mt-3 h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
                    onClick={sendFollowUp}
                    disabled={followUpSending || !followUp.trim()}
                  >
                    {followUpSending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send reply
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Support;
