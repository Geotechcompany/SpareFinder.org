import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import AdminDesktopSidebar from "@/components/AdminDesktopSidebar";
import { TableSkeleton } from "@/components/skeletons";
import {
  Loader2,
  Ticket,
  Mail,
  User,
  Send,
  Lock,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TicketStatus = "open" | "in_progress" | "answered" | "closed";

interface TicketRow {
  id: string;
  user_id: string;
  subject: string;
  status: TicketStatus;
  priority: string;
  created_at: string;
  updated_at: string;
  profile?: { email?: string; full_name?: string; company?: string };
}

interface TicketMessage {
  id: string;
  body: string;
  is_internal?: boolean;
  author_role?: string;
  author_display?: string | null;
  created_at: string;
  _legacy?: boolean;
}

interface TicketDetail extends TicketRow {
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

const statusVariants: Record<TicketStatus, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  in_progress: "secondary",
  answered: "outline",
  closed: "secondary",
};

const QUICK_REPLIES = [
  "Thanks for reaching out — we're reviewing this and will update you shortly.",
  "Could you share a part number, photo, or any error message you are seeing?",
  "We believe this is resolved on our side. Please try again and let us know if anything still fails.",
  "I've updated your account; you may need to sign out and back in to see the change.",
];

const MAX_REPLY = 10000;

const TicketManagement = () => {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editStatus, setEditStatus] = useState<TicketStatus | "">("");
  const [replyDraft, setReplyDraft] = useState("");
  const [internalOnly, setInternalOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.admin.getTickets(
        pagination.page,
        pagination.limit,
        statusFilter === "all" ? undefined : statusFilter
      );
      const data = res?.data as
        | {
            tickets?: TicketRow[];
            pagination?: { total: number; page: number; limit: number; pages: number };
          }
        | undefined;
      if (res?.success && data) {
        setTickets(data.tickets || []);
        if (data.pagination) {
          setPagination((p) => ({
            ...p,
            total: data.pagination!.total,
            pages: data.pagination!.pages,
          }));
        }
      } else {
        toast.error("Failed to load tickets");
      }
    } catch (e) {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const reloadTicketDetail = async (id: string) => {
    const res = await api.admin.getTicket(id);
    const data = res?.data as TicketDetail | undefined;
    if (res?.success && data) {
      setSelectedTicket(data);
      setEditStatus(data.status as TicketStatus);
    }
  };

  const openDetail = async (id: string) => {
    setSelectedTicket(null);
    setDetailLoading(true);
    setEditStatus("");
    setReplyDraft("");
    setInternalOnly(false);
    try {
      const res = await api.admin.getTicket(id);
      const data = res?.data as TicketDetail | undefined;
      if (res?.success && data) {
        setSelectedTicket(data);
        setEditStatus(data.status as TicketStatus);
      } else {
        toast.error("Failed to load ticket");
      }
    } catch (e) {
      toast.error("Failed to load ticket");
    } finally {
      setDetailLoading(false);
    }
  };

  const threadItems = useMemo(() => {
    if (!selectedTicket) return [];
    const msgs = [...(selectedTicket.messages || [])];
    const legacy = (selectedTicket.admin_notes || "").trim();
    if (
      legacy &&
      !msgs.some((m) => !(m as TicketMessage).is_internal && (m.body || "").trim() === legacy)
    ) {
      msgs.push({
        id: `legacy-${selectedTicket.id}`,
        body: legacy,
        is_internal: false,
        author_role: "admin",
        author_display: "Support",
        created_at: selectedTicket.updated_at,
        _legacy: true,
      });
    }
    return msgs.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [selectedTicket]);

  const saveStatusOnly = async () => {
    if (!selectedTicket) return;
    setSaving(true);
    try {
      const res = await api.admin.updateTicket(selectedTicket.id, {
        status: editStatus || undefined,
      });
      if (res?.success) {
        toast.success("Status updated");
        setSelectedTicket((t) =>
          t ? { ...t, status: (editStatus as TicketStatus) || t.status } : null
        );
        fetchTickets();
      } else {
        toast.error(res?.message || "Failed to update status");
      }
    } catch (e) {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async () => {
    if (!selectedTicket) return;
    const body = replyDraft.trim();
    if (!body) {
      toast.error("Write a message before sending");
      return;
    }
    setSendingReply(true);
    try {
      const res = await api.admin.postTicketMessage(selectedTicket.id, {
        body,
        is_internal: internalOnly,
        set_status: internalOnly ? undefined : editStatus || undefined,
      });
      if (res?.success) {
        toast.success(internalOnly ? "Internal note saved" : "Reply sent");
        setReplyDraft("");
        await reloadTicketDetail(selectedTicket.id);
        fetchTickets();
      } else {
        toast.error(res?.message || "Failed to send reply");
      }
    } catch (e) {
      toast.error("Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const applyQuickReply = (text: string) => {
    setReplyDraft((prev) => (prev ? `${prev.trim()}\n\n${text}` : text));
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    } catch {
      return s;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <AdminDesktopSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <main className="flex-1 bg-gradient-to-b from-background via-violet-50/30 to-sky-50/20 pb-10 dark:via-violet-950/20 dark:to-slate-950/40">
        <div className="mx-auto max-w-6xl space-y-6 p-3 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Support tickets</h1>
                </div>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden rounded-2xl border-border/60 shadow-md shadow-black/[0.04] dark:border-border/80 dark:shadow-black/30">
            <CardHeader className="space-y-4 border-b border-border/50 bg-card/80 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="text-lg">All tickets</CardTitle>
                <CardDescription className="mt-1">
                  {pagination.total} ticket{pagination.total !== 1 ? "s" : ""}
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
                <TableSkeleton rows={10} columns={5} />
              ) : tickets.length === 0 ? (
                <p className="py-14 text-center text-muted-foreground">No tickets found.</p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {tickets.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm transition active:scale-[0.99]"
                      >
                        <p className="font-medium leading-snug text-foreground">{t.subject}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t.profile?.full_name || "—"} · {t.profile?.email}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant={statusVariants[t.status as TicketStatus] || "secondary"}>
                            {statusLabels[t.status as TicketStatus] || t.status}
                          </Badge>
                          <span className="text-xs capitalize text-muted-foreground">{t.priority}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(t.created_at)}</span>
                        </div>
                        <Button
                          type="button"
                          className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500"
                          onClick={() => openDetail(t.id)}
                        >
                          Open thread
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-xl border border-border/40 md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Subject</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="w-[100px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tickets.map((t) => (
                          <TableRow key={t.id} className="group">
                            <TableCell className="max-w-[220px] truncate font-medium" title={t.subject}>
                              {t.subject}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm">{t.profile?.full_name || "—"}</span>
                                <span className="text-xs text-muted-foreground">{t.profile?.email || ""}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariants[t.status as TicketStatus] || "secondary"}>
                                {statusLabels[t.status as TicketStatus] || t.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">{t.priority}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg text-violet-600 hover:bg-violet-500/10 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                                onClick={() => openDetail(t.id)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
              {pagination.pages > 1 && (
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-11 flex-1 rounded-xl border-border/80 sm:flex-none sm:px-6"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-11 flex-1 rounded-xl border-border/80 sm:flex-none sm:px-6"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!selectedTicket || detailLoading} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="flex h-[min(92dvh,880px)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-border/60 p-0 shadow-2xl sm:h-auto sm:max-h-[min(90vh,880px)] sm:w-full">
          {detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-9 w-9 animate-spin text-violet-500" />
            </div>
          ) : selectedTicket ? (
            <>
              <div className="border-b border-border/60 bg-gradient-to-r from-violet-500/12 via-background to-sky-500/10 px-4 py-4 sm:px-6">
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="pr-8 text-lg leading-snug sm:text-xl">{selectedTicket.subject}</DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-2 text-foreground/80">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      {selectedTicket.profile?.full_name || "—"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      {selectedTicket.profile?.email || "—"}
                    </span>
                    <Badge
                      variant={statusVariants[selectedTicket.status as TicketStatus] || "secondary"}
                      className="rounded-lg"
                    >
                      {statusLabels[selectedTicket.status as TicketStatus] || selectedTicket.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{formatDate(selectedTicket.created_at)}</span>
                  </DialogDescription>
                </DialogHeader>
              </div>

              <ScrollArea className="min-h-0 flex-1 px-4 py-4 sm:max-h-[min(42vh,380px)] sm:px-6">
                <div className="space-y-4 pr-2 sm:pr-3">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5 text-violet-500" />
                      Original request
                    </p>
                    <div
                      className={cn(
                        "rounded-2xl rounded-tl-md border border-slate-200/80 bg-slate-50/90 px-4 py-3.5 text-sm shadow-sm",
                        "dark:border-slate-700/80 dark:bg-slate-900/60"
                      )}
                    >
                      <p className="mb-1.5 text-xs text-muted-foreground">
                        {selectedTicket.profile?.full_name || "Customer"} · {formatDate(selectedTicket.created_at)}
                      </p>
                      <p className="whitespace-pre-wrap text-foreground">{selectedTicket.message}</p>
                    </div>
                  </div>

                  {threadItems.length > 0 && (
                    <>
                      <Separator className="bg-border/60" />
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                        Conversation
                      </p>
                      <div className="space-y-3">
                        {threadItems.map((m) => {
                          const isAdmin = m.author_role === "admin";
                          const internal = !!m.is_internal;
                          return (
                            <div
                              key={m.id}
                              className={cn("flex", isAdmin && !internal ? "justify-end" : "justify-start")}
                            >
                              <div
                                className={cn(
                                  "max-w-[min(92vw,100%)] rounded-2xl px-4 py-3.5 text-sm shadow-md sm:max-w-[85%]",
                                  internal &&
                                    "border border-amber-400/50 bg-amber-50/90 text-amber-950 shadow-amber-500/10 dark:border-amber-500/35 dark:bg-amber-950/30 dark:text-amber-50",
                                  !internal &&
                                    isAdmin &&
                                    "rounded-tr-md border-0 bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25",
                                  !internal &&
                                    !isAdmin &&
                                    "rounded-tl-md border border-slate-200/90 bg-white text-foreground dark:border-slate-700 dark:bg-slate-800/90"
                                )}
                              >
                                <div
                                  className={cn(
                                    "mb-1.5 flex flex-wrap items-center gap-2 text-xs",
                                    !internal && isAdmin ? "text-white/90" : "opacity-90"
                                  )}
                                >
                                  {internal && (
                                    <span className="inline-flex items-center gap-0.5 font-semibold text-amber-800 dark:text-amber-300">
                                      <Lock className="h-3 w-3" />
                                      Internal
                                    </span>
                                  )}
                                  {m._legacy && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px]",
                                        !internal && isAdmin
                                          ? "border-white/40 bg-white/15 text-white"
                                          : "border-amber-800/30 text-amber-900 dark:border-amber-400/40 dark:text-amber-100"
                                      )}
                                    >
                                      Legacy
                                    </Badge>
                                  )}
                                  <span
                                    className={cn(
                                      "font-medium",
                                      internal && "text-amber-900 dark:text-amber-100",
                                      !internal && isAdmin && "text-white",
                                      !internal && !isAdmin && "text-foreground"
                                    )}
                                  >
                                    {m.author_display || (isAdmin ? "Support" : "Customer")}
                                  </span>
                                  <span
                                    className={cn(
                                      !internal && isAdmin ? "text-white/75" : "text-muted-foreground"
                                    )}
                                  >
                                    · {formatDate(m.created_at)}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              <div className="space-y-4 border-t border-border/60 bg-muted/20 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Ticket status</Label>
                    <Select value={editStatus} onValueChange={(v) => setEditStatus(v as TicketStatus)}>
                      <SelectTrigger className="h-11 w-full rounded-xl border-border/80 sm:w-[240px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="answered">Answered</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full shrink-0 rounded-xl border-border/80 sm:w-auto sm:px-5"
                    onClick={saveStatusOnly}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save status only"}
                  </Button>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Quick replies</Label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {QUICK_REPLIES.map((q, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant="outline"
                        className="h-auto min-h-10 w-full justify-start rounded-xl border-violet-200/70 bg-violet-500/[0.06] px-3 py-2.5 text-left text-xs font-normal text-foreground transition-colors hover:bg-violet-500/10 dark:border-violet-500/25 dark:bg-violet-500/10 dark:hover:bg-violet-500/15 sm:w-auto sm:max-w-[280px]"
                        onClick={() => applyQuickReply(q)}
                      >
                        <span className="line-clamp-2">{q}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-3 sm:items-center">
                  <Switch
                    id="internal-only"
                    checked={internalOnly}
                    onCheckedChange={(c) => setInternalOnly(!!c)}
                    className="mt-0.5 shrink-0 sm:mt-0"
                  />
                  <Label htmlFor="internal-only" className="cursor-pointer text-sm font-normal leading-snug">
                    Internal note (hidden from customer)
                  </Label>
                </div>

                <div>
                  <Label htmlFor="reply-draft" className="text-sm font-medium">
                    {internalOnly ? "Internal note" : "Reply to customer"}
                  </Label>
                  <Textarea
                    id="reply-draft"
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value.slice(0, MAX_REPLY))}
                    placeholder={
                      internalOnly
                        ? "Visible only to your team…"
                        : "Write a helpful reply. It will appear in the customer's ticket view."
                    }
                    rows={4}
                    className="mt-2 min-h-[120px] resize-none rounded-xl border-border/80 text-base sm:text-sm"
                  />
                  <p className="mt-1.5 text-right text-xs text-muted-foreground">
                    {replyDraft.length} / {MAX_REPLY}
                  </p>
                </div>
              </div>

              <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-xl sm:w-auto sm:min-w-[120px]"
                  onClick={() => setSelectedTicket(null)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  disabled={sendingReply || !replyDraft.trim()}
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 sm:w-auto sm:min-w-[160px]"
                  onClick={sendReply}
                >
                  {sendingReply ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {internalOnly ? "Save note" : "Send reply"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketManagement;
