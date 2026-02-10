import React, { useState, useEffect, useCallback } from "react";
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
import { api } from "@/lib/api";
import AdminDesktopSidebar from "@/components/AdminDesktopSidebar";
import { TableSkeleton } from "@/components/skeletons";
import { Loader2, Ticket, Mail, User } from "lucide-react";
import { toast } from "sonner";

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

interface TicketDetail extends TicketRow {
  message: string;
  admin_notes?: string | null;
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

const TicketManagement = () => {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editStatus, setEditStatus] = useState<TicketStatus | "">("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.admin.getTickets(
        pagination.page,
        pagination.limit,
        statusFilter === "all" ? undefined : statusFilter
      );
      const data = res?.data as { tickets?: TicketRow[]; pagination?: { total: number; page: number; limit: number; pages: number } } | undefined;
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

  const openDetail = async (id: string) => {
    setSelectedTicket(null);
    setDetailLoading(true);
    setEditStatus("");
    setEditNotes("");
    try {
      const res = await api.admin.getTicket(id);
      const data = res?.data as TicketDetail | undefined;
      if (res?.success && data) {
        setSelectedTicket(data);
        setEditStatus(data.status as TicketStatus);
        setEditNotes(data.admin_notes || "");
      } else {
        toast.error("Failed to load ticket");
      }
    } catch (e) {
      toast.error("Failed to load ticket");
    } finally {
      setDetailLoading(false);
    }
  };

  const saveTicket = async () => {
    if (!selectedTicket) return;
    setSaving(true);
    try {
      const res = await api.admin.updateTicket(selectedTicket.id, {
        status: editStatus || undefined,
        admin_notes: editNotes,
      });
      if (res?.success) {
        toast.success("Ticket updated");
        setSelectedTicket((t) => (t ? { ...t, status: (editStatus as TicketStatus) || t.status, admin_notes: editNotes } : null));
        fetchTickets();
      } else {
        toast.error(res?.message || "Failed to update ticket");
      }
    } catch (e) {
      toast.error("Failed to update ticket");
    } finally {
      setSaving(false);
    }
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
              View and manage user support tickets. New tickets trigger an email to the admin address.
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

      {/* Ticket detail / edit dialog */}
      <Dialog open={!!selectedTicket || detailLoading} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-xl">
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedTicket ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTicket.subject}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3" />
                    {selectedTicket.profile?.full_name || "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3" />
                    {selectedTicket.profile?.email || "—"}
                  </span>
                  <span>{formatDate(selectedTicket.created_at)}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">User message</p>
                  <p className="text-sm whitespace-pre-wrap rounded-md bg-muted/50 p-3">{selectedTicket.message}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editStatus}
                    onValueChange={(v) => setEditStatus(v as TicketStatus)}
                  >
                    <SelectTrigger className="mt-1">
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
                <div>
                  <Label>Admin notes / response (visible to user)</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add a response or internal notes..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                  Close
                </Button>
                <Button onClick={saveTicket} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save changes
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
