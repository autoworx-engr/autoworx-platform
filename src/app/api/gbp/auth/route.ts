import { generateGbpAuthUrl } from "@/lib/gbp";
import { NextResponse } from "next/server";

export async function GET() {
  const authUrl = generateGbpAuthUrl();
  return NextResponse.redirect(authUrl);
}
