import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export async function GET(req: NextRequest) {
  try {
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId === null) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || undefined;
    const yearParam = searchParams.get("year");
    const year = yearParam ? Number(yearParam) : undefined;

    const data = await db.holiday.findMany({
      where: { companyId, month, year },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId === null) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const dates: string[] = body?.dates;

    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { success: false, message: "dates must be a non-empty array" },
        { status: 400 },
      );
    }

    const created = [];
    for (const raw of dates) {
      const dt = new Date(`${raw}T00:00:00Z`);
      if (isNaN(dt.getTime())) continue;

      const date = dt.toISOString();
      const month = MONTH_NAMES[dt.getUTCMonth()];
      const year = dt.getUTCFullYear();

      const existing = await db.holiday.findFirst({
        where: { companyId, date, month, year },
      });
      if (existing) {
        created.push(existing);
        continue;
      }

      const saved = await db.holiday.create({
        data: { companyId, date, month, year },
      });
      created.push(saved);
    }

    return NextResponse.json({
      success: true,
      message: "Holidays saved successfully",
      data: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
