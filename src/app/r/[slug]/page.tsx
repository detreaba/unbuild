import { notFound } from "next/navigation";
import { getResult } from "@/lib/admin/store";
import { ResultPage } from "./result-page";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const result = getResult(slug);

  if (!result) {
    return { title: "Not Found — UnBuild" };
  }

  const data = result.data as Record<string, unknown>;
  const meta = data.meta as Record<string, string>;
  const name = meta?.name || result.input;

  return {
    title: `${name} — UnBuild Analysis`,
    description: `Deep reverse engineering analysis of ${name}. Contains: Implementation Blueprint, CLAUDE.md, and Architecture Analysis. Open this page in your AI coding tool or download the files to start building.`,
    openGraph: {
      title: `${name} — UnBuild Analysis`,
      description: `Blueprint, CLAUDE.md, and architecture analysis for ${name}. Paste this URL into your AI coding agent to get started.`,
    },
    other: {
      "unbuild:type": result.inputType,
      "unbuild:input": result.input,
      "unbuild:created": result.createdAt,
      "unbuild:files": "blueprint.md, CLAUDE.md, architecture.json",
      "unbuild:instructions": `This page contains a complete reverse engineering analysis of ${name}. Download the 3 files (Blueprint, CLAUDE.md, Architecture JSON) and use them with any AI coding tool. The CLAUDE.md file should be placed in your project root. The Blueprint contains the full implementation plan. Start by reading the CLAUDE.md, then follow the Blueprint phases.`,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const result = getResult(slug);

  if (!result) {
    notFound();
  }

  return <ResultPage result={result} />;
}
