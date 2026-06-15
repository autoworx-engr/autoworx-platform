import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId === null) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: idStr } = await props.params;
    const id = Number(idStr);
    if (!id || isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid holiday id" },
        { status: 400 },
      );
    }

    const existing = await db.holiday.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Holiday not found" },
        { status: 404 },
      );
    }

    await db.holiday.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
