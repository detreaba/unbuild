import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import type {
  AdminStore,
  ApiKeyEntry,
  AnalysisLogEntry,
  RequestLogEntry,
  ModelConfig,
  RateLimitConfig,
} from "./types";
import { DEFAULT_STORE } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "admin.json");
const MAX_HISTORY = 1000;
const MAX_REQUEST_LOG = 5000;

// --- Encryption ---

function getEncryptionKey(): Buffer {
  const password = process.env.ADMIN_PASSWORD || "unbuild-default-key";
  return crypto.scryptSync(password, "unbuild-salt", 32);
}

export function encryptValue(value: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decryptValue(encrypted: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, data] = encrypted.split(":");
  if (!ivHex || !tagHex || !data) return encrypted; // not encrypted
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 7) + "..." + key.slice(-4);
}

// --- Store CRUD ---

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): AdminStore {
  ensureDir();
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2));
    return { ...DEFAULT_STORE };
  }
  const raw = fs.readFileSync(STORE_PATH, "utf8");
  return JSON.parse(raw) as AdminStore;
}

function writeStore(store: AdminStore) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

// --- API Keys ---

export function getApiKeys(): Omit<ApiKeyEntry, "key">[] {
  const store = readStore();
  return store.apiKeys.map((k) => ({
    ...k,
    key: maskKey(decryptValue(k.key)),
  }));
}

export function getDecryptedApiKey(provider: string): string | null {
  const store = readStore();
  const entry = store.apiKeys.find((k) => k.provider === provider && k.active);
  if (!entry) return null;
  return decryptValue(entry.key);
}

export function addApiKey(
  provider: ApiKeyEntry["provider"],
  key: string,
  label: string
): ApiKeyEntry {
  const store = readStore();
  const entry: ApiKeyEntry = {
    id: crypto.randomUUID(),
    provider,
    key: encryptValue(key),
    label,
    addedAt: new Date().toISOString(),
    active: true,
  };
  // Deactivate other keys of same provider
  store.apiKeys = store.apiKeys.map((k) =>
    k.provider === provider ? { ...k, active: false } : k
  );
  store.apiKeys.push(entry);
  writeStore(store);
  return { ...entry, key: maskKey(key) };
}

export function deleteApiKey(id: string): boolean {
  const store = readStore();
  const before = store.apiKeys.length;
  store.apiKeys = store.apiKeys.filter((k) => k.id !== id);
  writeStore(store);
  return store.apiKeys.length < before;
}

export function updateApiKeyTestResult(
  id: string,
  result: "ok" | "error"
) {
  const store = readStore();
  const entry = store.apiKeys.find((k) => k.id === id);
  if (entry) {
    entry.lastTestedAt = new Date().toISOString();
    entry.lastTestResult = result;
    writeStore(store);
  }
}

// --- Model Config ---

export function getModelConfig(): ModelConfig {
  return readStore().modelConfig;
}

export function setModelConfig(config: Partial<ModelConfig>) {
  const store = readStore();
  store.modelConfig = { ...store.modelConfig, ...config };
  writeStore(store);
}

// --- Rate Limits ---

export function getRateLimits(): RateLimitConfig {
  return readStore().rateLimits;
}

export function setRateLimits(config: Partial<RateLimitConfig>) {
  const store = readStore();
  store.rateLimits = { ...store.rateLimits, ...config };
  writeStore(store);
}

// --- Analysis History ---

export function logAnalysis(entry: Omit<AnalysisLogEntry, "id">) {
  const store = readStore();
  store.analysisHistory.unshift({
    ...entry,
    id: crypto.randomUUID(),
  });
  // Cap history
  if (store.analysisHistory.length > MAX_HISTORY) {
    store.analysisHistory = store.analysisHistory.slice(0, MAX_HISTORY);
  }
  writeStore(store);
}

export function getAnalysisHistory(
  page = 1,
  pageSize = 20,
  search?: string
): { entries: AnalysisLogEntry[]; total: number } {
  const store = readStore();
  let entries = store.analysisHistory;
  if (search) {
    const q = search.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.input.toLowerCase().includes(q) ||
        (e.projectType && e.projectType.toLowerCase().includes(q))
    );
  }
  const total = entries.length;
  const start = (page - 1) * pageSize;
  return {
    entries: entries.slice(start, start + pageSize),
    total,
  };
}

// --- Request Log / Analytics ---

export function logRequest(entry: RequestLogEntry) {
  const store = readStore();
  store.requestLog.unshift(entry);
  if (store.requestLog.length > MAX_REQUEST_LOG) {
    store.requestLog = store.requestLog.slice(0, MAX_REQUEST_LOG);
  }
  writeStore(store);
}

export function getAnalytics() {
  const store = readStore();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const history = store.analysisHistory;
  const requests = store.requestLog;

  // Analysis stats
  const todayAnalyses = history.filter(
    (e) => now - new Date(e.timestamp).getTime() < day
  ).length;
  const weekAnalyses = history.filter(
    (e) => now - new Date(e.timestamp).getTime() < 7 * day
  ).length;
  const monthAnalyses = history.filter(
    (e) => now - new Date(e.timestamp).getTime() < 30 * day
  ).length;

  // Top repos
  const repoCounts = new Map<string, number>();
  for (const e of history) {
    repoCounts.set(e.input, (repoCounts.get(e.input) || 0) + 1);
  }
  const topRepos = [...repoCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([input, count]) => ({ input, count }));

  // Referrers
  const referrerCounts = new Map<string, number>();
  for (const r of requests) {
    const ref = r.referrer || "direct";
    referrerCounts.set(ref, (referrerCounts.get(ref) || 0) + 1);
  }
  const topReferrers = [...referrerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([referrer, count]) => ({ referrer, count }));

  // Error rate
  const errors = history.filter((e) => e.status === "error").length;
  const errorRate = history.length > 0 ? errors / history.length : 0;

  // Avg duration
  const successEntries = history.filter((e) => e.status === "success");
  const avgDuration =
    successEntries.length > 0
      ? successEntries.reduce((sum, e) => sum + e.duration, 0) /
        successEntries.length
      : 0;

  // Total tokens
  const totalTokens = history.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);

  return {
    analyses: {
      today: todayAnalyses,
      week: weekAnalyses,
      month: monthAnalyses,
      total: history.length,
    },
    topRepos,
    topReferrers,
    errorRate: Math.round(errorRate * 100),
    avgDuration: Math.round(avgDuration),
    totalTokens,
    totalRequests: requests.length,
  };
}

// --- Saved Results ---

const RESULTS_DIR = path.join(DATA_DIR, "results");

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function saveResult(
  input: string,
  inputType: "repo" | "website",
  data: Record<string, unknown>
): string {
  ensureDir();
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  const slug = slugify(input);
  const result = {
    slug,
    input,
    inputType,
    createdAt: new Date().toISOString(),
    data,
  };
  fs.writeFileSync(
    path.join(RESULTS_DIR, `${slug}.json`),
    JSON.stringify(result, null, 2)
  );
  return slug;
}

export function getResult(
  slug: string
): { slug: string; input: string; inputType: string; createdAt: string; data: Record<string, unknown> } | null {
  const filePath = path.join(RESULTS_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function listResults(): { slug: string; input: string; createdAt: string }[] {
  if (!fs.existsSync(RESULTS_DIR)) return [];
  const files = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith(".json"));
  return files
    .map((f) => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), "utf8"));
        return { slug: data.slug, input: data.input, createdAt: data.createdAt };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as { slug: string; input: string; createdAt: string }[];
}

// --- Rate Limit Check ---

const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const config = getRateLimits();
  if (!config.enabled) return { allowed: true };
  if (config.allowedIps.includes(ip)) return { allowed: true };

  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Clean old entries
  const minute = timestamps.filter((t) => now - t < 60000);
  const hour = timestamps.filter((t) => now - t < 3600000);

  if (minute.length >= config.requestsPerMinute) {
    return { allowed: false, retryAfter: 60 };
  }
  if (hour.length >= config.requestsPerHour) {
    return { allowed: false, retryAfter: 3600 };
  }

  // Record this request
  minute.push(now);
  rateLimitMap.set(ip, hour.concat(now));

  return { allowed: true };
}
