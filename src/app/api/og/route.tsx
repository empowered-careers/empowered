import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";

export const runtime = "edge";

export function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get parameters from URL
    const title = searchParams.get("title") || siteConfig.name;
    const description =
      searchParams.get("description") || siteConfig.description;
    const theme = searchParams.get("theme") || "light";

    // Determine colors based on theme
    const bgColor = theme === "dark" ? "#0a0a0a" : "#ffffff";
    const textColor = theme === "dark" ? "#ffffff" : "#000000";
    const accentColor = theme === "dark" ? "#3b82f6" : "#2563eb";

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bgColor,
          backgroundImage:
            "linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          opacity: theme === "dark" ? 0.1 : 0.05,
        }}
      >
        {/* Main content container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "90%",
            maxWidth: "800px",
            padding: "40px",
            backgroundColor: bgColor,
            borderRadius: "20px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          {/* Logo/Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "30px",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                backgroundColor: accentColor,
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "20px",
              }}
            >
              <span
                style={{
                  color: "white",
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                E
              </span>
            </div>
            <span
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: textColor,
              }}
            >
              {siteConfig.shortName}
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              color: textColor,
              textAlign: "center",
              margin: "0 0 20px 0",
              lineHeight: "1.2",
              maxWidth: "700px",
            }}
          >
            {title}
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: "24px",
              color: textColor,
              textAlign: "center",
              margin: "0 0 30px 0",
              opacity: 0.8,
              maxWidth: "600px",
              lineHeight: "1.4",
            }}
          >
            {description}
          </p>

          {/* Tech stack badges */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              justifyContent: "center",
              marginTop: "20px",
            }}
          >
            {[
              "Vetted network",
              "Exclusive roles",
              "Mid–Senior tech",
              "Career coaching",
            ].map((tech) => (
              <div
                key={tech}
                style={{
                  backgroundColor: accentColor,
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "16px",
                  fontWeight: "500",
                }}
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new Response("Failed to generate OG image", { status: 500 });
  }
}
