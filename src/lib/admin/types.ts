export interface ApiKeyEntry {
  id: string;
  provider: "anthropic" | "openrouter" | "openai" | "google";
  key: string; // encrypted
  label: string;
  addedAt: string;
  lastTestedAt?: string;
  lastTestResult?: "ok" | "error";
  active: boolean;
}

export interface ModelConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  fallbackModel?: string;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  requestsPerHour: number;
  allowedIps: string[];
}

export interface AnalysisLogEntry {
  id: string;
  timestamp: string;
  inputType: "repo" | "website";
  input: string;
  projectType?: string;
  filesAnalyzed?: number;
  totalFiles?: number;
  model: string;
  duration: number; // ms
  status: "success" | "error";
  error?: string;
  tokensUsed?: number;
  referrer?: string;
  userAgent?: string;
  ip?: string;
}

export interface RequestLogEntry {
  timestamp: string;
  path: string;
  referrer: string;
  userAgent: string;
  ip: string;
  country?: string;
}

export interface AdminStore {
  apiKeys: ApiKeyEntry[];
  modelConfig: ModelConfig;
  rateLimits: RateLimitConfig;
  analysisHistory: AnalysisLogEntry[];
  requestLog: RequestLogEntry[];
}

export const DEFAULT_STORE: AdminStore = {
  apiKeys: [],
  modelConfig: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    temperature: 0.3,
    maxTokens: 16000,
  },
  rateLimits: {
    enabled: true,
    requestsPerMinute: 5,
    requestsPerHour: 30,
    allowedIps: [],
  },
  analysisHistory: [],
  requestLog: [],
};
