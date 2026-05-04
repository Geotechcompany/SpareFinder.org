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
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              Support tickets
            </h1>
            <p className="text-muted-foreground mt-1">
              Threaded replies, internal notes, and quick snippets. Run{" "}
              <code className="text-xs rounded bg-muted px-1">docs/sql/support_ticket_messages.sql</code> in
              Supabase if replies fail to save.
            </p>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">All tickets</CardTitle>
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
                {pagination.total} ticket{pagination.total !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton rows={10} columns={5} />
              ) : tickets.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">No tickets found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium max-w-[200px] truncate" title={t.subject}>
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
                        <TableCell className="text-muted-foreground text-sm">{formatDate(t.created_at)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openDetail(t.id)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {pagination.pages > 1 && (
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
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
        <DialogContent className="flex max-h-[min(90vh,880px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedTicket ? (
            <>
              <div className="border-b bg-muted/30 px-6 py-4">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="pr-8 text-lg">{selectedTicket.subject}</DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {selectedTicket.profile?.full_name || "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedTicket.profile?.email || "—"}
                    </span>
                    <Badge variant={statusVariants[selectedTicket.status as TicketStatus] || "secondary"}>
                      {statusLabels[selectedTicket.status as TicketStatus] || selectedTicket.status}
                    </Badge>
                    <span className="text-muted-foreground">{formatDate(selectedTicket.created_at)}</span>
                  </DialogDescription>
                </DialogHeader>
              </div>

              <ScrollArea className="max-h-[min(42vh,360px)] flex-1 px-6 py-4">
                <div className="space-y-4 pr-3">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Original request
                    </p>
                    <div
                      className={cn(
                        "rounded-2xl rounded-tl-md border bg-card px-4 py-3 text-sm shadow-sm",
                        "border-border"
                      )}
                    >
                      <p className="mb-1 text-xs text-muted-foreground">
                        {selectedTicket.profile?.full_name || "Customer"} · {formatDate(selectedTicket.created_at)}
                      </p>
                      <p className="whitespace-pre-wrap text-foreground">{selectedTicket.message}</p>
                    </div>
                  </div>

                  {threadItems.length > 0 && (
                    <>
                      <Separator />
                      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5" />
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
                                  "max-w-[92%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[85%]",
                                  internal &&
                                    "border border-amber-500/40 bg-amber-500/5 text-foreground dark:bg-amber-500/10",
                                  !internal &&
                                    isAdmin &&
                                    "rounded-tr-md border border-primary/25 bg-primary text-primary-foreground",
                                  !internal &&
                                    !isAdmin &&
                                    "rounded-tl-md border bg-muted/80 text-foreground"
                                )}
                              >
                                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs opacity-90">
                                  {internal && (
                                    <span className="inline-flex items-center gap-0.5 font-medium text-amber-700 dark:text-amber-400">
                                      <Lock className="h-3 w-3" />
                                      Internal
                                    </span>
                                  )}
                                  {m._legacy && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Legacy
                                    </Badge>
                                  )}
                                  <span>{m.author_display || (isAdmin ? "Support" : "Customer")}</span>
                                  <span className="text-muted-foreground">· {formatDate(m.created_at)}</span>
                                </div>
                                <p className="whitespace-pre-wrap">{m.body}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              <div className="space-y-3 border-t bg-background px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs text-muted-foreground">Ticket status</Label>
                    <Select value={editStatus} onValueChange={(v) => setEditStatus(v as TicketStatus)}>
                      <SelectTrigger className="w-full sm:w-[220px]">
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
                  <Button type="button" variant="secondary" size="sm" onClick={saveStatusOnly} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save status only"}
                  </Button>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Quick replies</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {QUICK_REPLIES.map((q, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto max-w-full whitespace-normal text-left text-xs font-normal"
                        onClick={() => applyQuickReply(q)}
                      >
                        {q.slice(0, 52)}
                        {q.length > 52 ? "…" : ""}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="internal-only"
                      checked={internalOnly}
                      onCheckedChange={(c) => setInternalOnly(!!c)}
                    />
                    <Label htmlFor="internal-only" className="cursor-pointer text-sm font-normal">
                      Internal note (hidden from customer)
                    </Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reply-draft" className="text-sm">
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
                    className="mt-2 resize-none"
                  />
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    {replyDraft.length} / {MAX_REPLY}
                  </p>
                </div>
              </div>

              <DialogFooter className="border-t bg-muted/20 px-6 py-3 sm:justify-between">
                <Button type="button" variant="ghost" onClick={() => setSelectedTicket(null)}>
                  Close
                </Button>
                <Button type="button" onClick={sendReply} disabled={sendingReply || !replyDraft.trim()}>
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
