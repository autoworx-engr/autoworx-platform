import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const awxcrmcompany = await db.company.findFirst({
      where: {
        isCRMEnabled: true,
      },
      select: {
        zapierToken: true,
      },
    });
    if (!awxcrmcompany) {
      return NextResponse.json(
        { error: "No CRM-enabled company found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { token: awxcrmcompany.zapierToken },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}
