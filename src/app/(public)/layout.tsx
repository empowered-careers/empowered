import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/Navbar";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig, siteUrl } from "@/config/site";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteUrl,
  logo: `${siteUrl}${siteConfig.logo}`,
  description: siteConfig.description,
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent selection:text-accent-foreground">
      <JsonLd data={organizationJsonLd} />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
