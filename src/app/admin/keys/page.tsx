"use client";

import { useEffect, useState } from "react";
import { Key, Plus, Trash2, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface ApiKey {
  id: string;
  provider: string;
  key: string;
  label: string;
  addedAt: string;
  lastTestedAt?: string;
  lastTestResult?: "ok" | "error";
  active: boolean;
}

export default function AdminKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newProvider, setNewProvider] = useState("anthropic");
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    const res = await fetch("/api/admin/keys");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const data = await res.json();
    setKeys(data.keys);
  }

  async function addKey() {
    await fetch("/api/admin/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: newProvider,
        key: newKey,
        label: newLabel || newProvider,
      }),
    });
    setNewKey("");
    setNewLabel("");
    setShowAdd(false);
    loadKeys();
  }

  async function deleteKey(id: string) {
    await fetch("/api/admin/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadKeys();
  }

  async function testKey(id: string, provider: string) {
    setTesting(id);
    await fetch("/api/admin/keys/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, provider }),
    });
    setTesting(null);
    loadKeys();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors"
        >
          <Plus size={14} /> Add Key
        </button>
      </div>

      {/* Add key form */}
      {showAdd && (
        <div className="border border-border rounded-xl p-4 bg-white mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-white"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openrouter">OpenRouter</option>
              <option value="openai">OpenAI</option>
              <option value="google">Google</option>
            </select>
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="API key"
              className="px-3 py-2 border border-border rounded-lg text-sm"
            />
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (optional)"
              className="px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addKey}
              disabled={!newKey}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 border border-border rounded-lg text-sm text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="border border-border rounded-xl p-8 bg-white text-center">
          <Key size={32} className="mx-auto text-muted/30 mb-3" />
          <p className="text-muted text-sm">No API keys configured</p>
          <p className="text-xs text-muted/60 mt-1">
            Add an API key to start using UnBuild. Keys from .env.local are also used as fallback.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div
              key={k.id}
              className="border border-border rounded-xl p-4 bg-white flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{k.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-muted font-mono">
                    {k.provider}
                  </span>
                  {k.active && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">
                      active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted font-mono mt-1">{k.key}</p>
                {k.lastTestedAt && (
                  <p className="text-[10px] text-muted/60 mt-1">
                    Last tested: {new Date(k.lastTestedAt).toLocaleString()}
                    {k.lastTestResult === "ok" ? " ✓" : " ✗"}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => testKey(k.id, k.provider)}
                  disabled={testing === k.id}
                  className="p-2 text-muted hover:text-foreground transition-colors"
                  title="Test key"
                >
                  {testing === k.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : k.lastTestResult === "ok" ? (
                    <CheckCircle size={16} className="text-success" />
                  ) : k.lastTestResult === "error" ? (
                    <XCircle size={16} className="text-error" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                </button>
                <button
                  onClick={() => deleteKey(k.id)}
                  className="p-2 text-muted hover:text-error transition-colors"
                  title="Delete key"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
