import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import AdminDesktopSidebar from "@/components/AdminDesktopSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, FileText, ChevronLeft, ChevronRight, Menu } from "lucide-react";

type SurveyRow = {
  id: string;
  created_at: string;
  email: string | null;
  company: string | null;
  role: string | null;
  company_size: string | null;
  primary_goal: string | null;
  interests: string[] | null;
  referral_source: string;
  referral_source_other: string | null;
  profiles?: { full_name?: string | null } | null;
};

type Pagination = { page: number; limit: number; total: number; pages: number };

type Summary = {
  range: string;
  total: number;
  byReferralSource: Record<string, number>;
  byCompanySize: Record<string, number>;
  byRole: Record<string, number>;
  byPrimaryGoal: Record<string, number>;
  topInterests: Array<{ interest: string; count: number }>;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const OnboardingSurveys = () => {
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "365d">("90d");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0,
  });
  const [summary, setSummary] = useState<Summary | null>(null);

  const topReferralSources = useMemo(() => {
    const src = summary?.byReferralSource ?? {};
    return Object.entries(src)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [summary]);

  const fetchAll = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      const [summaryResp, listResp] = await Promise.all([
        api.admin.getOnboardingSurveysSummary(range),
        api.admin.getOnboardingSurveys(pagination.page, pagination.limit),
      ]);

      if ((summaryResp as any)?.success && (summaryResp as any)?.data) {
        setSummary((summaryResp as any).data as Summary);
      }

      if ((listResp as any)?.success && (listResp as any)?.data?.surveys) {
        setSurveys((listResp as any).data.surveys as SurveyRow[]);
        setPagination((prev) => ({
          ...prev,
          ...(listResp as any).data.pagination,
        }));
      }
    } catch (error) {
      console.error("Failed to load onboarding surveys:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load onboarding surveys.",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, pagination.page]);

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-[#0B1026] dark:via-[#1A1033] dark:to-[#0C1226] relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl opacity-40" />
      </div>

      <AdminDesktopSidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Mobile Sidebar (dashboard-style, but used across admin pages for small screens) */}
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen((v) => !v)}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg border border-border bg-card/90 text-muted-foreground shadow-soft-elevated backdrop-blur-xl hover:bg-accent hover:text-accent-foreground md:hidden dark:bg-black/70 dark:border-white/10 dark:text-white"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={{}}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={
          {
            // Only apply sidebar offset on desktop, matching AdminDesktopSidebar's fixed width.
            "--admin-sidebar-offset": isCollapsed ? "80px" : "320px",
          } as React.CSSProperties
        }
        className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible lg:ml-[var(--admin-sidebar-offset)] lg:w-[calc(100%-var(--admin-sidebar-offset))]"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6 max-w-7xl mx-auto"
        >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-semibold">Onboarding Surveys</h1>
                    <Badge variant="secondary">
                      {summary ? `${summary.total} in ${summary.range}` : "Loading…"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    See how new users discovered SpareFinder and what they’re trying to achieve.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Select value={range} onValueChange={(v) => setRange(v as any)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="365d">Last 365 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => fetchAll({ silent: true })}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="border-border bg-card/90 backdrop-blur-xl shadow-soft-elevated">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Top referral sources</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {topReferralSources.length ? (
                      topReferralSources.map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-sm">
                          <span className="truncate">{k}</span>
                          <span className="font-semibold">{v}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No data yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card/90 backdrop-blur-xl shadow-soft-elevated">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Top interests</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(summary?.topInterests ?? []).slice(0, 5).map((i) => (
                      <div key={i.interest} className="flex items-center justify-between text-sm">
                        <span className="truncate">{i.interest}</span>
                        <span className="font-semibold">{i.count}</span>
                      </div>
                    ))}
                    {!summary?.topInterests?.length ? (
                      <p className="text-sm text-muted-foreground">No data yet.</p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card/90 backdrop-blur-xl shadow-soft-elevated">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Submissions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-3xl font-semibold">{summary?.total ?? 0}</div>
                    <p className="text-sm text-muted-foreground">Total received in selected range</p>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <Card className="border-border bg-card/90 backdrop-blur-xl shadow-soft-elevated">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Responses</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                        }
                        disabled={pagination.page <= 1 || isLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {pagination.page} / {Math.max(1, pagination.pages || 1)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPagination((p) => ({
                            ...p,
                            page: Math.min(Math.max(1, p.pages || 1), p.page + 1),
                          }))
                        }
                        disabled={pagination.page >= (pagination.pages || 1) || isLoading}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Goal</TableHead>
                            <TableHead>Referral</TableHead>
                            <TableHead>Interests</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {surveys.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="whitespace-nowrap">
                                {formatDate(s.created_at)}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium">
                                  {s.profiles?.full_name || "—"}
                                </div>
                                <div className="text-xs text-muted-foreground">{s.email || "—"}</div>
                              </TableCell>
                              <TableCell>{s.company || "—"}</TableCell>
                              <TableCell>{s.primary_goal || "—"}</TableCell>
                              <TableCell>
                                {s.referral_source}
                                {s.referral_source === "other" && s.referral_source_other
                                  ? `: ${s.referral_source_other}`
                                  : ""}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {(s.interests || []).slice(0, 4).map((i) => (
                                    <Badge key={`${s.id}-${i}`} variant="secondary">
                                      {i}
                                    </Badge>
                                  ))}
                                  {(s.interests || []).length > 4 ? (
                                    <Badge variant="secondary">
                                      +{(s.interests || []).length - 4}
                                    </Badge>
                                  ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {!surveys.length ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                No survey responses yet.
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default OnboardingSurveys;


