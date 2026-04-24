import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { extractCompanyId, pipelineError } from "../../../../_shared";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tagId: string } },
) {
  try {
    const companyId = await extractCompanyId(request);

    const leadId = parseInt(params.id, 10);
    const tagId = parseInt(params.tagId, 10);

    if (isNaN(leadId) || isNaN(tagId)) {
      return NextResponse.json(
        { success: false, error: "Invalid lead ID or tag ID" },
        { status: 400 },
      );
    }

    // Verify the lead belongs to this company before deleting.
    const lead = await db.lead.findFirst({
      where: { id: leadId, companyId },
      select: { id: true },
    });
    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 },
      );
    }

    // Delete by tagId (the tag's own ID), not by the join-table record's id.
    await db.leadTags.deleteMany({
      where: { leadId, tagId },
    });

    return NextResponse.json({ success: true, message: "Tag removed" });
  } catch (error) {
    console.error("[remove-tag] error:", error);
    return pipelineError(error, "Failed to remove tag");
  }
}
