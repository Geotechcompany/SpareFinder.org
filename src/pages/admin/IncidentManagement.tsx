import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

type Incident = { id: string; title: string; severity: string; status: string; started_at: string };
type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";

const IncidentManagement = () => {
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"minor" | "major" | "critical">("minor");
  const [isSaving, setIsSaving] = useState(false);

  const loadIncidents = async () => {
    const response = await adminApi.getIncidents();
    setIncidents((response.data as { incidents?: Incident[] } | undefined)?.incidents ?? []);
  };

  useEffect(() => {
    void loadIncidents();
  }, []);

  const createIncident = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !message.trim()) return;
    try {
      setIsSaving(true);
      await adminApi.createIncident({ title: title.trim(), message: message.trim(), severity, status: "investigating" });
      setTitle("");
      setMessage("");
      await loadIncidents();
      toast({ title: "Incident published", description: "The status page now shows this incident." });
    } catch (error) {
      toast({ variant: "destructive", title: "Could not publish incident", description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (incident: Incident, status: IncidentStatus) => {
    try {
      await adminApi.updateIncident(incident.id, { status, message: `Status changed to ${status}.` });
      await loadIncidents();
    } catch {
      toast({ variant: "destructive", title: "Could not update incident" });
    }
  };

  return (
    <AdminPageContent className="max-w-5xl">
      <AdminPageHeader title="Incident status" description="Publish customer-facing incident updates on the public status page." breadcrumbPage="Incidents" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-brand" />New incident</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createIncident} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="incident-title">Title</Label><Input id="incident-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="incident-message">First update</Label><Textarea id="incident-message" value={message} onChange={(event) => setMessage(event.target.value)} /></div>
              <div className="space-y-2"><Label>Severity</Label><Select value={severity} onValueChange={(value) => setSeverity(value as typeof severity)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minor">Minor</SelectItem><SelectItem value="major">Major</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Publish incident</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Recent incidents</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {incidents.length === 0 ? <p className="text-sm text-muted-foreground">No incidents recorded.</p> : incidents.map((incident) => (
              <div key={incident.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{incident.title}</span><span className="text-sm capitalize text-muted-foreground">{incident.status}</span></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["investigating", "identified", "monitoring", "resolved"] as IncidentStatus[]).map((status) => <Button key={status} type="button" variant="outline" size="sm" disabled={incident.status === status} onClick={() => void changeStatus(incident, status)} className="capitalize">{status}</Button>)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminPageContent>
  );
};

export default IncidentManagement;
