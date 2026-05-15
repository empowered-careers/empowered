import type { Metadata } from "next";

import { PipelineClient } from "@/components/pipeline/pipeline-client";

export const metadata: Metadata = {
  title: "Pipeline | Empowered Careers",
  robots: "noindex, nofollow",
};

export default function PipelinePage() {
  return (
    <div className="px-10 py-8">
      <PipelineClient />
    </div>
  );
}
