import type { Metadata } from "next";

import { ContentClient } from "@/components/content/content-client";

export const metadata: Metadata = {
  title: "Content & Courses | Empowered Careers",
  robots: "noindex, nofollow",
};

export default function ContentPage() {
  return (
    <div className="px-10 py-8">
      <ContentClient />
    </div>
  );
}
