import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MotionProvider } from "@/components/providers/motion-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UnBuild — Deep Reverse Engineering for Repos & Websites",
  description:
    "Deep-analyze any GitHub repo or website. Get architectural blueprints, CLAUDE.md files, and multi-agent implementation plans with full functionality mapping.",
  keywords: [
    "github", "repository", "AI", "prompt", "blueprint", "architecture",
    "claude", "CLAUDE.md", "reverse engineering", "code generation",
  ],
  openGraph: {
    title: "UnBuild — Reverse Engineer Anything",
    description:
      "Deep reverse engineering for GitHub repos and websites. Architectural blueprints, CLAUDE.md, and multi-agent implementation plans.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UnBuild — Reverse Engineer Anything",
    description: "Deep reverse engineering for repos and websites.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
