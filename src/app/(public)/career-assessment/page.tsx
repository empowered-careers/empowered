import { CareerPositioningQuiz } from "@/components/assessment/career-positioning/career-positioning-quiz";
import { normalizeSource } from "@/lib/events";

export const metadata = {
  title: "Free Career Positioning Assessment",
  description:
    "How strong is your job search — really? Take the free 18-question assessment and get a personalized snapshot across brand, market positioning, mindset, networking, interviews, and negotiation.",
  alternates: { canonical: "/career-assessment" },
};

interface PageProps {
  searchParams: Promise<{ src?: string }>;
}

export default async function CareerAssessmentPage({
  searchParams,
}: PageProps) {
  const { src } = await searchParams;
  const source = normalizeSource(src);

  return (
    <CareerPositioningQuiz
      source={source}
      sourceRef="career-positioning-assessment"
    />
  );
}
