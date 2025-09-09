import React, { useEffect, useState } from "react";

interface JobItem {
  id: string;
  status: string;
  filename?: string;
  confidence_score?: number;
  processing_time_seconds?: number;
  precise_part_name?: string;
}

interface ApiResponse {
  success: boolean;
  results: JobItem[];
}

const API_BASE = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";

export default function PendingJobsTable() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/jobs/pending`);
      const data: ApiResponse = await res.json();
      if (!data.success) throw new Error("Failed to load jobs");
      setJobs(data.results || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const id = setInterval(fetchJobs, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Pending/Processing Analyses</h3>
        <button
          className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
          onClick={fetchJobs}
        >
          Refresh
        </button>
      </div>
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : jobs.length === 0 ? (
        <div className="text-sm text-gray-500">No pending jobs</div>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Job ID</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Part</th>
                <th className="text-left p-2">Confidence</th>
                <th className="text-left p-2">Time (s)</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{j.id}</td>
                  <td className="p-2">{j.status}</td>
                  <td className="p-2">{j.precise_part_name || "-"}</td>
                  <td className="p-2">{j.confidence_score ?? "-"}</td>
                  <td className="p-2">{j.processing_time_seconds ?? "-"}</td>
                  <td className="p-2">
                    <a
                      className="text-blue-600 hover:underline"
                      href={`?job=${encodeURIComponent(j.filename || j.id)}`}
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
