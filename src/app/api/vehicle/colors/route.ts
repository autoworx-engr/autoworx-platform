import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // The company comes from the verified token, not the query string — a
    // caller must not be able to read another tenant's colours by changing it.
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    const trimmed = typeof name === "string" ? name.trim() : "";

    if (!trimmed) {
      return NextResponse.json(
        { success: false, message: "name is required" },
        { status: 400 },
      );
    }

    // Case-insensitive so "Red", "red" and "RED" can't coexist. This is the
    // authoritative check — the client's own filtering is only a convenience.
    const existing = await db.vehicleColor.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" }, companyId },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Color already exists" },
        { status: 409 },
      );
    }

    const color = await db.vehicleColor.create({
      data: { name: trimmed, companyId },
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
