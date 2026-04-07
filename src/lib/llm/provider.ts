import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export async function callLLM(
  messages: LLMMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }
): Promise<LLMResponse> {
  const provider = getProvider();
  return provider(messages, options);
}

type LLMProvider = (
  messages: LLMMessage[],
  options?: { temperature?: number; maxTokens?: number; model?: string }
) => Promise<LLMResponse>;

function getProvider(): LLMProvider {
  // Check admin store keys first (runtime-configured)
  try {
    const { getDecryptedApiKey } = require("@/lib/admin/store");
    const adminAnthropicKey = getDecryptedApiKey("anthropic");
    if (adminAnthropicKey) {
      // Inject into process.env so the provider picks it up
      process.env.ANTHROPIC_API_KEY = adminAnthropicKey;
    }
    const adminOpenRouterKey = getDecryptedApiKey("openrouter");
    if (adminOpenRouterKey) {
      process.env.OPENROUTER_API_KEY = adminOpenRouterKey;
    }
    const adminOpenAIKey = getDecryptedApiKey("openai");
    if (adminOpenAIKey) {
      process.env.OPENAI_API_KEY = adminOpenAIKey;
    }
    const adminGoogleKey = getDecryptedApiKey("google");
    if (adminGoogleKey) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = adminGoogleKey;
    }
  } catch {
    // Admin store not available (e.g., client-side or first run)
  }

  if (process.env.OPENROUTER_API_KEY) return openRouterProvider;
  if (process.env.ANTHROPIC_API_KEY) return anthropicProvider;
  if (process.env.OPENAI_API_KEY) return openAIProvider;
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return googleProvider;
  if (process.env.OLLAMA_URL) return ollamaProvider;

  // Fallback: use Claude Code CLI (uses user's subscription)
  return claudeCodeProvider;
}

const openRouterProvider: LLMProvider = async (messages, options) => {
  const model =
    options?.model ||
    process.env.OPENROUTER_MODEL ||
    "anthropic/claude-sonnet-4";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://unbuild.tech",
      "X-Title": "UnBuild",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 16000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    model: data.model || model,
    usage: data.usage,
  };
};

const anthropicProvider: LLMProvider = async (messages, options) => {
  const model = options?.model || "claude-sonnet-4-20250514";
  const system = messages.find((m) => m.role === "system")?.content || "";
  const nonSystem = messages.filter((m) => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system,
      messages: nonSystem,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 16000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    content: data.content[0].text,
    model: data.model,
    usage: {
      prompt_tokens: data.usage.input_tokens,
      completion_tokens: data.usage.output_tokens,
    },
  };
};

const openAIProvider: LLMProvider = async (messages, options) => {
  const model = options?.model || "gpt-4.1";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 16000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    model: data.model,
    usage: data.usage,
  };
};

const googleProvider: LLMProvider = async (messages, options) => {
  const model = options?.model || "gemini-2.5-pro";
  const system = messages.find((m) => m.role === "system")?.content || "";
  const nonSystem = messages.filter((m) => m.role !== "system");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: nonSystem.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: options?.temperature ?? 0.3,
          maxOutputTokens: options?.maxTokens ?? 16000,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google AI ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    content: data.candidates[0].content.parts[0].text,
    model,
  };
};

const ollamaProvider: LLMProvider = async (messages, options) => {
  const baseUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const model = options?.model || process.env.OLLAMA_MODEL || "llama3.1";

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.3,
        num_predict: options?.maxTokens ?? 16000,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    content: data.message.content,
    model: data.model || model,
  };
};

const claudeCodeProvider: LLMProvider = async (messages) => {
  const { spawn } = await import("child_process");

  const parts: string[] = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      parts.push(`<system>\n${msg.content}\n</system>`);
    } else if (msg.role === "user") {
      parts.push(msg.content);
    } else if (msg.role === "assistant") {
      parts.push(`<assistant>\n${msg.content}\n</assistant>`);
    }
  }
  const prompt = parts.join("\n\n");

  return new Promise<LLMResponse>((resolve, reject) => {
    const child = spawn("claude", ["-p", "--bare", "--output-format", "text"], {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    child.on("close", (code: number) => {
      if (code !== 0) {
        reject(new Error(`Claude Code exited ${code}: ${stderr}`));
      } else {
        resolve({ content: stdout.trim(), model: "claude-code (subscription)" });
      }
    });

    child.on("error", (err: Error) => reject(err));

    child.stdin.write(prompt);
    child.stdin.end();

    setTimeout(() => {
      child.kill();
      reject(new Error("Claude Code timed out after 5 minutes"));
    }, 300000);
  });
};
