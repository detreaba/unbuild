import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ owner: string; repo: string }>;
}

export default async function RepoPage({ params }: Props) {
  const { owner, repo } = await params;
  // Redirect to home with query param so the client component can auto-submit
  redirect(`/?repo=${encodeURIComponent(`${owner}/${repo}`)}`);
}
