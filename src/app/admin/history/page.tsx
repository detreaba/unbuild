"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { AnalysisLogEntry } from "@/lib/admin/types";

export default function AdminHistory() {
  const [entries, setEntries] = useState<AnalysisLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  async function loadHistory() {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
    });
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/history?${params}`);
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const data = await res.json();
    setEntries(data.entries);
    setTotal(data.total);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analysis History</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by repo or URL..."
          className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-white"
        />
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No analyses found.</p>
      ) : (
        <>
          <div className="border border-border rounded-xl bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-xs text-muted">
                  <th className="text-left py-2 px-3 font-medium">Time</th>
                  <th className="text-left py-2 px-3 font-medium">Input</th>
                  <th className="text-left py-2 px-3 font-medium">Type</th>
                  <th className="text-left py-2 px-3 font-medium">Model</th>
                  <th className="text-right py-2 px-3 font-medium">Duration</th>
                  <th className="text-center py-2 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-border/50 last:border-0 hover:bg-surface/50"
                  >
                    <td className="py-2 px-3 text-xs text-muted whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs max-w-[200px] truncate">
                      {e.input}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-muted">
                        {e.inputType}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted">{e.model}</td>
                    <td className="py-2 px-3 text-xs text-right text-muted">
                      {(e.duration / 1000).toFixed(1)}s
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          e.status === "success"
                            ? "bg-success/10 text-success"
                            : "bg-error/10 text-error"
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted">
              <span>
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 border border-border rounded text-xs disabled:opacity-30"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 border border-border rounded text-xs disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
