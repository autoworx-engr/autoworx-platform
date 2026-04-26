import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const companyId = Number(req.nextUrl.searchParams.get("companyId"));
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "companyId is required" },
        { status: 400 },
      );
    }

    const colors = await db.vehicleColor.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: colors });
  } catch (error) {
    console.error("Get vehicle colors error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch vehicle colors" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, companyId } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "name is required" },
        { status: 400 },
      );
    }
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "companyId is required" },
        { status: 400 },
      );
    }

    const existing = await db.vehicleColor.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" }, companyId },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Color already exists" },
        { status: 409 },
      );
    }

    const color = await db.vehicleColor.create({
      data: { name: name.trim(), companyId },
    });

    return NextResponse.json({ success: true, data: color });
  } catch (error) {
    console.error("Add vehicle color error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to add vehicle color" },
      { status: 500 },
    );
  }
}
