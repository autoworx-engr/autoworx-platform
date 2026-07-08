import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const principal = await getAuthPrincipal(req);
    if (!principal) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Invalid id" },
        { status: 400 },
      );
    }

    const existing = await db.appointmentTitle.findFirst({
      where: { id, companyId: principal.companyId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Appointment title not found" },
        { status: 404 },
      );
    }

    await db.appointmentTitle.delete({ where: { id: existing.id } });

    return NextResponse.json({
      success: true,
      message: "Appointment title deleted",
    });
  } catch (error) {
    console.error("Delete appointment title error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete appointment title" },
      { status: 500 },
    );
  }
}
