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

    await db.lead.update({
      where: { id: leadId, companyId },
      data: { columnId: null, isQualified: false },
    });

    return NextResponse.json({
      success: true,
      message: "Lead removed from pipeline",
    });
  } catch (error) {
    console.error("[remove] error:", error);
    return pipelineError(error, "Failed to remove lead from pipeline");
  }
}
