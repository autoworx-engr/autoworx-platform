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
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
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

    const parsed = [];
    for (const raw of dates) {
      const dt = new Date(`${raw}T00:00:00Z`);
      if (isNaN(dt.getTime())) continue;
      parsed.push({
        date: dt.toISOString(),
        month: MONTH_NAMES[dt.getUTCMonth()],
        year: dt.getUTCFullYear(),
      });
    }

    const unique = Array.from(new Map(parsed.map((p) => [p.date, p])).values());

    if (unique.length > 0) {
      const existing = await db.holiday.findMany({
        where: { companyId, date: { in: unique.map((p) => p.date) } },
        select: { date: true },
      });
      const existingDates = new Set(existing.map((h) => h.date.toISOString()));
      const toCreate = unique.filter((p) => !existingDates.has(p.date));

      if (toCreate.length > 0) {
        await db.holiday.createMany({
          data: toCreate.map((p) => ({ companyId, ...p })),
        });
      }
    }

    const data = await db.holiday.findMany({
      where: { companyId, date: { in: unique.map((p) => p.date) } },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: "Holidays saved successfully",
      data,
    });
  } catch (error) {
    console.error("Error saving holidays:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
