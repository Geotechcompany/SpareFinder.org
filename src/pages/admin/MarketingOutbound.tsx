import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import AdminDesktopSidebar from "@/components/AdminDesktopSidebar";
import { ADMIN_MOBILE_TOP_PADDING, useAdminMainMotion } from "@/lib/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api";
import { MARKETING_SERP_COUNTRIES, marketingCountryLabel } from "@/lib/marketingCountries";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  Megaphone,
  RefreshCw,
  Upload,
  Search,
  Mail,
  AlertCircle,
  Trash2,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

/** Aligns with ai-analysis-crew `marketing_rules` (valid + non-disposable). */
const DISPOSABLE_MARKETING_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "trashmail.com",
]);

const MARKETING_LEAD_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function leadRowHasUsableEmail(email: unknown): boolean {
  const e = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!e || !MARKETING_LEAD_EMAIL_RE.test(e)) return false;
  const domain = e.split("@").pop() || "";
  return !DISPOSABLE_MARKETING_EMAIL_DOMAINS.has(domain);
}

type Campaign = {
  id: string;
  name: string;
  slug: string;
  is_paused: boolean;
  priority: number;
  subject_template?: string;
  html_template?: string;
  use_ai?: boolean;
  use_crew_ai?: boolean;
};

const MarketingOutbound: React.FC = () => {
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const mainMotion = useAdminMainMotion(isCollapsed);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<unknown[]>([]);
  const [sends, setSends] = useState<unknown[]>([]);
  const [errors, setErrors] = useState<unknown[]>([]);
  const [settingsText, setSettingsText] = useState("");
  const [serpApiKey, setSerpApiKey] = useState("");
  const [serpCountryCode, setSerpCountryCode] = useState("");
  const [serpHl, setSerpHl] = useState("en");
  const [leadCountryFilter, setLeadCountryFilter] = useState<string>("all");
  const [aiQueriesLoading, setAiQueriesLoading] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("Outbound — industrial buyers");
  const [aiGoal, setAiGoal] = useState("Reach maintenance and procurement teams that struggle with parts identification and sourcing delays.");
  const [aiAudience, setAiAudience] = useState("Maintenance managers, procurement leads, operations teams");
  const [aiTone, setAiTone] = useState("Professional, concise, problem-solution focused");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [csvImportStatus, setCsvImportStatus] = useState<string | null>(null);
  const [csvRunSanitize, setCsvRunSanitize] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, camps, ld, sn, err, setRes] = await Promise.all([
        adminApi.getMarketingDashboard(),
        adminApi.getMarketingCampaigns(),
        adminApi.getMarketingLeads({
          page: 1,
          limit: 50,
          country_code: leadCountryFilter,
        }),
        adminApi.getMarketingSends({ page: 1, limit: 50 }),
        adminApi.getMarketingErrors({ page: 1, limit: 50 }),
        adminApi.getMarketingSettings(),
      ]);
      if (dash.success && dash.data) setDashboard(dash.data as Record<string, unknown>);
      const campPayload = (camps.data as { campaigns?: Campaign[] })?.campaigns;
      setCampaigns(Array.isArray(campPayload) ? campPayload : []);
      const leadPayload = (ld.data as { leads?: unknown[] })?.leads;
      setLeads(Array.isArray(leadPayload) ? leadPayload : []);
      const sendPayload = (sn.data as { sends?: unknown[] })?.sends;
      setSends(Array.isArray(sendPayload) ? sendPayload : []);
      const errPayload = (err.data as { errors?: unknown[] })?.errors;
      setErrors(Array.isArray(errPayload) ? errPayload : []);
      const st = (setRes.data as {
        settings?: {
          serp_query_templates?: string[];
          serpapi_key?: string;
          serp_target_country_code?: string;
          serp_target_hl?: string;
        };
      })?.settings;
      const templates = st?.serp_query_templates;
      setSettingsText(Array.isArray(templates) ? templates.join("\n") : "");
      setSerpApiKey(st?.serpapi_key || "");
      setSerpCountryCode((st?.serp_target_country_code || "").toLowerCase());
      setSerpHl((st?.serp_target_hl || "en").toLowerCase() || "en");
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Load failed",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, leadCountryFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCreateCampaign = async () => {
    const res = await adminApi.createMarketingCampaign({
      name: newCampaignName || "New campaign",
      is_paused: true,
    });
    if (res.success) {
      toast({ title: "Campaign created", description: "Paused by default — edit before activating." });
      loadAll();
    } else {
      toast({
        variant: "destructive",
        title: "Create failed",
        description: (res as { message?: string }).message || "Error",
      });
    }
  };

  const toggleCampaign = async (c: Campaign) => {
    const res = await adminApi.patchMarketingCampaign(c.id, { is_paused: !c.is_paused });
    if (res.success) {
      toast({ title: c.is_paused ? "Activated" : "Paused" });
      loadAll();
    }
  };

  const handleCsv = async (file: File | null, campaignId?: string) => {
    if (!file) return;
    setIsImportingCsv(true);
    setCsvImportStatus(`Importing ${file.name}... this can take time for large CSV files.`);
    try {
      const res = await adminApi.importMarketingCsv(file, {
        campaign_id: campaignId,
        run_sanitize: csvRunSanitize,
      });
      if (res.success) {
        const data = res.data as { imported?: number };
        setCsvImportStatus(`Import complete. Upserted ${data?.imported ?? 0} rows.`);
        toast({ title: "Import complete", description: `Upserted ${data?.imported ?? 0} rows` });
        loadAll();
      } else {
        setCsvImportStatus("Import failed.");
        toast({ variant: "destructive", title: "Import failed", description: res.message || res.error });
      }
    } catch (error) {
      setCsvImportStatus("Import timed out or failed. Try disabling sanitize-on-import for faster import.");
      toast({
        variant: "destructive",
        title: "Import request failed",
        description: error instanceof Error ? error.message : "Timeout or network error",
      });
    } finally {
      setIsImportingCsv(false);
    }
  };

  const saveSerpTemplates = async () => {
    const lines = settingsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await adminApi.patchMarketingSettings({
      serp_query_templates: lines,
      serp_results_per_query: 10,
      serpapi_key: serpApiKey.trim(),
      serp_target_country_code: serpCountryCode.trim().toLowerCase(),
      serp_target_hl: serpHl.trim().toLowerCase() || "en",
      google_search_provider: "serper",
    });
    if (res.success) toast({ title: "Discovery settings saved" });
    else toast({ variant: "destructive", title: "Save failed" });
  };

  const handleAiGenerateSerpQueries = async () => {
    setAiQueriesLoading(true);
    try {
      const cc = serpCountryCode.trim().toLowerCase();
      const res = await adminApi.generateMarketingSerpQueriesAi({
        country_code: cc,
        country_name: cc ? marketingCountryLabel(cc) : "Global",
        count: 8,
        extra_context: "SpareFinder B2B outbound; industrial spare parts, MRO, procurement.",
      });
      if (res.success) {
        const qs = (res.data as { queries?: string[] })?.queries;
        if (Array.isArray(qs) && qs.length) {
          setSettingsText((prev) => {
            const base = prev.trim();
            const add = qs.join("\n");
            return base ? `${base}\n${add}` : add;
          });
          toast({
            title: "Queries generated",
            description: `${qs.length} lines added to the editor. Review, edit, then Save queries.`,
          });
        } else {
          toast({ variant: "destructive", title: "No queries returned", description: "Try again." });
        }
      } else {
        toast({
          variant: "destructive",
          title: "AI query generation failed",
          description: (res as { message?: string }).message || "Error",
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "AI query generation failed",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setAiQueriesLoading(false);
    }
  };

  const handleAiCampaignCreate = async () => {
    const res = await adminApi.generateMarketingCampaignWithAi({
      campaign_goal: aiGoal.trim(),
      audience: aiAudience.trim(),
      tone: aiTone.trim(),
      use_ai: true,
      use_crew_ai: false,
    });
    if (res.success) {
      toast({ title: "AI campaign generated", description: "Created as paused. Review and activate when ready." });
      loadAll();
      return;
    }
    toast({
      variant: "destructive",
      title: "AI generation failed",
      description: res.message || res.error || "Unknown error",
    });
  };

  const runDiscover = async () => {
    const lines = settingsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const gl = serpCountryCode.trim().toLowerCase() || undefined;
    const hl = serpHl.trim().toLowerCase() || undefined;
    const keyTrim = serpApiKey.trim();
    const res = await adminApi.discoverMarketingSerp({
      max_queries: 3,
      campaign_id: null,
      queries: lines.length ? lines : undefined,
      gl: gl || null,
      hl: hl || null,
      google_search_provider: "serper",
      ...(keyTrim ? { serpapi_key: keyTrim } : {}),
    });
    if (res.success) {
      const data = res.data as {
        candidates_upserted?: number;
        errors?: string[];
        per_query?: {
          query: string;
          organic_count: number;
          candidates_seen?: number;
          candidates_stored?: number;
          candidates?: number;
        }[];
      };
      const n = data?.candidates_upserted ?? 0;
      const errLines = (data?.errors || []).filter(Boolean);
      const pq = data?.per_query?.length
        ? ` ${data.per_query
            .map((p) => {
              const org = p.organic_count ?? 0;
              const seen = p.candidates_seen ?? p.candidates ?? 0;
              const stored = p.candidates_stored ?? 0;
              return `${org} organic → ${stored} saved (valid email; ${seen} scanned)`;
            })
            .join("; ")}.`
        : "";
      toast({
        title: "Discovery run",
        description:
          errLines.length && !n
            ? `${errLines.slice(0, 2).join(" ")}${pq}`
            : `Upserted ${n} candidate(s).${errLines.length ? ` Notes: ${errLines[0]}` : ""}${pq}`,
      });
      loadAll();
    } else {
      toast({ variant: "destructive", title: "Discover failed", description: res.message });
    }
  };

  const handleTestSend = async (campaignId: string, to: string) => {
    const res = await adminApi.testMarketingEmail({ campaign_id: campaignId, to_email: to });
    if (res.success) toast({ title: "Test email sent" });
    else toast({ variant: "destructive", title: "Send failed", description: res.message });
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((x) => x !== leadId) : [...prev, leadId]
    );
  };

  const toggleAllLeadsOnPage = () => {
    const leadIds = (leads as Record<string, string>[]).map((l) => l.id).filter(Boolean);
    if (!leadIds.length) return;
    setSelectedLeadIds((prev) =>
      leadIds.every((id) => prev.includes(id)) ? prev.filter((id) => !leadIds.includes(id)) : Array.from(new Set([...prev, ...leadIds]))
    );
  };

  const runBulkDelete = async () => {
    if (!selectedLeadIds.length) return;
    const confirmed = window.confirm(`Delete ${selectedLeadIds.length} selected leads? This cannot be undone.`);
    if (!confirmed) return;
    const res = await adminApi.bulkManageMarketingLeads({
      ids: selectedLeadIds,
      action: "delete",
    });
    if (res.success) {
      toast({ title: "Leads deleted", description: `${selectedLeadIds.length} lead(s) removed.` });
      setSelectedLeadIds([]);
      loadAll();
    } else {
      toast({ variant: "destructive", title: "Bulk delete failed", description: res.message || res.error });
    }
  };

  const runBulkUpdate = async (field: "sanitization_status" | "lead_status_internal" | "campaign_id") => {
    if (!selectedLeadIds.length) return;
    let idsForUpdate = [...selectedLeadIds];
    let didPruneNoEmailForSanitize = false;

    if (field === "sanitization_status") {
      const rows = (leads as Record<string, unknown>[]).filter((r) => idsForUpdate.includes(String(r.id)));
      const noEmailIds = rows.filter((r) => !leadRowHasUsableEmail(r.email)).map((r) => String(r.id));
      if (noEmailIds.length) {
        const ok = window.confirm(
          `Remove ${noEmailIds.length} selected lead(s) with no valid email (or disposable domain), then set status for the rest?`
        );
        if (!ok) return;
        const delRes = await adminApi.bulkManageMarketingLeads({ ids: noEmailIds, action: "delete" });
        if (!delRes.success) {
          toast({
            variant: "destructive",
            title: "Could not remove no-email leads",
            description: delRes.message || delRes.error || "Delete failed",
          });
          return;
        }
        didPruneNoEmailForSanitize = true;
        idsForUpdate = idsForUpdate.filter((id) => !noEmailIds.includes(id));
        setSelectedLeadIds(idsForUpdate);
        toast({ title: "Removed no-email leads", description: `${noEmailIds.length} deleted from selection.` });
        if (!idsForUpdate.length) {
          loadAll();
          return;
        }
      }
    }

    let value = "";
    if (field === "sanitization_status") {
      value = window.prompt("Set sanitization status: accepted | review | rejected", "accepted") || "";
    } else if (field === "lead_status_internal") {
      value = window.prompt("Set lead status: pending | sent | bounced | opt_out | skipped", "pending") || "";
    } else {
      value = window.prompt("Set campaign UUID (leave blank to clear)", "") ?? "";
    }
    if (value === "") {
      if (field !== "campaign_id") {
        if (didPruneNoEmailForSanitize) loadAll();
        return;
      }
    }
    const payload: Record<string, unknown> = { [field]: field === "campaign_id" ? value || null : value };
    const res = await adminApi.bulkManageMarketingLeads({
      ids: idsForUpdate,
      action: "update",
      payload,
    });
    if (res.success) {
      toast({ title: "Bulk update applied", description: `${idsForUpdate.length} lead(s) updated.` });
      loadAll();
    } else {
      toast({ variant: "destructive", title: "Bulk update failed", description: res.message || res.error });
    }
  };

  const cronBase = `${String(API_BASE_URL || "").replace(/\/$/, "")}/api`;

  return (
    <div className="flex min-h-screen bg-background">
      <AdminDesktopSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <motion.main
        initial={false}
        animate={mainMotion}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`flex-1 overflow-auto p-4 sm:p-6 md:p-10 ${ADMIN_MOBILE_TOP_PADDING}`}
      >
        <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:text-3xl">
                <Megaphone className="h-8 w-8 text-primary" />
                Marketing outbound
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base break-words">
                Campaigns, leads, Google discovery (Serper), send logs. Cron URLs are documented in{" "}
                <code className="text-xs bg-muted px-1 rounded break-all">docs/MARKETING_CRON.md</code>.
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-auto" onClick={() => loadAll()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>

          {loading && !dashboard ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="flex h-auto w-full min-w-0 flex-nowrap justify-start gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="import">CSV import</TabsTrigger>
                <TabsTrigger value="serp">Google discovery</TabsTrigger>
                <TabsTrigger value="logs">Send log</TabsTrigger>
                <TabsTrigger value="errors">Errors</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    [
                      ["Leads (total)", dashboard?.leads_total],
                      ["Pending send", dashboard?.leads_pending_send],
                      ["Needs review", dashboard?.leads_needs_review],
                      ["Sends today (UTC)", dashboard?.sends_today],
                      ["Failed today", dashboard?.failed_today],
                    ] as [string, unknown][]
                  ).map(([label, val]) => (
                    <Card key={label}>
                      <CardHeader className="pb-2">
                        <CardDescription>{label}</CardDescription>
                        <CardTitle className="text-3xl">{String(val ?? "—")}</CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-4">{String(dashboard?.timezone_note || "")}</p>
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Cron setup guide</CardTitle>
                    <CardDescription>
                      Configure these URLs in cron-job.org (or any scheduler). These routes are public by design.
                      Protect at network edge with IP allowlist/WAF where possible.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded border p-3">
                      <p className="font-medium">1) Send batch</p>
                      <p className="text-muted-foreground mb-1">Runs outbound sends for active campaigns.</p>
                      <code className="block text-xs break-all">{cronBase}/cron/marketing-send?limit=20</code>
                    </div>
                    <div className="rounded border p-3">
                      <p className="font-medium">2) Daily digest</p>
                      <p className="text-muted-foreground mb-1">Sends yesterday summary to admin emails.</p>
                      <code className="block text-xs break-all">{cronBase}/cron/marketing-digest</code>
                    </div>
                    <div className="rounded border p-3">
                      <p className="font-medium">3) Discovery (Serper.dev)</p>
                      <p className="text-muted-foreground mb-1">
                        Pulls lead candidates from saved query templates.
                      </p>
                      <code className="block text-xs break-all">
                        {cronBase}/cron/marketing-discover?max_queries=3
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Suggested schedule: send every 1-3 hours, digest once daily, discovery once daily.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="campaigns" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Manual campaign</CardTitle>
                    <CardDescription>Starts paused. Configure templates & limits before unpausing.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <Label>Name</Label>
                      <Input value={newCampaignName} onChange={(e) => setNewCampaignName(e.target.value)} />
                    </div>
                    <Button onClick={handleCreateCampaign}>Create</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>AI-generated campaign</CardTitle>
                    <CardDescription>Generate a campaign draft with AI, then review and activate manually.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Campaign goal</Label>
                      <Textarea rows={3} value={aiGoal} onChange={(e) => setAiGoal(e.target.value)} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label>Audience</Label>
                        <Input value={aiAudience} onChange={(e) => setAiAudience(e.target.value)} />
                      </div>
                      <div>
                        <Label>Tone</Label>
                        <Input value={aiTone} onChange={(e) => setAiTone(e.target.value)} />
                      </div>
                    </div>
                    <Button onClick={handleAiCampaignCreate}>Auto-generate campaign with AI</Button>
                  </CardContent>
                </Card>
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <Card key={c.id}>
                      <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {c.name}
                            <Badge variant={c.is_paused ? "secondary" : "default"}>
                              {c.is_paused ? "paused" : "active"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 font-mono">{c.slug}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => toggleCampaign(c)}>
                            {c.is_paused ? "Activate" : "Pause"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const to = window.prompt("Send test email to:");
                              if (to) handleTestSend(c.id, to);
                            }}
                          >
                            <Mail className="h-4 w-4 mr-1" /> Test send
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {!campaigns.length && (
                    <p className="text-muted-foreground text-sm">No campaigns yet — create one above.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="leads">
                <Card>
                  <CardHeader>
                    <CardTitle>Lead library</CardTitle>
                    <CardDescription>
                      Latest 50 rows. Serp discovery leads are tagged with a target country when you set one on
                      the Google discovery tab — filter below applies to those tags (CSV imports have no country until you
                      extend the pipeline). <strong>Bulk sanitize status</strong> first deletes selected leads with no
                      valid email (or a disposable domain), then asks for the new status for the rest.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="min-w-[200px] max-w-xs">
                        <Label>Filter by country (discovery tag)</Label>
                        <Select
                          value={leadCountryFilter}
                          onValueChange={(v) => setLeadCountryFilter(v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All countries</SelectItem>
                            {MARKETING_SERP_COUNTRIES.filter((c) => c.value).map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={toggleAllLeadsOnPage}>
                        <PencilLine className="h-4 w-4 mr-1" />
                        {selectedLeadIds.length ? "Toggle page selection" : "Select page"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runBulkUpdate("sanitization_status")}
                        disabled={!selectedLeadIds.length}
                        title="Removes selected rows with no valid email first, then prompts for accepted | review | rejected"
                      >
                        Bulk sanitize status
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => runBulkUpdate("lead_status_internal")} disabled={!selectedLeadIds.length}>
                        Bulk lead status
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => runBulkUpdate("campaign_id")} disabled={!selectedLeadIds.length}>
                        Bulk assign campaign
                      </Button>
                      <Button size="sm" variant="destructive" onClick={runBulkDelete} disabled={!selectedLeadIds.length}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete selected
                      </Button>
                      {!!selectedLeadIds.length && (
                        <Badge variant="secondary">{selectedLeadIds.length} selected</Badge>
                      )}
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="p-2">Select</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Company</th>
                          <th className="p-2">Country</th>
                          <th className="p-2">Source</th>
                          <th className="p-2">Sanitize</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(leads as Record<string, unknown>[]).map((row) => {
                          const rp = row.raw_payload as Record<string, unknown> | undefined;
                          const tag =
                            typeof rp?.target_country_code === "string"
                              ? String(rp.target_country_code).toUpperCase()
                              : "—";
                          return (
                          <tr key={String(row.id)} className="border-b border-border/60">
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={selectedLeadIds.includes(String(row.id))}
                                onChange={() => toggleLeadSelection(String(row.id))}
                              />
                            </td>
                            <td className="p-2 font-mono text-xs">{String(row.email || "—")}</td>
                            <td className="p-2">{String(row.company_name || row.sanitized_company_name || "—")}</td>
                            <td className="p-2 text-xs text-muted-foreground">{tag}</td>
                            <td className="p-2">{String(row.source)}</td>
                            <td className="p-2">
                              <Badge variant="outline">{String(row.sanitization_status)}</Badge>
                            </td>
                            <td className="p-2">{String(row.lead_status_internal)}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="import">
                <Card>
                  <CardHeader>
                    <CardTitle>CSV import</CardTitle>
                    <CardDescription>
                      UTF-8 CSV with header row. Email column is auto-detected from common names (email,
                      email address, work_email, business email). Optional: FULL_NAME, JOB_TITLE,
                      COMPANY_NAME, platform. Leads must have a{" "}
                      <strong>campaign UUID</strong> to be picked up by the send cron — paste it below or
                      assign later in the database.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Optional campaign ID (UUID)</Label>
                      <Input id="csv-campaign" placeholder="Paste campaign UUID to attach leads" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" asChild>
                        <label className="cursor-pointer flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Choose CSV
                          <input
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              const cid = (document.getElementById("csv-campaign") as HTMLInputElement)?.value;
                              handleCsv(f || null, cid || undefined);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="csv-sanitize"
                        type="checkbox"
                        checked={csvRunSanitize}
                        onChange={(e) => setCsvRunSanitize(e.target.checked)}
                      />
                      <Label htmlFor="csv-sanitize" className="text-sm">
                        Run AI sanitization during import (slower)
                      </Label>
                    </div>
                    {isImportingCsv && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{csvImportStatus || "Importing CSV..."}</span>
                      </div>
                    )}
                    {!isImportingCsv && csvImportStatus && (
                      <p className="text-sm text-muted-foreground">{csvImportStatus}</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="serp">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" /> Google discovery
                    </CardTitle>
                    <CardDescription>
                      <strong>Run discovery now</strong> uses the vendor and key on this screen (you do not have to Save
                      first). Save to persist the same settings for{" "}
                      <code className="text-xs">/api/cron/marketing-discover</code>. Google result titles/snippets rarely
                      include email addresses — rows are often “review” with company + link until you add
                      contacts manually or import CSV. By default the API also fetches each result URL and
                      same-site /contact-style pages to regex-scan for addresses (slower; respect site terms). Set{" "}
                      <code className="text-xs">MARKETING_SERP_EMAIL_SCRAPE=0</code> on the server to turn that off.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                      <p className="text-sm font-medium">Search API: Serper.dev only</p>
                      <p className="text-xs text-muted-foreground">
                        Google results via POST <code className="text-[11px]">google.serper.dev/search</code> with header{" "}
                        <code className="text-[11px]">X-API-KEY</code>. Advanced deployments can still set{" "}
                        <code className="text-[11px]">MARKETING_GOOGLE_SEARCH_PROVIDER=serpapi</code> on the server or patch
                        settings to <code className="text-[11px]">serpapi</code>.
                      </p>
                    </div>
                    <div>
                      <Label>Serper API key</Label>
                      <Input
                        type="password"
                        value={serpApiKey}
                        onChange={(e) => setSerpApiKey(e.target.value)}
                        placeholder="serper.dev → API keys"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Target country (manual)</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Sets Google <code className="text-[11px]">gl</code> bias, tags new discovery leads, and
                          steers AI query generation. Save after changing.
                        </p>
                        <Select value={serpCountryCode || "none"} onValueChange={(v) => setSerpCountryCode(v === "none" ? "" : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Country" />
                          </SelectTrigger>
                          <SelectContent>
                            {MARKETING_SERP_COUNTRIES.map((c) => (
                              <SelectItem key={c.value || "none"} value={c.value || "none"}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Google UI language (hl)</Label>
                        <Input
                          value={serpHl}
                          onChange={(e) => setSerpHl(e.target.value)}
                          placeholder="en"
                          maxLength={12}
                          className="max-w-[120px]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">e.g. en, fr, de</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={handleAiGenerateSerpQueries} disabled={aiQueriesLoading}>
                        {aiQueriesLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        <span className="ml-2">AI-generate queries</span>
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Appends lines to the editor from OpenAI (review before Save).
                      </span>
                    </div>
                    <Textarea
                      rows={6}
                      value={settingsText}
                      onChange={(e) => setSettingsText(e.target.value)}
                      placeholder={"industrial spare parts procurement Kenya\nfleet maintenance parts suppliers"}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={saveSerpTemplates}>Save discovery settings</Button>
                      <Button variant="secondary" onClick={runDiscover}>
                        Run discovery now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logs">
                <Card>
                  <CardHeader>
                    <CardTitle>Send log</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="p-2">Status</th>
                          <th className="p-2">Subject</th>
                          <th className="p-2">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sends as Record<string, string>[]).map((row) => (
                          <tr key={row.id} className="border-b border-border/60">
                            <td className="p-2">
                              <Badge variant={row.status === "sent" ? "default" : "destructive"}>{row.status}</Badge>
                            </td>
                            <td className="p-2 max-w-xs truncate">{row.subject_snapshot || "—"}</td>
                            <td className="p-2 text-xs text-muted-foreground">{row.sent_at || row.created_at}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="errors">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" /> Pipeline errors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(errors as Record<string, unknown>[]).map((row) => (
                      <div key={String(row.id)} className="rounded-lg border p-3 text-sm">
                        <Badge variant="outline" className="mb-1">
                          {String(row.severity)}
                        </Badge>
                        <p>{String(row.message)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{String(row.created_at)}</p>
                      </div>
                    ))}
                    {!errors.length && (
                      <p className="text-muted-foreground text-sm">No errors logged.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </motion.main>
    </div>
  );
};

export default MarketingOutbound;
