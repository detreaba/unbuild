const GITHUB_API = "https://api.github.com";

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "unbuild",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function ghFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: headers() });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export interface RepoMeta {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  topics: string[];
  default_branch: string;
  license: { spdx_id: string } | null;
  size: number; // KB
  created_at: string;
  updated_at: string;
}

export interface TreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export async function fetchRepoMeta(
  owner: string,
  repo: string
): Promise<RepoMeta> {
  return ghFetch<RepoMeta>(`/repos/${owner}/${repo}`);
}

export async function fetchTree(
  owner: string,
  repo: string,
  branch: string
): Promise<TreeEntry[]> {
  const data = await ghFetch<{ tree: TreeEntry[]; truncated: boolean }>(
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );
  return data.tree;
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<string | null> {
  try {
    const data = await ghFetch<{ content: string; encoding: string }>(
      `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    );
    if (data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return data.content;
  } catch {
    return null;
  }
}

export async function fetchMultipleFiles(
  owner: string,
  repo: string,
  paths: string[],
  branch: string
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  // Fetch in parallel, batches of 10
  for (let i = 0; i < paths.length; i += 10) {
    const batch = paths.slice(i, i + 10);
    const fetched = await Promise.all(
      batch.map(async (p) => {
        const content = await fetchFileContent(owner, repo, p, branch);
        return [p, content] as const;
      })
    );
    for (const [p, content] of fetched) {
      if (content !== null) {
        results.set(p, content);
      }
    }
  }
  return results;
}
