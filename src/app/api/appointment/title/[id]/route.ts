import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Invalid id" },
        { status: 400 },
      );
    }

    await db.appointmentTitle.delete({ where: { id } });

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
