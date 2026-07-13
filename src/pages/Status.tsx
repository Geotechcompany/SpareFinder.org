import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type IncidentUpdate = {
  message: string;
  status: string;
  created_at: string;
};

type Incident = {
  id: string;
  title: string;
  severity: "minor" | "major" | "critical";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  started_at: string;
  resolved_at?: string | null;
  updates?: IncidentUpdate[];
};

type StatusResponse = {
  success: boolean;
  data?: {
    status: "operational" | "degraded";
    checked_at: string;
    components: Array<{ name: string; status: "operational" | "degraded" }>;
  };
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const Status = () => {
  const [systemStatus, setSystemStatus] = useState<StatusResponse["data"]>();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const [statusResponse, incidentsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/status`, { headers: { Accept: "application/json" } }),
          fetch(`${API_BASE_URL}/api/incidents`, { headers: { Accept: "application/json" } }),
        ]);
        const statusPayload = (await statusResponse.json()) as StatusResponse;
        const incidentPayload = (await incidentsResponse.json()) as {
          data?: { incidents?: Incident[] };
        };
        if (!cancelled) {
          setSystemStatus(statusPayload.data);
          setIncidents(incidentPayload.data?.incidents ?? []);
        }
      } catch {
        if (!cancelled) setSystemStatus(undefined);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadStatus();
    const timer = window.setInterval(() => void loadStatus(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const isOperational = systemStatus?.status === "operational";

  return (
    <div className="min-h-screen bg-background text-foreground dark:bg-black dark:text-white">
      <Header />
      <main className="bg-gradient-to-b from-background via-[#f0f4ff] to-background py-16 dark:via-[#07111f]">
        <div className="mx-auto max-w-4xl px-6">
          <header className="mb-10">
            <p className="text-sm font-semibold text-primary">System status</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
              SpareFinder service health
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground dark:text-slate-300">
              Current service availability and updates from our team.
            </p>
          </header>

          <section
            className={`rounded-2xl border p-6 ${
              isOperational
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-amber-500/30 bg-amber-500/10"
            }`}
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : isOperational ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              )}
              <div>
                <h2 className="text-lg font-semibold">
                  {isLoading
                    ? "Checking system status"
                    : isOperational
                      ? "All systems operational"
                      : "Service status needs attention"}
                </h2>
                <p className="text-sm text-muted-foreground dark:text-slate-300">
                  {systemStatus?.checked_at
                    ? `Last checked ${formatDate(systemStatus.checked_at)}`
                    : "Live status is temporarily unavailable. Please check back shortly."}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-border bg-card p-6 dark:border-white/10 dark:bg-white/5">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Activity className="h-5 w-5 text-primary" />
              Components
            </h2>
            <ul className="mt-4 space-y-3">
              {(systemStatus?.components ?? [
                { name: "SpareFinder web application", status: "degraded" },
                { name: "Analysis API", status: "degraded" },
              ]).map((component) => (
                <li key={component.name} className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3 dark:bg-black/20">
                  <span>{component.name}</span>
                  <span className={component.status === "operational" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>
                    {component.status === "operational" ? "Operational" : "Checking"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">Incidents and maintenance</h2>
            <div className="mt-4 space-y-4">
              {incidents.length === 0 ? (
                <p className="rounded-xl border border-border bg-card p-6 text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  No incidents have been reported.
                </p>
              ) : (
                incidents.map((incident) => (
                  <article key={incident.id} className="rounded-xl border border-border bg-card p-6 dark:border-white/10 dark:bg-white/5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{incident.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground dark:text-slate-300">
                          Started {formatDate(incident.started_at)}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-3 py-1 text-sm capitalize">{incident.status}</span>
                    </div>
                    {incident.updates?.[incident.updates.length - 1] && (
                      <p className="mt-4 text-sm text-muted-foreground dark:text-slate-300">
                        {incident.updates[incident.updates.length - 1].message}
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Status;
