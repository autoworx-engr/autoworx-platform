import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, res: Response) {
  try {
    const allCompanies = await db.company.findMany({});
    return NextResponse.json(allCompanies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "All company fetch failed" },
      { status: 500 }
    );
  }
}
