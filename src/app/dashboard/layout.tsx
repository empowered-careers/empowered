import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your Empowered career dashboard — resume scores, profile strength, and exclusive job matches.",
  openGraph: {
    title: "Dashboard | Empowered",
    description:
      "Your Empowered career dashboard — resume scores, profile strength, and exclusive job matches.",
    images: [
      {
        url: "/api/og?title=Dashboard&description=Your%20career%20momentum%20dashboard",
        width: 1200,
        height: 630,
        alt: "Empowered Dashboard",
      },
    ],
  },
  robots: {
    index: false, // Don't index protected pages
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
