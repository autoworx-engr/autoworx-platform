import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

export async function GET(req: NextRequest) {
  try {
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId === null) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const data = await db.calendarSettings.findFirst({
      where: { companyId },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching calendar settings:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId === null) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { weekStart, dayStart, dayEnd, weekend1, weekend2 } = body;

    for (const [key, val] of [
      ["weekStart", weekStart],
      ["dayStart", dayStart],
      ["dayEnd", dayEnd],
      ["weekend1", weekend1],
      ["weekend2", weekend2],
    ] as [string, unknown][]) {
      if (!val) {
        return NextResponse.json(
          { success: false, message: `${key} is required` },
          { status: 400 },
        );
      }
    }

    const data = await db.calendarSettings.upsert({
      where: { companyId },
      update: { weekStart, dayStart, dayEnd, weekend1, weekend2 },
      create: { companyId, weekStart, dayStart, dayEnd, weekend1, weekend2 },
    });

    return NextResponse.json({
      success: true,
      message: "Calendar settings updated successfully",
      data,
    });
  } catch (error) {
    console.error("Error updating calendar settings:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
