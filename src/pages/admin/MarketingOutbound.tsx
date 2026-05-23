import React, { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminPageHeaderToolbar } from "@/components/admin/AdminPageHeader";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminApi } from "@/lib/api";
import { MARKETING_SERP_COUNTRIES, marketingCountryLabel } from "@/lib/marketingCountries";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  UserPlus,
  Send,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
  Download,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

/** Recognized `?tab=` query values for deep links (e.g. admin dashboard). */
const MARKETING_TAB_VALUES = [
  "overview",
  "campaigns",
  "leads",
  "import",
  "serp",
  "logs",
  "errors",
] as const;
type MarketingTab = (typeof MARKETING_TAB_VALUES)[number];

function resolveMarketingTab(searchParams: URLSearchParams): MarketingTab {
  const raw = (searchParams.get("tab") || "").trim();
  return (MARKETING_TAB_VALUES as readonly string[]).includes(raw) ? (raw as MarketingTab) : "overview";
}

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

/** In-process API scheduler (see docs/MARKETING_CRON.md); persisted with discovery settings. */
const SCHED_DISCOVER_PRESETS: { label: string; value: number }[] = [
  { label: "Off", value: 0 },
  { label: "Every hour", value: 3600 },
  { label: "Every 6 hours", value: 21600 },
  { label: "Every 12 hours", value: 43200 },
  { label: "Once per day (recommended)", value: 86400 },
];

const SCHED_SEND_PRESETS: { label: string; value: number }[] = [
  { label: "Off", value: 0 },
  { label: "Every 30 minutes", value: 1800 },
  { label: "Every hour", value: 3600 },
  { label: "Every 2 hours", value: 7200 },
  { label: "Every 6 hours", value: 21600 },
];

function parseSettingsInt(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function fmtMarketingPct(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return `${v}%`;
  return "—";
}

function leadRowHasUsableEmail(email: unknown): boolean {
  const e = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!e || !MARKETING_LEAD_EMAIL_RE.test(e)) return false;
  const domain = e.split("@").pop() || "";
  return !DISPOSABLE_MARKETING_EMAIL_DOMAINS.has(domain);
}

function formatMarketingApiError(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { detail?: unknown; message?: string } } }).response;
    const detail = r?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          typeof item === "object" && item !== null && "msg" in item
            ? String((item as { msg?: string }).msg)
            : JSON.stringify(item)
        )
        .join("; ");
    }
    if (typeof r?.data?.message === "string") return r.data.message;
  }
  if (err instanceof Error) return err.message;
  return "Request failed";
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

type BulkLeadUpdateField = "sanitization_status" | "lead_status_internal" | "campaign_id";

const MarketingOutbound: React.FC = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const marketingTab = resolveMarketingTab(searchParams);
  const handleMarketingTabChange = useCallback(
    (value: string) => {
      const next = (MARKETING_TAB_VALUES as readonly string[]).includes(value)
        ? (value as MarketingTab)
        : "overview";
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === "overview") p.delete("tab");
          else p.set("tab", next);
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );
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
  /** Empty = no pin: server assigns highest-priority active campaign (or pin a specific campaign UUID). */
  const [defaultOutboundCampaignId, setDefaultOutboundCampaignId] = useState("");
  /** Seconds between automated Google discovery on the API (0 = off). */
  const [scheduledDiscoverIntervalSec, setScheduledDiscoverIntervalSec] = useState(0);
  const [scheduledSendIntervalSec, setScheduledSendIntervalSec] = useState(0);
  const [scheduledDiscoverMaxQueries, setScheduledDiscoverMaxQueries] = useState(3);
  const [scheduledSendBatch, setScheduledSendBatch] = useState(20);
  /** Leads stuck in sanitization review to auto-process per send/discover cron (0 = off). Default 25. */
  const [sanitizeReviewBatch, setSanitizeReviewBatch] = useState(25);
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
  const [testSendOpen, setTestSendOpen] = useState(false);
  const [testSendCampaign, setTestSendCampaign] = useState<Campaign | null>(null);
  const [testSendTo, setTestSendTo] = useState("");
  const [testSendLoading, setTestSendLoading] = useState(false);
  const [bulkLeadDialog, setBulkLeadDialog] = useState<{ field: BulkLeadUpdateField; ids: string[] } | null>(null);
  const [bulkLeadSelectValue, setBulkLeadSelectValue] = useState("");
  const [bulkLeadSubmitting, setBulkLeadSubmitting] = useState(false);
  const [manualLeadOpen, setManualLeadOpen] = useState(false);
  const [manualLeadEmail, setManualLeadEmail] = useState("");
  const [manualLeadFullName, setManualLeadFullName] = useState("");
  const [manualLeadJobTitle, setManualLeadJobTitle] = useState("");
  const [manualLeadCompany, setManualLeadCompany] = useState("");
  const [manualLeadCampaignId, setManualLeadCampaignId] = useState("__auto__");
  const [manualLeadSanitize, setManualLeadSanitize] = useState(false);
  const [manualLeadSaving, setManualLeadSaving] = useState(false);
  const [bulkSendConfirmOpen, setBulkSendConfirmOpen] = useState(false);
  const [bulkSendMaxInput, setBulkSendMaxInput] = useState("25");
  const [bulkSendSubmitting, setBulkSendSubmitting] = useState(false);
  const [sendLogView, setSendLogView] = useState<Record<string, unknown> | null>(null);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsLimit, setLeadsLimit] = useState(25);
  const [leadsSearchInput, setLeadsSearchInput] = useState("");
  const [leadsSearch, setLeadsSearch] = useState("");
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [isExportingLeads, setIsExportingLeads] = useState(false);

  const loadGlobal = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, camps, sn, err, setRes] = await Promise.all([
        adminApi.getMarketingDashboard(),
        adminApi.getMarketingCampaigns(),
        adminApi.getMarketingSends({ page: 1, limit: 50 }),
        adminApi.getMarketingErrors({ page: 1, limit: 50 }),
        adminApi.getMarketingSettings(),
      ]);
      if (dash.success && dash.data) setDashboard(dash.data as Record<string, unknown>);
      const campPayload = (camps.data as { campaigns?: Campaign[] })?.campaigns;
      setCampaigns(Array.isArray(campPayload) ? campPayload : []);
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
          default_outbound_campaign_id?: string;
          scheduled_discover_interval_sec?: number;
          scheduled_send_interval_sec?: number;
          scheduled_discover_max_queries?: number;
          scheduled_send_batch?: number;
          sanitize_review_batch?: number;
        };
      })?.settings;
      const templates = st?.serp_query_templates;
      setSettingsText(Array.isArray(templates) ? templates.join("\n") : "");
      setSerpApiKey(st?.serpapi_key || "");
      setSerpCountryCode((st?.serp_target_country_code || "").toLowerCase());
      setSerpHl((st?.serp_target_hl || "en").toLowerCase() || "en");
      setDefaultOutboundCampaignId(
        typeof st?.default_outbound_campaign_id === "string" ? st.default_outbound_campaign_id.trim() : ""
      );
      setScheduledDiscoverIntervalSec(
        Math.min(604800, Math.max(0, parseSettingsInt(st?.scheduled_discover_interval_sec, 0)))
      );
      setScheduledSendIntervalSec(Math.min(604800, Math.max(0, parseSettingsInt(st?.scheduled_send_interval_sec, 0))));
      setScheduledDiscoverMaxQueries(
        Math.min(10, Math.max(1, parseSettingsInt(st?.scheduled_discover_max_queries, 3)))
      );
      setScheduledSendBatch(Math.min(200, Math.max(1, parseSettingsInt(st?.scheduled_send_batch, 20))));
      setSanitizeReviewBatch(Math.min(100, Math.max(0, parseSettingsInt(st?.sanitize_review_batch, 25))));
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
  }, [toast]);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const ld = await adminApi.getMarketingLeads({
        page: leadsPage,
        limit: leadsLimit,
        search: leadsSearch.trim() || undefined,
        country_code: leadCountryFilter,
      });
      if (ld.success && ld.data) {
        const d = ld.data as {
          leads?: unknown[];
          pagination?: { page?: number; limit?: number; total?: number };
        };
        setLeads(Array.isArray(d.leads) ? d.leads : []);
        const total = Number(d.pagination?.total);
        setLeadsTotal(Number.isFinite(total) ? total : Array.isArray(d.leads) ? d.leads.length : 0);
      }
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Contacts failed to load",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLeadsLoading(false);
    }
  }, [toast, leadsPage, leadsLimit, leadsSearch, leadCountryFilter]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadGlobal(), loadLeads()]);
  }, [loadGlobal, loadLeads]);

  useEffect(() => {
    void loadGlobal();
  }, [loadGlobal]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    setSelectedLeadIds([]);
  }, [leadsPage, leadsSearch, leadCountryFilter, leadsLimit]);

  const applyLeadSearch = () => {
    setLeadsSearch(leadsSearchInput.trim());
    setLeadsPage(1);
  };

  const clearLeadSearch = () => {
    setLeadsSearchInput("");
    setLeadsSearch("");
    setLeadsPage(1);
  };

  const downloadMarketingLeadsCsv = async (mode: "filtered" | "selected") => {
    if (mode === "selected" && !selectedLeadIds.length) {
      toast({
        variant: "destructive",
        title: "Nothing selected",
        description: "Select at least one contact to export.",
      });
      return;
    }
    setIsExportingLeads(true);
    try {
      const blob = await adminApi.exportMarketingLeadsCsv({
        search: mode === "filtered" ? leadsSearch.trim() || undefined : undefined,
        country_code: mode === "filtered" ? leadCountryFilter : undefined,
        ids: mode === "selected" ? selectedLeadIds : undefined,
      });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const filename =
        mode === "selected"
          ? `sparefinder-leads-selected-${stamp}.csv`
          : `sparefinder-leads-${stamp}.csv`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export ready",
        description:
          mode === "selected"
            ? `Downloaded ${selectedLeadIds.length} selected contact(s).`
            : "Downloaded all contacts matching your current search and filters.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: formatMarketingApiError(e),
      });
    } finally {
      setIsExportingLeads(false);
    }
  };

  const leadsTotalPages = Math.max(1, Math.ceil(leadsTotal / leadsLimit) || 1);
  const leadsRangeFrom = leadsTotal === 0 ? 0 : (leadsPage - 1) * leadsLimit + 1;
  const leadsRangeTo = leadsTotal === 0 ? 0 : Math.min(leadsPage * leadsLimit, leadsTotal);

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
        const data = res.data as {
          imported?: number;
          skipped_duplicate_lead?: number;
          skipped_duplicate_user?: number;
          skipped_no_email?: number;
        };
        const dupLead = data?.skipped_duplicate_lead ?? 0;
        const dupUser = data?.skipped_duplicate_user ?? 0;
        const noEmail = data?.skipped_no_email ?? 0;
        const summary = `Imported ${data?.imported ?? 0} new lead(s). Skipped ${dupLead} duplicate lead(s), ${dupUser} existing account(s), ${noEmail} without email.`;
        setCsvImportStatus(`Import complete. ${summary}`);
        toast({ title: "Import complete", description: summary });
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
      default_outbound_campaign_id: defaultOutboundCampaignId.trim() || "",
      scheduled_discover_interval_sec: scheduledDiscoverIntervalSec,
      scheduled_send_interval_sec: scheduledSendIntervalSec,
      scheduled_discover_max_queries: scheduledDiscoverMaxQueries,
      scheduled_send_batch: scheduledSendBatch,
      sanitize_review_batch: sanitizeReviewBatch,
    });
    if (res.success)
      toast({
        title: "Discovery settings saved",
        description:
          "Queries, Serper options, and automation intervals are stored. The API re-reads schedules about once a minute — no restart required.",
      });
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
      // Saved subject/body are what actually send (names filled per person). Set use_ai true on the campaign in the DB only if you want a brand-new AI email on every send.
      use_ai: false,
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

  const submitTestSend = async () => {
    if (!testSendCampaign) return;
    const to = testSendTo.trim().toLowerCase();
    if (!MARKETING_LEAD_EMAIL_RE.test(to)) {
      toast({ variant: "destructive", title: "Invalid email", description: "Enter a valid recipient address." });
      return;
    }
    setTestSendLoading(true);
    try {
      const res = await adminApi.testMarketingEmail({ campaign_id: testSendCampaign.id, to_email: to });
      if (res.success) {
        const subj = (res.data as { subject?: string } | undefined)?.subject;
        toast({
          title: "Test email sent",
          description: subj ? `Subject: ${subj}` : "Check the recipient inbox (and spam folder).",
        });
        setTestSendOpen(false);
        setTestSendCampaign(null);
        setTestSendTo("");
      } else {
        toast({
          variant: "destructive",
          title: "Send failed",
          description: res.message || res.error || "Unknown error",
        });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Send failed", description: formatMarketingApiError(e) });
    } finally {
      setTestSendLoading(false);
    }
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

  const openBulkLeadDialog = async (field: BulkLeadUpdateField) => {
    if (!selectedLeadIds.length) return;
    let idsForUpdate = [...selectedLeadIds];

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
        idsForUpdate = idsForUpdate.filter((id) => !noEmailIds.includes(id));
        setSelectedLeadIds(idsForUpdate);
        toast({ title: "Removed no-email leads", description: `${noEmailIds.length} deleted from selection.` });
        if (!idsForUpdate.length) {
          loadAll();
          return;
        }
      }
    }

    if (field === "sanitization_status") {
      setBulkLeadSelectValue("accepted");
    } else if (field === "lead_status_internal") {
      setBulkLeadSelectValue("pending");
    } else {
      const firstActive = campaigns.find((c) => !c.is_paused);
      setBulkLeadSelectValue(firstActive?.id ?? campaigns[0]?.id ?? "__none__");
    }

    setBulkLeadDialog({ field, ids: idsForUpdate });
  };

  const submitBulkLeadDialog = async () => {
    if (!bulkLeadDialog) return;
    const { field, ids } = bulkLeadDialog;

    let payload: Record<string, unknown>;
    if (field === "campaign_id") {
      const cid =
        bulkLeadSelectValue === "__none__" || !String(bulkLeadSelectValue).trim()
          ? null
          : String(bulkLeadSelectValue).trim();
      payload = { campaign_id: cid };
    } else {
      const v = bulkLeadSelectValue.trim().toLowerCase();
      if (field === "sanitization_status") {
        if (!["accepted", "review", "rejected"].includes(v)) {
          toast({ variant: "destructive", title: "Invalid review status", description: "Choose a value from the list." });
          return;
        }
        payload = { sanitization_status: v };
      } else {
        if (!["pending", "sent", "bounced", "opt_out", "skipped"].includes(v)) {
          toast({ variant: "destructive", title: "Invalid send status", description: "Choose a value from the list." });
          return;
        }
        payload = { lead_status_internal: v };
      }
    }

    setBulkLeadSubmitting(true);
    try {
      const res = await adminApi.bulkManageMarketingLeads({
        ids,
        action: "update",
        payload,
      });
      if (res.success) {
        toast({ title: "Bulk update applied", description: `${ids.length} lead(s) updated.` });
        setBulkLeadDialog(null);
        setBulkLeadSelectValue("");
        loadAll();
      } else {
        toast({ variant: "destructive", title: "Bulk update failed", description: res.message || res.error });
      }
    } finally {
      setBulkLeadSubmitting(false);
    }
  };

  const openManualLeadDialog = () => {
    setManualLeadEmail("");
    setManualLeadFullName("");
    setManualLeadJobTitle("");
    setManualLeadCompany("");
    setManualLeadCampaignId("__auto__");
    setManualLeadSanitize(false);
    setManualLeadOpen(true);
  };

  const submitManualLead = async () => {
    const email = manualLeadEmail.trim().toLowerCase();
    if (!email) {
      toast({ variant: "destructive", title: "Email required", description: "Enter a work email address." });
      return;
    }
    if (!MARKETING_LEAD_EMAIL_RE.test(email)) {
      toast({ variant: "destructive", title: "Invalid email", description: "Check the address format." });
      return;
    }
    if (!leadRowHasUsableEmail(email)) {
      toast({
        variant: "destructive",
        title: "Email not allowed",
        description: "Use a non-disposable business email.",
      });
      return;
    }
    setManualLeadSaving(true);
    try {
      const res = await adminApi.createMarketingLead({
        email,
        full_name: manualLeadFullName.trim() || undefined,
        job_title: manualLeadJobTitle.trim() || undefined,
        company_name: manualLeadCompany.trim() || undefined,
        campaign_id: manualLeadCampaignId === "__auto__" ? null : manualLeadCampaignId,
        run_sanitize: manualLeadSanitize,
      });
      if (res.success) {
        toast({ title: "Contact saved", description: "The lead was added to the campaign queue." });
        setManualLeadOpen(false);
        loadAll();
      } else {
        toast({
          variant: "destructive",
          title: "Could not save contact",
          description: (res as { message?: string }).message || res.error || "Request failed",
        });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Request failed", description: formatMarketingApiError(e) });
    } finally {
      setManualLeadSaving(false);
    }
  };

  const openBulkSendConfirm = () => {
    if (!selectedLeadIds.length) return;
    const cap = Math.min(selectedLeadIds.length, 100);
    setBulkSendMaxInput(String(Math.min(Math.max(cap, 1), 50)));
    setBulkSendConfirmOpen(true);
  };

  const executeBulkSendSelected = async () => {
    const parsed = parseInt(bulkSendMaxInput, 10);
    const lim = Number.isFinite(parsed)
      ? Math.max(1, Math.min(100, parsed))
      : Math.min(selectedLeadIds.length, 50);
    setBulkSendSubmitting(true);
    try {
      const res = await adminApi.sendMarketingLeadsBatch({ ids: selectedLeadIds, limit: lim });
      if (res.success) {
        const d = res.data as {
          sent?: number;
          failed?: number;
          skipped?: number;
          errors?: string[];
          hints?: string[];
        };
        const parts = [`Sent ${d?.sent ?? 0}`];
        if (d?.failed) parts.push(`failed ${d.failed}`);
        if (d?.skipped) parts.push(`skipped ${d.skipped}`);
        const extra = d?.errors?.length ? ` — ${d.errors[0]}` : d?.hints?.[0] ? ` — ${d.hints[0]}` : "";
        toast({ title: "Bulk send finished", description: `${parts.join(", ")}${extra}` });
        setBulkSendConfirmOpen(false);
        setSelectedLeadIds([]);
        loadAll();
      } else {
        toast({
          variant: "destructive",
          title: "Bulk send failed",
          description: (res as { message?: string }).message || res.error || "Request failed",
        });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Bulk send failed", description: formatMarketingApiError(e) });
    } finally {
      setBulkSendSubmitting(false);
    }
  };

  const cronBase = `${String(API_BASE_URL || "").replace(/\/$/, "")}/api`;

  return (
    <>
      <AdminPageContent className="max-w-6xl">
          <AdminPageHeader
            breadcrumbPage="Email campaigns"
            title={
              <h1 className="flex flex-wrap items-center gap-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                <Megaphone className="h-8 w-8 shrink-0 text-primary" aria-hidden />
                Email campaigns
              </h1>
            }
            description={
              <>
                Build campaigns, manage contacts, find people on Google, and review what was sent. Scheduled sends are
                documented in{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs break-all">docs/MARKETING_CRON.md</code>.
              </>
            }
            actions={
              <AdminPageHeaderToolbar>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-2 rounded-xl px-3 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      onClick={() => loadAll()}
                      disabled={loading}
                      aria-label="Refresh marketing data"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 shrink-0" />
                      )}
                      <span className="hidden sm:inline">Update</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Reload lists and stats
                  </TooltipContent>
                </Tooltip>
              </AdminPageHeaderToolbar>
            }
          />

          {loading && !dashboard ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs
              value={marketingTab}
              onValueChange={handleMarketingTabChange}
              className="space-y-6"
            >
              <TabsList className="flex h-auto w-full min-w-0 flex-nowrap justify-start gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="import">Import spreadsheet</TabsTrigger>
                <TabsTrigger value="serp">Find on Google</TabsTrigger>
                <TabsTrigger value="logs">Sent emails</TabsTrigger>
                <TabsTrigger value="errors">Issues</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-8">
                <section aria-labelledby="overview-email-heading">
                  <h2 id="overview-email-heading" className="text-lg font-semibold tracking-tight text-foreground mb-3">
                    Email &amp; engagement
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {(
                      [
                        ["Emails sent today (UTC)", dashboard?.sends_today],
                        ["Failed sends today", dashboard?.failed_today],
                        ["Opens logged today (UTC)", dashboard?.opens_logged_today],
                        ["Clicks logged today (UTC)", dashboard?.clicks_logged_today],
                        ["7-day open rate", fmtMarketingPct(dashboard?.open_rate_last_7_days_pct)],
                        ["7-day click rate", fmtMarketingPct(dashboard?.click_rate_last_7_days_pct)],
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
                  {(typeof dashboard?.sends_last_7_days === "number" ||
                    typeof dashboard?.sends_last_7_days_with_open === "number") && (
                    <p className="text-sm text-muted-foreground mt-3 rounded-lg border bg-muted/30 px-3 py-2">
                      <span className="font-medium text-foreground">Last 7 days (UTC): </span>
                      {String(dashboard?.sends_last_7_days ?? "—")} sent ·{" "}
                      {String(dashboard?.sends_last_7_days_with_open ?? "—")} with at least one open ·{" "}
                      {String(dashboard?.sends_last_7_days_with_click ?? "—")} with at least one tracked link click.
                      Opens use a 1×1 pixel; some mail apps prefetch images, so treat open rate as directional.
                    </p>
                  )}
                </section>

                <section aria-labelledby="overview-leads-heading">
                  <Card>
                    <CardHeader>
                      <CardTitle id="overview-leads-heading" className="flex flex-wrap items-center gap-2 text-xl">
                        <Users className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                        Lead pipeline
                      </CardTitle>
                      <CardDescription>
                        From <code className="text-xs">marketing_leads</code>. &ldquo;Ready for auto-send&rdquo; matches
                        the batch sender: pending, sanitization accepted, on an <strong>active</strong> campaign.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {(
                          [
                            ["All contacts", dashboard?.leads_total],
                            ["Ready for auto-send", dashboard?.leads_pending_send],
                            ["Pending (any campaign)", dashboard?.leads_pending_any_campaign],
                            ["Pending + accepted", dashboard?.leads_pipeline_pending_accepted],
                            ["Needs sanitization review", dashboard?.leads_needs_review],
                            ["Rejected (sanitization)", dashboard?.leads_pipeline_rejected],
                            ["Marked sent (lead status)", dashboard?.leads_pipeline_sent],
                          ] as [string, unknown][]
                        ).map(([label, val]) => (
                          <Card key={label}>
                            <CardHeader className="pb-2">
                              <CardDescription>{label}</CardDescription>
                              <CardTitle className="text-3xl">{String(val ?? "—")}</CardTitle>
                            </CardHeader>
                          </Card>
                        ))}
                        <Card className="border-dashed bg-muted/20">
                          <CardHeader className="pb-2">
                            <CardDescription>Post-send outcomes</CardDescription>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                              <div>
                                <p className="text-2xl font-semibold tabular-nums">
                                  {String(dashboard?.leads_pipeline_bounced ?? "—")}
                                </p>
                                <p className="text-[11px] text-muted-foreground">Bounced</p>
                              </div>
                              <div>
                                <p className="text-2xl font-semibold tabular-nums">
                                  {String(dashboard?.leads_pipeline_opt_out ?? "—")}
                                </p>
                                <p className="text-[11px] text-muted-foreground">Opt-out</p>
                              </div>
                              <div>
                                <p className="text-2xl font-semibold tabular-nums">
                                  {String(dashboard?.leads_pipeline_skipped ?? "—")}
                                </p>
                                <p className="text-[11px] text-muted-foreground">Skipped</p>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardDescription>Pending, accepted, no campaign</CardDescription>
                            <CardTitle className="text-3xl">
                              {String(dashboard?.leads_pipeline_pending_no_campaign ?? "—")}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground pt-1">
                              The send cron can assign a default campaign; use bulk actions on the Leads tab if needed.
                            </p>
                          </CardHeader>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardDescription>New contacts (7 days, UTC)</CardDescription>
                            <CardTitle className="text-3xl">
                              {String(dashboard?.leads_pipeline_new_last_7_days ?? "—")}
                            </CardTitle>
                          </CardHeader>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardDescription>Active campaigns</CardDescription>
                            <CardTitle className="text-3xl">
                              {String(dashboard?.active_unpaused_campaigns ?? "—")}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground pt-1">Unpaused — eligible for auto-send</p>
                          </CardHeader>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <p className="text-sm text-muted-foreground">{String(dashboard?.timezone_note || "")}</p>
                <Card>
                  <CardHeader>
                    <CardTitle>Automatic sending (for IT / hosting)</CardTitle>
                    <CardDescription>
                      Your team can plug these web addresses into a scheduler (for example cron-job.org). They are open
                      links — protect them with your firewall or IP allow list if you can.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded border p-3">
                      <p className="font-medium">1) Send emails in batches</p>
                      <p className="text-muted-foreground mb-1">Sends the next batch for campaigns that are turned on.</p>
                      <code className="block text-xs break-all">{cronBase}/cron/marketing-send?limit=20</code>
                    </div>
                    <div className="rounded border p-3">
                      <p className="font-medium">2) Daily summary email</p>
                      <p className="text-muted-foreground mb-1">Emails admins a short recap of yesterday.</p>
                      <code className="block text-xs break-all">{cronBase}/cron/marketing-digest</code>
                    </div>
                    <div className="rounded border p-3">
                      <p className="font-medium">3) Find new contacts on Google</p>
                      <p className="text-muted-foreground mb-1">
                        Runs your saved Google searches and adds people with valid email addresses.
                      </p>
                      <code className="block text-xs break-all">
                        {cronBase}/cron/marketing-discover?max_queries=3
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Suggested timing: send mail every 1–3 hours, summary once a day, Google search once a day.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prefer <strong>Admin → Find on Google</strong> to set automated discovery/send intervals (saved with
                      discovery settings). Env vars with the same names override those values for ops lock-in. See{" "}
                      <code className="text-xs">docs/MARKETING_CRON.md</code>.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="campaigns" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Manual campaign</CardTitle>
                    <CardDescription>Starts turned off. Edit the email and limits before you turn it on.</CardDescription>
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
                    <CardDescription>
                      AI writes one email draft (with name and company placeholders). When you send or run the
                      automatic sender, that same draft goes out — each person gets their own name and company filled in.
                    </CardDescription>
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
                <p className="text-sm text-muted-foreground">
                  <strong>Active</strong> only means the campaign is turned on. The automatic sender still needs contacts on
                  the <strong>Leads</strong> tab tied to this campaign (new imports and Google discovery auto-assign a
                  campaign from <strong>Find on Google</strong> settings), status <strong>Pending</strong>, and review{" "}
                  <strong>Accepted</strong> — otherwise nothing goes out even when the campaign is active.
                </p>
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
                              setTestSendCampaign(c);
                              setTestSendTo("");
                              setTestSendOpen(true);
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
                    <CardTitle>Contacts</CardTitle>
                    <CardDescription>
                      Paginated list with search (email, name, or company). Contacts from Google pick up the country from
                      Find on Google — use the country filter to narrow them (spreadsheet imports do not set a country
                      yet). <strong>Bulk review status</strong> first removes selected rows that have no real email (or
                      use a throwaway inbox), then opens a dialog for the rest. <strong>Send to selected</strong> sends
                      the real campaign email (pending, accepted, active campaign) up to the limit you set — same SMTP
                      path as the automated cron.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                      <div className="min-w-[200px] flex-1 max-w-md">
                        <Label htmlFor="leads-search">Search</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Input
                            id="leads-search"
                            value={leadsSearchInput}
                            onChange={(e) => setLeadsSearchInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") applyLeadSearch();
                            }}
                            placeholder="Email, name, or company"
                            className="min-w-[200px] flex-1"
                            disabled={leadsLoading}
                          />
                          <Button type="button" size="sm" onClick={applyLeadSearch} disabled={leadsLoading}>
                            Search
                          </Button>
                          {leadsSearch ? (
                            <Button type="button" size="sm" variant="outline" onClick={clearLeadSearch} disabled={leadsLoading}>
                              Clear
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="min-w-[200px] max-w-xs">
                        <Label>Filter by country (discovery tag)</Label>
                        <Select
                          value={leadCountryFilter}
                          onValueChange={(v) => {
                            setLeadCountryFilter(v);
                            setLeadsPage(1);
                          }}
                          disabled={leadsLoading}
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
                      <Button size="sm" onClick={openManualLeadDialog}>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add contact
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isExportingLeads || leadsLoading}
                        onClick={() => void downloadMarketingLeadsCsv("filtered")}
                      >
                        {isExportingLeads ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden />
                        ) : (
                          <Download className="h-4 w-4 mr-1" aria-hidden />
                        )}
                        Export filtered
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isExportingLeads || !selectedLeadIds.length}
                        onClick={() => void downloadMarketingLeadsCsv("selected")}
                      >
                        <Download className="h-4 w-4 mr-1" aria-hidden />
                        Export selected
                      </Button>
                      <Button size="sm" variant="outline" onClick={toggleAllLeadsOnPage}>
                        <PencilLine className="h-4 w-4 mr-1" />
                        {selectedLeadIds.length ? "Toggle page selection" : "Select page"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openBulkLeadDialog("sanitization_status")}
                        disabled={!selectedLeadIds.length}
                        title="Removes rows with no real email first, then choose accepted, review, or rejected"
                      >
                        Bulk review status
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openBulkLeadDialog("lead_status_internal")}
                        disabled={!selectedLeadIds.length}
                      >
                        Bulk email send status
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void openBulkLeadDialog("campaign_id")} disabled={!selectedLeadIds.length}>
                        Bulk set campaign
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={openBulkSendConfirm}
                        disabled={!selectedLeadIds.length}
                        title="Sends campaign mail to selected contacts that are pending, review accepted, and on an active campaign"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send to selected
                      </Button>
                      <Button size="sm" variant="destructive" onClick={runBulkDelete} disabled={!selectedLeadIds.length}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete selected
                      </Button>
                      {!!selectedLeadIds.length && (
                        <Badge variant="secondary">{selectedLeadIds.length} selected</Badge>
                      )}
                    </div>
                    <div className="relative min-h-[120px]">
                      {leadsLoading ? (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/60 backdrop-blur-[1px]">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
                        </div>
                      ) : null}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="p-2">Select</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Company</th>
                            <th className="p-2">Country</th>
                            <th className="p-2">Source</th>
                            <th className="p-2">Review</th>
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
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        {leadsTotal === 0
                          ? "No contacts match this filter."
                          : `Showing ${leadsRangeFrom}–${leadsRangeTo} of ${leadsTotal} · page ${leadsPage} of ${leadsTotalPages}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">Per page</Label>
                          <Select
                            value={String(leadsLimit)}
                            onValueChange={(v) => {
                              setLeadsLimit(Number(v));
                              setLeadsPage(1);
                            }}
                            disabled={leadsLoading}
                          >
                            <SelectTrigger className="h-8 w-[88px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            disabled={leadsPage <= 1 || leadsLoading}
                            onClick={() => setLeadsPage((p) => Math.max(1, p - 1))}
                            aria-label="Previous page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            disabled={leadsPage >= leadsTotalPages || leadsLoading || leadsTotal === 0}
                            onClick={() => setLeadsPage((p) => p + 1)}
                            aria-label="Next page"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="import">
                <Card>
                  <CardHeader>
                    <CardTitle>Import contacts from a spreadsheet</CardTitle>
                    <CardDescription>
                      Use a UTF-8 CSV with a header row. We look for an email column under common names (Email, Work
                      email, and so on). You can also include name, job title, company, and platform columns. New rows
                      get a campaign automatically (pinned default or highest-priority active campaign from{" "}
                      <strong>Find on Google</strong>); optionally override per import with a campaign ID below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Optional campaign ID (override auto-assign)</Label>
                      <Input id="csv-campaign" placeholder="Leave blank to use default from Find on Google tab" />
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
                        Let AI clean up each row during import (slower)
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
                      <Search className="h-5 w-5" /> Find on Google
                    </CardTitle>
                    <CardDescription>
                      <strong>Run discovery now</strong> uses the key and country settings on this page (saving first is
                      optional). Click <strong>Save discovery settings</strong> so overnight jobs use the same choices.
                      New contacts are assigned the default campaign below (or the highest-priority active campaign).
                      Google previews rarely show email addresses, so the server may open each result page (and common
                      “Contact” pages) to look for an address — that is slower; your hosting team can turn it off with env{" "}
                      <code className="text-xs">MARKETING_SERP_EMAIL_SCRAPE=0</code>.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                      <p className="text-sm font-medium">Powered by Serper (Google search partner)</p>
                      <p className="text-xs text-muted-foreground">
                        Uses your Serper API key. If you ever need the older SerpAPI vendor instead, your hosting team
                        can set <code className="text-[11px]">MARKETING_GOOGLE_SEARCH_PROVIDER=serpapi</code> on the server.
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
                    <div>
                      <Label>Default campaign for new contacts</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Applies to CSV import (when no override), Google discovery, and cron discovery.{" "}
                        <strong>Auto</strong> picks the highest-priority campaign that is not paused.
                      </p>
                      <Select
                        value={defaultOutboundCampaignId || "__auto__"}
                        onValueChange={(v) => setDefaultOutboundCampaignId(v === "__auto__" ? "" : v)}
                      >
                        <SelectTrigger className="max-w-md">
                          <SelectValue placeholder="Campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__auto__">Auto (highest-priority active)</SelectItem>
                          {campaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                              {c.is_paused ? " (paused)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-lg border border-dashed border-primary/25 bg-primary/5 p-4 space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Automatic discovery &amp; send (API server)</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          When the AI API runs as a <strong>single</strong> worker, it can repeat the same jobs as the
                          public cron URLs on a timer. Values are saved here; the server re-reads them about once a
                          minute — no restart needed. If your host sets{" "}
                          <code className="text-[11px]">MARKETING_SCHEDULED_DISCOVER_INTERVAL_SEC</code> or{" "}
                          <code className="text-[11px]">MARKETING_SCHEDULED_SEND_INTERVAL_SEC</code>, those env vars{" "}
                          <strong>override</strong> the numbers below.
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label>Google discovery interval</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Runs your saved queries and upserts contacts with valid emails.{" "}
                            <span className="font-medium text-foreground">Once per day</span> is the usual choice.
                          </p>
                          <Select
                            value={String(scheduledDiscoverIntervalSec)}
                            onValueChange={(v) => setScheduledDiscoverIntervalSec(parseInt(v, 10) || 0)}
                          >
                            <SelectTrigger className="max-w-md">
                              <SelectValue placeholder="Interval" />
                            </SelectTrigger>
                            <SelectContent>
                              {SCHED_DISCOVER_PRESETS.map((p) => (
                                <SelectItem key={p.label} value={String(p.value)}>
                                  {p.label}
                                </SelectItem>
                              ))}
                              {!SCHED_DISCOVER_PRESETS.some((p) => p.value === scheduledDiscoverIntervalSec) ? (
                                <SelectItem value={String(scheduledDiscoverIntervalSec)}>
                                  Custom ({scheduledDiscoverIntervalSec}s)
                                </SelectItem>
                              ) : null}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Batch send interval</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Sends the next batch for <strong>active</strong> campaigns. Leave off until campaigns and
                            contacts are ready.
                          </p>
                          <Select
                            value={String(scheduledSendIntervalSec)}
                            onValueChange={(v) => setScheduledSendIntervalSec(parseInt(v, 10) || 0)}
                          >
                            <SelectTrigger className="max-w-md">
                              <SelectValue placeholder="Interval" />
                            </SelectTrigger>
                            <SelectContent>
                              {SCHED_SEND_PRESETS.map((p) => (
                                <SelectItem key={p.label} value={String(p.value)}>
                                  {p.label}
                                </SelectItem>
                              ))}
                              {!SCHED_SEND_PRESETS.some((p) => p.value === scheduledSendIntervalSec) ? (
                                <SelectItem value={String(scheduledSendIntervalSec)}>
                                  Custom ({scheduledSendIntervalSec}s)
                                </SelectItem>
                              ) : null}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Queries per discovery run</Label>
                          <p className="text-xs text-muted-foreground mb-2">Uses the first N lines from your query list.</p>
                          <Select
                            value={String(scheduledDiscoverMaxQueries)}
                            onValueChange={(v) => setScheduledDiscoverMaxQueries(parseInt(v, 10) || 3)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 5, 7, 10].map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n}
                                </SelectItem>
                              ))}
                              {![1, 2, 3, 5, 7, 10].includes(scheduledDiscoverMaxQueries) ? (
                                <SelectItem value={String(scheduledDiscoverMaxQueries)}>
                                  Custom ({scheduledDiscoverMaxQueries})
                                </SelectItem>
                              ) : null}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Max emails per send run</Label>
                          <p className="text-xs text-muted-foreground mb-2">Cap for each automated send cycle.</p>
                          <Select
                            value={String(scheduledSendBatch)}
                            onValueChange={(v) => setScheduledSendBatch(parseInt(v, 10) || 20)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[10, 15, 20, 25, 50, 100].map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n}
                                </SelectItem>
                              ))}
                              {![10, 15, 20, 25, 50, 100].includes(scheduledSendBatch) ? (
                                <SelectItem value={String(scheduledSendBatch)}>Custom ({scheduledSendBatch})</SelectItem>
                              ) : null}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Sanitize review batch</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Each <strong>marketing-send</strong> and <strong>marketing-discover</strong> cron re-runs AI
                            sanitization on up to this many contacts stuck in &ldquo;needs review&rdquo;.{" "}
                            <span className="font-medium text-foreground">0</span> turns it off.
                          </p>
                          <Select
                            value={String(sanitizeReviewBatch)}
                            onValueChange={(v) => setSanitizeReviewBatch(parseInt(v, 10) || 0)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 10, 15, 20, 25, 35, 50, 75, 100].map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n === 0 ? "Off (0)" : String(n)}
                                </SelectItem>
                              ))}
                              {![0, 10, 15, 20, 25, 35, 50, 75, 100].includes(sanitizeReviewBatch) ? (
                                <SelectItem value={String(sanitizeReviewBatch)}>Custom ({sanitizeReviewBatch})</SelectItem>
                              ) : null}
                            </SelectContent>
                          </Select>
                        </div>
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
                    <CardTitle>Sent emails log</CardTitle>
                    <CardDescription>
                      Opens and clicks are counted when recipients load the tracking pixel or follow wrapped links (see{" "}
                      <code className="text-xs">docs/sql/marketing_sends_tracking.sql</code>). Stored HTML may be truncated;
                      scripts are disabled in the preview.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="p-2 w-24">View</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Subject</th>
                          <th className="p-2 w-16 text-right">Opens</th>
                          <th className="p-2 w-16 text-right">Clicks</th>
                          <th className="p-2">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sends as Record<string, unknown>[]).map((row) => (
                          <tr key={String(row.id)} className="border-b border-border/60">
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => setSendLogView(row)}
                                title="View stored email body"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                            <td className="p-2">
                              <Badge variant={row.status === "sent" ? "default" : "destructive"}>
                                {String(row.status ?? "—")}
                              </Badge>
                            </td>
                            <td className="p-2 max-w-xs truncate">{String(row.subject_snapshot || "—")}</td>
                            <td className="p-2 text-right tabular-nums text-muted-foreground">
                              {row.status === "sent" ? String(row.open_count ?? 0) : "—"}
                            </td>
                            <td className="p-2 text-right tabular-nums text-muted-foreground">
                              {row.status === "sent" ? String(row.click_count ?? 0) : "—"}
                            </td>
                            <td className="p-2 text-xs text-muted-foreground">
                              {String(row.sent_at || row.created_at || "—")}
                            </td>
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
                      <AlertCircle className="h-5 w-5" /> Problems log
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
      </AdminPageContent>

      <Dialog
        open={testSendOpen}
        onOpenChange={(open) => {
          setTestSendOpen(open);
          if (!open) {
            setTestSendCampaign(null);
            setTestSendLoading(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send test email</DialogTitle>
            <DialogDescription>
              {testSendCampaign
                ? `Campaign “${testSendCampaign.name}”. Uses the API server’s SMTP or email-service configuration.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="test-send-to">Recipient</Label>
            <Input
              id="test-send-to"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={testSendTo}
              onChange={(e) => setTestSendTo(e.target.value)}
              disabled={testSendLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitTestSend();
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setTestSendOpen(false)} disabled={testSendLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitTestSend()} disabled={testSendLoading || !testSendCampaign}>
              {testSendLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> : null}
              Send test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!bulkLeadDialog}
        onOpenChange={(open) => {
          if (!open) {
            setBulkLeadDialog(null);
            setBulkLeadSelectValue("");
            setBulkLeadSubmitting(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkLeadDialog?.field === "campaign_id"
                ? "Set campaign for selected leads"
                : bulkLeadDialog?.field === "sanitization_status"
                  ? "Set review status"
                  : "Set email send status"}
            </DialogTitle>
            <DialogDescription>
              {bulkLeadDialog
                ? `Applies to ${bulkLeadDialog.ids.length} selected contact(s).`
                : ""}
              {bulkLeadDialog?.field === "campaign_id" && !campaigns.length ? (
                <span className="block mt-2 text-amber-600 dark:text-amber-500">
                  Create a campaign on the Campaigns tab before assigning contacts.
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {bulkLeadDialog?.field === "campaign_id" ? (
              <>
                <Label htmlFor="bulk-campaign">Campaign</Label>
                <Select value={bulkLeadSelectValue} onValueChange={setBulkLeadSelectValue}>
                  <SelectTrigger id="bulk-campaign">
                    <SelectValue placeholder="Choose campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No campaign (clear)</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.is_paused ? " (paused)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Paused campaigns can be assigned for organization; the send cron only emails contacts on active
                  campaigns.
                </p>
              </>
            ) : null}
            {bulkLeadDialog?.field === "sanitization_status" ? (
              <>
                <Label htmlFor="bulk-review">Review status</Label>
                <Select value={bulkLeadSelectValue} onValueChange={setBulkLeadSelectValue}>
                  <SelectTrigger id="bulk-review">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="review">Needs review</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : null}
            {bulkLeadDialog?.field === "lead_status_internal" ? (
              <>
                <Label htmlFor="bulk-send-status">Send pipeline status</Label>
                <Select value={bulkLeadSelectValue} onValueChange={setBulkLeadSelectValue}>
                  <SelectTrigger id="bulk-send-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="bounced">Bounced</SelectItem>
                    <SelectItem value="opt_out">Opt out</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBulkLeadDialog(null);
                setBulkLeadSelectValue("");
              }}
              disabled={bulkLeadSubmitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitBulkLeadDialog()} disabled={bulkLeadSubmitting}>
              {bulkLeadSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> : null}
              Apply to selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!sendLogView}
        onOpenChange={(open) => {
          if (!open) setSendLogView(null);
        }}
      >
        <DialogContent className="max-h-[92vh] flex flex-col gap-0 overflow-hidden sm:max-w-4xl">
          <DialogHeader className="shrink-0 space-y-2 pr-2">
            <DialogTitle className="line-clamp-2 text-left">
              {sendLogView ? String(sendLogView.subject_snapshot || "Sent email") : ""}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1 text-left text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Status:</span>{" "}
                  {sendLogView ? String(sendLogView.status ?? "—") : ""}
                  {sendLogView?.error_message ? (
                    <>
                      {" "}
                      ·{" "}
                      <span className="text-destructive">
                        {String(sendLogView.error_message)}
                      </span>
                    </>
                  ) : null}
                </p>
                <p>
                  <span className="font-medium text-foreground">When:</span>{" "}
                  {sendLogView ? String(sendLogView.sent_at || sendLogView.created_at || "—") : ""}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[280px] flex-1 overflow-hidden rounded-md border bg-background">
            <iframe
              title="Email HTML preview"
              sandbox=""
              className="h-[min(65vh,560px)] w-full bg-white"
              srcDoc={
                typeof sendLogView?.body_html_snapshot === "string" && String(sendLogView.body_html_snapshot).trim()
                  ? String(sendLogView.body_html_snapshot)
                  : '<p style="padding:1.25rem;font-family:system-ui,sans-serif;color:#64748b;font-size:14px;">No HTML snapshot was stored for this send (e.g. skipped or failed before render).</p>'
              }
            />
          </div>
          <DialogFooter className="shrink-0 pt-4">
            <Button type="button" variant="outline" onClick={() => setSendLogView(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={manualLeadOpen}
        onOpenChange={(open) => {
          setManualLeadOpen(open);
          if (!open) setManualLeadSaving(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
            <DialogDescription>
              Creates a marketing lead (or updates the existing row if this email is already in the list). Campaign
              defaults match your Find on Google settings when you choose &quot;Default&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label htmlFor="manual-lead-email">Email</Label>
              <Input
                id="manual-lead-email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={manualLeadEmail}
                onChange={(e) => setManualLeadEmail(e.target.value)}
                disabled={manualLeadSaving}
              />
            </div>
            <div>
              <Label htmlFor="manual-lead-name">Full name (optional)</Label>
              <Input
                id="manual-lead-name"
                value={manualLeadFullName}
                onChange={(e) => setManualLeadFullName(e.target.value)}
                disabled={manualLeadSaving}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <Label htmlFor="manual-lead-company">Company (optional)</Label>
              <Input
                id="manual-lead-company"
                value={manualLeadCompany}
                onChange={(e) => setManualLeadCompany(e.target.value)}
                disabled={manualLeadSaving}
              />
            </div>
            <div>
              <Label htmlFor="manual-lead-title">Job title (optional)</Label>
              <Input
                id="manual-lead-title"
                value={manualLeadJobTitle}
                onChange={(e) => setManualLeadJobTitle(e.target.value)}
                disabled={manualLeadSaving}
              />
            </div>
            <div>
              <Label htmlFor="manual-lead-campaign">Campaign</Label>
              <Select value={manualLeadCampaignId} onValueChange={setManualLeadCampaignId} disabled={manualLeadSaving}>
                <SelectTrigger id="manual-lead-campaign">
                  <SelectValue placeholder="Campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Default (settings / active campaign)</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.is_paused ? " (paused)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="manual-lead-sanitize"
                type="checkbox"
                checked={manualLeadSanitize}
                onChange={(e) => setManualLeadSanitize(e.target.checked)}
                disabled={manualLeadSaving}
              />
              <Label htmlFor="manual-lead-sanitize" className="text-sm font-normal cursor-pointer">
                Run AI sanitization (slower; otherwise review status is accepted if the email is valid)
              </Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setManualLeadOpen(false)} disabled={manualLeadSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitManualLead()} disabled={manualLeadSaving}>
              {manualLeadSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> : null}
              Save contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={bulkSendConfirmOpen}
        onOpenChange={(open) => {
          setBulkSendConfirmOpen(open);
          if (!open) setBulkSendSubmitting(false);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Send campaign email to selected contacts?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <span className="block text-muted-foreground">
                This uses the same live send path as the marketing cron (SMTP / email service). Only rows that are{" "}
                <strong>pending</strong>, review <strong>accepted</strong>, on an <strong>active</strong> campaign, and
                not suppressed will receive mail. Others are reported in the result toast.
              </span>
              <span className="block">
                <Label htmlFor="bulk-send-max">Max sends this run (1–100)</Label>
                <Input
                  id="bulk-send-max"
                  type="number"
                  min={1}
                  max={100}
                  className="mt-1 max-w-[120px]"
                  value={bulkSendMaxInput}
                  onChange={(e) => setBulkSendMaxInput(e.target.value)}
                  disabled={bulkSendSubmitting}
                />
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end">
            <AlertDialogCancel disabled={bulkSendSubmitting}>Cancel</AlertDialogCancel>
            <Button type="button" disabled={bulkSendSubmitting} onClick={() => void executeBulkSendSelected()}>
              {bulkSendSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> : null}
              Send emails
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MarketingOutbound;
