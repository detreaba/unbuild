"use client";

import { useEffect, useState } from "react";

export default function AdminLimits() {
  const [config, setConfig] = useState({
    enabled: true,
    requestsPerMinute: 5,
    requestsPerHour: 30,
    allowedIps: [] as string[],
  });
  const [newIp, setNewIp] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/admin/login"; throw new Error(""); }
        return r.json();
      })
      .then((data) => setConfig({ ...config, ...data.rateLimits }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rateLimits: config }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addIp() {
    if (newIp && !config.allowedIps.includes(newIp)) {
      setConfig({ ...config, allowedIps: [...config.allowedIps, newIp] });
      setNewIp("");
    }
  }

  function removeIp(ip: string) {
    setConfig({
      ...config,
      allowedIps: config.allowedIps.filter((i) => i !== ip),
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Rate Limiting</h1>

      <div className="border border-border rounded-xl p-6 bg-white space-y-5 max-w-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable Rate Limiting</p>
            <p className="text-xs text-muted">Limit requests per IP to prevent abuse</p>
          </div>
          <button
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              config.enabled ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                config.enabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-muted block mb-1">
            Requests per minute: {config.requestsPerMinute}
          </label>
          <input
            type="range"
            min="1"
            max="30"
            value={config.requestsPerMinute}
            onChange={(e) =>
              setConfig({ ...config, requestsPerMinute: parseInt(e.target.value) })
            }
            className="w-full accent-accent"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted block mb-1">
            Requests per hour: {config.requestsPerHour}
          </label>
          <input
            type="range"
            min="5"
            max="200"
            value={config.requestsPerHour}
            onChange={(e) =>
              setConfig({ ...config, requestsPerHour: parseInt(e.target.value) })
            }
            className="w-full accent-accent"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted block mb-1">IP Allowlist</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="192.168.1.1"
              className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm"
              onKeyDown={(e) => e.key === "Enter" && addIp()}
            />
            <button
              onClick={addIp}
              className="px-3 py-1.5 border border-border rounded-lg text-sm text-muted hover:text-foreground"
            >
              Add
            </button>
          </div>
          {config.allowedIps.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {config.allowedIps.map((ip) => (
                <span
                  key={ip}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface rounded text-xs font-mono"
                >
                  {ip}
                  <button onClick={() => removeIp(ip)} className="text-muted hover:text-error">
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={save}
          className="px-6 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors"
        >
          {saved ? "Saved!" : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
