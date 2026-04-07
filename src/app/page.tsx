import { Suspense } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Hero } from "@/components/sections/hero";
import { AnalysisTool } from "@/components/tool/analysis-tool";
import { Showcase } from "@/components/sections/showcase";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Features } from "@/components/sections/features";
import { CliSection } from "@/components/sections/cli-section";
import { OpenSourceCta } from "@/components/sections/open-source-cta";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Suspense>
          <Hero />
          <AnalysisTool />
        </Suspense>
        <Showcase />
        <HowItWorks />
        <Features />
        <CliSection />
        <OpenSourceCta />
      </main>
      <Footer />
    </>
  );
}
