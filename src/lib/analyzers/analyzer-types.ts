export type InputType =
  | "github-repo"
  | "website"
  | "api-spec"
  | "product"
  | "text"
  | "unknown";

export interface AnalysisInput {
  type: InputType;
  raw: string;
  url?: string;
  owner?: string;
  repo?: string;
}

export interface AnalysisContext {
  inputType: InputType;
  formattedContext: string;
  metadata: Record<string, unknown>;
}
