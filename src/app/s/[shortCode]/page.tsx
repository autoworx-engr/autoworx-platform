import { getShortLink, getShortLinkInfo } from "@/lib/shortener";
import { Metadata } from "next";

interface ShortLinkPageProps {
  params: Promise<{
    shortCode: string;
  }>;
}

export async function generateMetadata({
  params,
}: ShortLinkPageProps): Promise<Metadata> {
  const { shortCode } = await params;
  // Use getShortLinkInfo to avoid incrementing click count during metadata generation
  const result = await getShortLinkInfo(shortCode);

  if (result.success && result.originalUrl) {
    return {
      title: "Redirecting...",
      robots: "noindex, nofollow",
      other: {
        "http-equiv": "refresh",
        content: `0; url=${result.originalUrl}`,
      },
    };
  }

  return {
    title: "Link Not Found",
    robots: "noindex, nofollow",
  };
}

export default async function ShortLinkPage({ params }: ShortLinkPageProps) {
  const { shortCode } = await params;
  // Use getShortLink to increment click count only once
  const result = await getShortLink(shortCode);

  if (result.success && result.originalUrl) {
    // Return an HTML page with immediate redirect
    return (
      <html>
        <head>
          <meta httpEquiv="refresh" content={`0; url=${result.originalUrl}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.location.href = "${result.originalUrl}";`,
            }}
          />
        </head>
        <body>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100vh",
              fontFamily: "system-ui, sans-serif",
              backgroundColor: "#f9fafb",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  border: "2px solid #e5e7eb",
                  borderTop: "2px solid #3b82f6",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 16px",
                }}
              ></div>
              <p style={{ color: "#6b7280", margin: 0 }}>Redirecting...</p>
            </div>
          </div>
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `,
            }}
          />
        </body>
      </html>
    );
  }

  console.log("❌ Short link not found:", {
    shortCode,
    error: result.error,
  });

  // Redirect to the main 404 page instead of showing custom 404
  return (
    <html>
      <head>
        <title>Redirecting...</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta httpEquiv="refresh" content="0; url=/404" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.location.href = "/404";`,
          }}
        />
      </head>
      <body>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
            backgroundColor: "#f9fafb",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                border: "2px solid #e5e7eb",
                borderTop: "2px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px",
              }}
            ></div>
            <p style={{ color: "#6b7280", margin: 0 }}>Redirecting...</p>
          </div>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
