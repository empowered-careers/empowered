import type { Metadata } from "next";

import { JobBoardClient } from "@/components/job-board/job-board-client";

export const metadata: Metadata = {
  title: "Job Board | Empowered Careers",
  robots: "noindex, nofollow",
};

export default function JobBoardPage() {
  return (
    <div className="px-10 py-8">
      <JobBoardClient />
    </div>
  );
}
