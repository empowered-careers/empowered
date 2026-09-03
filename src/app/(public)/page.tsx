import type { Metadata } from "next";

import { CTASection } from "@/components/landing/CTASection";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HomePricing } from "@/components/landing/HomePricing";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MarketStats } from "@/components/landing/MarketStats";
import { MeetLauren } from "@/components/landing/MeetLauren";
import { SocialProof } from "@/components/landing/SocialProof";

export const metadata: Metadata = {
  title: "Resume, LinkedIn, and coaching built by a recruiter",
  description:
    "AI career tools with a real recruiter's judgment: score your resume and LinkedIn, rebuild them in your voice, and add real coaching when you want it.",
  openGraph: {
    title: "Empowered Careers",
    description:
      "Get hired faster. Get paid what you're worth. AI career tools with a real recruiter's judgment, and real coaching one click away.",
  },
};

export default function Home() {
  return (
    <>
      <Hero />
      <SocialProof />
      <HowItWorks />
      <Features />
      <MarketStats />
      <MeetLauren />
      <HomePricing />
      <CTASection />
    </>
  );
}
