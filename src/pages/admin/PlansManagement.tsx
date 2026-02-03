import React, { useState, useEffect } from "react";
import AdminDesktopSidebar from "@/components/AdminDesktopSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { SpinningLogoLoader } from "@/components/brand/spinning-logo-loader";
import { Loader2, Menu, Pencil } from "lucide-react";

interface DbPlan {
  id: string;
  tier: string;
  name: string;
  price: string | number;
  currency: string;
  period: string;
  description: string | null;
  features: string[];
  popular: boolean;
  color: string | null;
  limits_searches: number;
  limits_api_calls: number;
  limits_storage_mb: number;
  trial_days: number | null;
  trial_price: string | number | null;
  display_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

const PlansManagement = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState<DbPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DbPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<DbPlan>>({});
  const { toast } = useToast();

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.admin.listPlans();
      if (res?.success && Array.isArray((res as any).data?.plans)) {
        setPlans((res as any).data.plans);
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Failed to load plans" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openEdit = (plan: DbPlan) => {
    setEditing(plan);
    setForm({
      tier: plan.tier,
      name: plan.name,
      price: typeof plan.price === "string" ? parseFloat(plan.price) : plan.price,
      currency: plan.currency,
      period: plan.period,
      description: plan.description ?? "",
      features: Array.isArray(plan.features) ? plan.features : [],
      popular: plan.popular,
      color: plan.color ?? "",
      limits_searches: plan.limits_searches,
      limits_api_calls: plan.limits_api_calls,
      limits_storage_mb: plan.limits_storage_mb,
      trial_days: plan.trial_days,
      trial_price: plan.trial_price != null ? (typeof plan.trial_price === "string" ? parseFloat(plan.trial_price) : plan.trial_price) : undefined,
      display_order: plan.display_order,
      active: plan.active,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {};
      const tierVal = (form.tier ?? editing.tier ?? "").toString().trim();
      if (tierVal) payload.tier = tierVal;
      if (form.name !== undefined) payload.name = form.name;
      if (form.price !== undefined) payload.price = form.price;
      if (form.currency !== undefined) payload.currency = form.currency;
      if (form.period !== undefined) payload.period = form.period;
      if (form.description !== undefined) payload.description = form.description;
      if (form.features !== undefined) payload.features = form.features;
      if (form.popular !== undefined) payload.popular = form.popular;
      if (form.color !== undefined) payload.color = form.color;
      if (form.limits_searches !== undefined) payload.limits_searches = form.limits_searches;
      if (form.limits_api_calls !== undefined) payload.limits_api_calls = form.limits_api_calls;
      if (form.limits_storage_mb !== undefined) payload.limits_storage_mb = form.limits_storage_mb;
      if (form.trial_days !== undefined) payload.trial_days = form.trial_days;
      if (form.trial_price !== undefined) payload.trial_price = form.trial_price;
      if (form.display_order !== undefined) payload.display_order = form.display_order;
      if (form.active !== undefined) payload.active = form.active;

      await api.admin.updatePlan(editing.id, payload as any);
      toast({ title: "Saved", description: "Plan updated successfully" });
      setEditing(null);
      fetchPlans();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Failed to update plan" });
    } finally {
      setSaving(false);
    }
  };

  const featuresStr = Array.isArray(form.features) ? form.features.join("\n") : "";
  const setFeaturesStr = (s: string) => setForm((f) => ({ ...f, features: s.split("\n").filter(Boolean) }));

  if (loading && plans.length === 0) {
    return <SpinningLogoLoader label="Loading plans…" />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminDesktopSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <button
        type="button"
        onClick={() => setIsMobileMenuOpen((o) => !o)}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg border border-border bg-card/90 text-muted-foreground shadow-sm md:hidden"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <main
        className="flex-1 p-4 md:p-6 lg:p-8"
        style={{
          marginLeft: isCollapsed ? "80px" : "320px",
        }}
      >
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pricing plans</h1>
            <p className="text-muted-foreground">
              Edit plan names, prices, features, and limits. Changes appear on the landing and billing pages.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Plans</CardTitle>
              <CardDescription>Click Edit to change a plan. Frontend fetches these from the API.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Searches</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-mono text-muted-foreground">{plan.tier}</TableCell>
                      <TableCell>{plan.name}</TableCell>
                      <TableCell>
                        £{typeof plan.price === "string" ? parseFloat(plan.price).toFixed(2) : Number(plan.price).toFixed(2)}/{plan.period}
                      </TableCell>
                      <TableCell>{plan.limits_searches === -1 ? "Unlimited" : plan.limits_searches}</TableCell>
                      <TableCell>{plan.active ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit plan</DialogTitle>
            <DialogDescription>
              {editing && `Editing "${editing.name}". Change tier, name, price, and more.`}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Tier (internal key)</Label>
                <Input
                  value={form.tier ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
                  placeholder="e.g. free, pro, enterprise"
                  className="font-mono"
                />
              </div>
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={form.name ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Starter / Basic"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label>Price (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.price ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Period</Label>
                  <Input
                    value={form.period ?? "month"}
                    onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                    placeholder="month"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description"
                />
              </div>
              <div className="grid gap-2">
                <Label>Features (one per line)</Label>
                <textarea
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={featuresStr}
                  onChange={(e) => setFeaturesStr(e.target.value)}
                  placeholder="20 analyses per month&#10;Web portal access"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-2">
                  <Label>Searches limit</Label>
                  <Input
                    type="number"
                    value={form.limits_searches ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, limits_searches: parseInt(e.target.value, 10) || 0 }))}
                    placeholder="-1 = unlimited"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>API calls</Label>
                  <Input
                    type="number"
                    value={form.limits_api_calls ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, limits_api_calls: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Storage (MB)</Label>
                  <Input
                    type="number"
                    value={form.limits_storage_mb ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, limits_storage_mb: parseInt(e.target.value, 10) || 0 }))}
                    placeholder="-1 = unlimited"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Color (Tailwind classes)</Label>
                <Input
                  value={form.color ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  placeholder="from-purple-600 to-blue-600"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.popular ?? false}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, popular: v }))}
                />
                <Label>Mark as popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active ?? true}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                />
                <Label>Active (shown on site)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlansManagement;
