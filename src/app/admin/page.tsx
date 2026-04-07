"use client";

import { useEffect, useState } from "react";
import { Activity, GitFork, Clock, AlertTriangle } from "lucide-react";

interface DashboardData {
  analyses: { today: number; week: number; month: number; total: number };
  errorRate: number;
  avgDuration: number;
  totalTokens: number;
  totalRequests: number;
  topRepos: { input: string; count: number }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/admin/login";
          throw new Error("Unauthorized");
        }
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-error text-sm">{error}</p>;
  if (!data) return <p className="text-muted text-sm">Loading...</p>;

  const stats = [
    { label: "Today", value: data.analyses.today, icon: Activity },
    { label: "This Week", value: data.analyses.week, icon: Activity },
    { label: "All Time", value: data.analyses.total, icon: GitFork },
    { label: "Avg Duration", value: `${Math.round(data.avgDuration / 1000)}s`, icon: Clock },
    { label: "Error Rate", value: `${data.errorRate}%`, icon: AlertTriangle },
    { label: "Total Requests", value: data.totalRequests, icon: Activity },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border border-border rounded-xl p-4 bg-white"
          >
            <div className="flex items-center gap-2 text-muted mb-1">
              <stat.icon size={14} />
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mb-3">Top Analyzed Repos</h2>
      {data.topRepos.length === 0 ? (
        <p className="text-sm text-muted">No analyses yet.</p>
      ) : (
        <div className="border border-border rounded-xl bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left py-2 px-4 font-medium text-muted">Repo / URL</th>
                <th className="text-right py-2 px-4 font-medium text-muted">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.topRepos.map((repo) => (
                <tr key={repo.input} className="border-b border-border/50 last:border-0">
                  <td className="py-2 px-4 font-mono text-xs">{repo.input}</td>
                  <td className="py-2 px-4 text-right">{repo.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
