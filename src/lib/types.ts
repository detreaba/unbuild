export interface AnalysisResult {
  meta: {
    name: string;
    description: string | null;
    stars: number;
    language: string | null;
    license: string | null;
  };
  analysis: {
    totalFiles: number;
    totalDirs: number;
    maxDepth: number;
    projectType: string;
    isMonorepo: boolean;
    languages: Record<string, number>;
    filesAnalyzed: number;
  };
  blueprint: string;
  claudeMd: string;
  architecture: {
    overview: string;
    architecture: {
      pattern: string;
      description: string;
      layers: string[];
      keyComponents: {
        name: string;
        path: string;
        purpose: string;
        dependencies: string[];
        complexity: string;
      }[];
    };
    dataFlow: {
      description: string;
      entryPoints: string[];
      dataStores: string[];
      externalServices: string[];
      flow: string[];
    };
    patterns: {
      designPatterns: string[];
      conventions: Record<string, string>;
    };
    complexityFactors: string[];
    criticalFiles: { path: string; why: string }[];
  };
  model: string;
}

export type TabId = "blueprint" | "claude-md" | "architecture";
