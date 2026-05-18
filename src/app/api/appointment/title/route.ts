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

    const titles = await db.appointmentTitle.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: titles });
  } catch (error) {
    console.error("Get appointment titles error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch appointment titles" },
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

    const existing = await db.appointmentTitle.findFirst({
      where: { name: name.trim(), companyId },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Appointment title already exists" },
        { status: 409 },
      );
    }

    const title = await db.appointmentTitle.create({
      data: { name: name.trim(), companyId },
    });

    return NextResponse.json({ success: true, data: title });
  } catch (error) {
    console.error("Create appointment title error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create appointment title" },
      { status: 500 },
    );
  }
}
