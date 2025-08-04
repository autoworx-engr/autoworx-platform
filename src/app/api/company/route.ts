import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, res: Response) {
  const allCompanies = await db.company.findMany({});

  return NextResponse.json(allCompanies);
}
