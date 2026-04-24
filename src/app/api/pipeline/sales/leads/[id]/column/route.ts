import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { extractCompanyId, pipelineError } from "../../../_shared";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const companyId = await extractCompanyId(request);

    const leadId = parseInt(params.id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid lead ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const rawColumnId = body.columnId ?? body.newColumnId;
    const columnId = parseInt(rawColumnId, 10);

    if (isNaN(columnId)) {
      return NextResponse.json(
        { success: false, error: "columnId is required" },
        { status: 400 },
      );
    }

    // Verify the column belongs to this company so a user can't move leads
    // across company boundaries.
    const column = await db.column.findFirst({
      where: { id: columnId, companyId },
      select: { id: true },
    });
    if (!column) {
      return NextResponse.json(
        { success: false, error: "Column not found" },
        { status: 404 },
      );
    }

    await db.lead.update({
      where: { id: leadId, companyId },
      data: { columnId, columnChangedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Lead column updated" });
  } catch (error) {
    console.error("[column] error:", error);
    return pipelineError(error, "Failed to update lead column");
  }
}
