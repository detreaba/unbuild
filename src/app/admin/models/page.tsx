"use client";

import { useEffect, useState } from "react";

const MODELS: Record<string, string[]> = {
  anthropic: [
    "claude-opus-4-6-20250616",
    "claude-sonnet-4-6-20250514",
    "claude-sonnet-4-5-20250514",
    "claude-opus-4-20250514",
    "claude-sonnet-4-20250514",
    "claude-haiku-4-5-20251001",
  ],
  openrouter: [
    "anthropic/claude-opus-4-6",
    "anthropic/claude-sonnet-4-6",
    "anthropic/claude-sonnet-4-5",
    "anthropic/claude-opus-4",
    "anthropic/claude-sonnet-4",
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash",
    "openai/gpt-4.1",
    "openai/o3-mini",
  ],
  openai: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini", "o3-mini", "o4-mini"],
  google: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
  ollama: ["llama3.1", "llama3.1:70b", "qwen3:32b", "deepseek-r1:32b", "codestral", "gemma3:27b"],
};

export default function AdminModels() {
  const [config, setConfig] = useState({
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    temperature: 0.3,
    maxTokens: 16000,
    fallbackModel: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/admin/login";
          throw new Error("Unauthorized");
        }
        return r.json();
      })
      .then((data) => setConfig({ ...config, ...data.model }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: config }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const availableModels = MODELS[config.provider] || [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Model Configuration</h1>

      <div className="border border-border rounded-xl p-6 bg-white space-y-5 max-w-lg">
        <div>
          <label className="text-xs font-medium text-muted block mb-1">Provider</label>
          <select
            value={config.provider}
            onChange={(e) =>
              setConfig({
                ...config,
                provider: e.target.value,
                model: MODELS[e.target.value]?.[0] || "",
              })
            }
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
          >
            <option value="anthropic">Anthropic</option>
            <option value="openrouter">OpenRouter</option>
            <option value="openai">OpenAI</option>
            <option value="google">Google</option>
            <option value="ollama">Ollama (Local)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted block mb-1">Model</label>
          <select
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
          >
            {availableModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted block mb-1">
            Temperature: {config.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.temperature}
            onChange={(e) =>
              setConfig({ ...config, temperature: parseFloat(e.target.value) })
            }
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-muted">
            <span>Precise (0)</span>
            <span>Creative (1)</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted block mb-1">
            Max Tokens: {config.maxTokens.toLocaleString()}
          </label>
          <input
            type="range"
            min="4000"
            max="32000"
            step="1000"
            value={config.maxTokens}
            onChange={(e) =>
              setConfig({ ...config, maxTokens: parseInt(e.target.value) })
            }
            className="w-full accent-accent"
          />
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
