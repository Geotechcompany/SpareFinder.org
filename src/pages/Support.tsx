import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { Loader2, MessageSquarePlus, Ticket, ChevronRight, ArrowLeft } from "lucide-react";
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

interface TicketDetail extends TicketItem {
  message: string;
  admin_notes?: string | null;
}

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  answered: "Answered",
  closed: "Closed",
};

const statusVariant: Record<TicketStatus, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  in_progress: "secondary",
  answered: "outline",
  closed: "secondary",
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
  const [detailLoading, setDetailLoading] = useState(false);
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

  const openDetail = async (id: string) => {
    setDetailTicket(null);
    setDetailLoading(true);
    setFollowUp("");
    try {
      const res = await api.tickets.get(id);
      if (res?.success && res?.data) {
        setDetailTicket(res.data as TicketDetail);
      } else {
        toast.error("Failed to load ticket");
      }
    } catch (e) {
      toast.error("Failed to load ticket");
    } finally {
      setDetailLoading(false);
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
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <Ticket className="h-6 w-6" />
                Support tickets
              </h1>
              <p className="text-muted-foreground mt-1">
                Create a ticket for help or browse your previous requests.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="shrink-0">
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              New ticket
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">Your tickets</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
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
              </div>
              <CardDescription>
                {total} ticket{total !== 1 ? "s" : ""} total
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tickets.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">
                  No tickets yet. Create one if you need help.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {tickets.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => openDetail(t.id)}
                        className="w-full flex items-center gap-3 py-3 px-1 text-left hover:bg-muted/50 rounded-md transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{t.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(t.created_at)} · {priorityLabels[t.priority as TicketPriority] || t.priority}
                          </p>
                        </div>
                        <Badge variant={statusVariant[t.status as TicketStatus] || "secondary"}>
                          {statusLabels[t.status as TicketStatus] || t.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {total > limit && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New support ticket</DialogTitle>
            <DialogDescription>
              Describe your issue. We'll respond as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={createForm.subject}
                onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Brief summary"
                maxLength={200}
                className="mt-1"
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
                className="mt-1"
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={createForm.priority}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, priority: v as TicketPriority }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket detail dialog */}
      <Dialog open={!!detailTicket || detailLoading} onOpenChange={(open) => !open && setDetailTicket(null)}>
        <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : detailTicket ? (
            <>
              <div className="border-b px-6 py-4">
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDetailTicket(null)}
                      className="shrink-0"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="truncate pr-2">{detailTicket.subject}</DialogTitle>
                      <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant[detailTicket.status as TicketStatus]}>
                          {statusLabels[detailTicket.status as TicketStatus]}
                        </Badge>
                        <span>{priorityLabels[detailTicket.priority as TicketPriority]}</span>
                        <span className="text-muted-foreground">Created {formatDate(detailTicket.created_at)}</span>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <ScrollArea className="max-h-[min(40vh,320px)] flex-1 px-6 py-4">
                <div className="space-y-4 pr-3">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Your message</p>
                    <div className="rounded-2xl rounded-tl-md border bg-muted/40 px-4 py-3 text-sm">
                      <p className="whitespace-pre-wrap">{detailTicket.message}</p>
                    </div>
                  </div>
                  {publicThread.length > 0 && (
                    <>
                      <Separator />
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Thread</p>
                      <div className="space-y-3">
                        {publicThread.map((m) => {
                          const fromYou = m.author_role === "user";
                          return (
                            <div key={m.id} className={cn("flex", fromYou ? "justify-start" : "justify-end")}>
                              <div
                                className={cn(
                                  "max-w-[90%] rounded-2xl px-4 py-3 text-sm",
                                  fromYou
                                    ? "rounded-tl-md border bg-muted/60"
                                    : "rounded-tr-md border border-primary/25 bg-primary text-primary-foreground"
                                )}
                              >
                                <p className="mb-1 text-xs opacity-80">
                                  {fromYou ? "You" : m.author_display || "Support"} · {formatDate(m.created_at)}
                                  {m._legacy ? " · earlier reply" : ""}
                                </p>
                                <p className="whitespace-pre-wrap">{m.body}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">Last updated {formatDate(detailTicket.updated_at)}</p>
                </div>
              </ScrollArea>

              <div className="border-t bg-muted/20 px-6 py-4">
                <Label htmlFor="follow-up" className="text-sm">
                  Add a reply
                </Label>
                <Textarea
                  id="follow-up"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value.slice(0, 5000))}
                  placeholder="Add details or ask a follow-up question…"
                  rows={3}
                  className="mt-2 resize-none"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={sendFollowUp}
                    disabled={followUpSending || !followUp.trim()}
                  >
                    {followUpSending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send
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
