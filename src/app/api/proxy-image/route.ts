import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin image proxy so html2canvas can load cross-origin (S3) images
 * with crossOrigin="anonymous" in non-Safari browsers. The remote host (S3)
 * does not send Access-Control-Allow-Origin, which makes html2canvas stall
 * on the image during PDF capture. This route re-serves the bytes with CORS
 * headers from our own origin.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  // Only allow http(s) remote images.
  let target: URL;
  try {
    target = new URL(url);
    if (target.protocol !== "https:" && target.protocol !== "http:") {
      return new NextResponse("Invalid protocol", { status: 400 });
    }
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return new NextResponse("Upstream fetch failed", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  }
}
