import { CTASection } from "@/components/landing/CTASection";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PricingTeaser } from "@/components/landing/PricingTeaser";
import { SocialProof } from "@/components/landing/SocialProof";

export default function Home() {
  return (
    <>
      <Hero />
      <SocialProof />
      <HowItWorks />
      <Features />
      <PricingTeaser />
      <CTASection />
    </>
  );
}
