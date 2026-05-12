import React, { useState } from "react";
import { motion } from "framer-motion";
import AdminDesktopSidebar from "@/components/AdminDesktopSidebar";
import {
  AdminPageHeader,
  AdminPageHeaderToolbar,
} from "@/components/admin/AdminPageHeader";
import { ADMIN_MOBILE_TOP_PADDING, useAdminMainMotion } from "@/lib/admin-layout";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { BellRing, Loader2, Send, Users } from "lucide-react";

const AdminAnnouncements = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const mainMotion = useAdminMainMotion(isCollapsed);
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "success" | "warning" | "error">(
    "info"
  );
  const [actionUrl, setActionUrl] = useState("");
  const [audience, setAudience] = useState<"customers" | "all">("customers");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Add a title and message before sending.",
      });
      return;
    }

    try {
      setSending(true);
      const res = await adminApi.broadcastAppNotifications({
        title: title.trim(),
        message: message.trim(),
        type,
        audience,
        action_url: actionUrl.trim() || undefined,
      });

      if (res.success && res.data) {
        const d = res.data as {
          recipient_count?: number;
          notifications_created?: number;
        };
        toast({
          title: "Notifications sent",
          description: `Delivered to ${d.recipient_count ?? 0} account(s).`,
        });
        setTitle("");
        setMessage("");
        setActionUrl("");
        setType("info");
        setAudience("customers");
      } else {
        toast({
          variant: "destructive",
          title: "Send failed",
          description: res.message || res.error || "Could not broadcast.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Send failed",
        description:
          err instanceof Error ? err.message : "Could not broadcast.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminDesktopSidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />
      <motion.main
        {...mainMotion}
        className={`flex-1 ${ADMIN_MOBILE_TOP_PADDING} px-3 pb-10 pt-4 sm:px-6 sm:pt-6 lg:px-8`}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <AdminPageHeader
            title="In-app announcements"
            description="Post a notification to user accounts. It appears in the bell menu and on the Notifications page."
            breadcrumbPage="Announcements"
            actions={
              <AdminPageHeaderToolbar>
                <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0 opacity-80" />
                  <span className="hidden sm:inline">Workspace users</span>
                </div>
              </AdminPageHeaderToolbar>
            }
          />

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BellRing className="h-5 w-5 text-violet-500" />
                Compose notification
              </CardTitle>
              <CardDescription>
                Customers excludes admin and super-admin profiles. Choose
                &quot;Everyone&quot; only when the whole team should see it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ann-audience">Audience</Label>
                    <Select
                      value={audience}
                      onValueChange={(v) =>
                        setAudience(v as "customers" | "all")
                      }
                    >
                      <SelectTrigger id="ann-audience" className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customers">
                          Customers (no admins)
                        </SelectItem>
                        <SelectItem value="all">Everyone with a profile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ann-type">Type</Label>
                    <Select
                      value={type}
                      onValueChange={(v) =>
                        setType(v as "info" | "success" | "warning" | "error")
                      }
                    >
                      <SelectTrigger id="ann-type" className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ann-title">Title</Label>
                  <Input
                    id="ann-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short headline"
                    maxLength={200}
                    className="rounded-xl"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ann-message">Message</Label>
                  <Textarea
                    id="ann-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What should users know?"
                    rows={5}
                    maxLength={5000}
                    className="min-h-[120px] rounded-xl resize-y"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ann-url">Link (optional)</Label>
                  <Input
                    id="ann-url"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="/dashboard/billing or https://…"
                    className="rounded-xl"
                    autoComplete="off"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={sending}
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-medium shadow-md hover:from-violet-700 hover:to-indigo-700 sm:w-auto sm:min-w-[160px]"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send to users
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </motion.main>
    </div>
  );
};

export default AdminAnnouncements;
