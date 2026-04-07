"use client";

import { useEffect, useState } from "react";

interface Analytics {
  analyses: { today: number; week: number; month: number; total: number };
  topRepos: { input: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  errorRate: number;
  avgDuration: number;
  totalTokens: number;
  totalRequests: number;
}

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/admin/login"; throw new Error(""); }
        return r.json();
      })
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <p className="text-muted text-sm">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {/* Analysis volume */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Today", value: data.analyses.today },
          { label: "This Week", value: data.analyses.week },
          { label: "This Month", value: data.analyses.month },
          { label: "All Time", value: data.analyses.total },
        ].map((s) => (
          <div key={s.label} className="border border-border rounded-xl p-4 bg-white text-center">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Referrers */}
        <div>
          <h2 className="font-semibold mb-3">Top Referrers</h2>
          {data.topReferrers.length === 0 ? (
            <p className="text-sm text-muted">No referrer data yet.</p>
          ) : (
            <div className="border border-border rounded-xl bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted">Source</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-muted">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topReferrers.slice(0, 15).map((r) => (
                    <tr key={r.referrer} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 px-3 text-xs truncate max-w-[200px]">{r.referrer}</td>
                      <td className="py-1.5 px-3 text-xs text-right">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Performance */}
        <div>
          <h2 className="font-semibold mb-3">Performance</h2>
          <div className="border border-border rounded-xl bg-white p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Avg analysis duration</span>
              <span className="font-medium">{(data.avgDuration / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Error rate</span>
              <span className={`font-medium ${data.errorRate > 10 ? "text-error" : "text-success"}`}>
                {data.errorRate}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Total tokens used</span>
              <span className="font-medium">{data.totalTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Total page requests</span>
              <span className="font-medium">{data.totalRequests.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
