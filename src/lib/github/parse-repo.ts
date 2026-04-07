export interface RepoInput {
  owner: string;
  repo: string;
}

export function parseGitHubInput(input: string): RepoInput {
  input = input.trim();

  // Handle full GitHub URLs
  const urlMatch = input.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/
  );
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, "") };
  }

  // Handle owner/repo format
  const slashMatch = input.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slashMatch) {
    return { owner: slashMatch[1], repo: slashMatch[2] };
  }

  throw new Error(
    `Invalid input: "${input}". Use a GitHub URL or owner/repo format.`
  );
}
