import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { extractCompanyId, pipelineError } from "../../../_shared";

export async function POST(
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
    const tagId = parseInt(body.tagId, 10);
    if (isNaN(tagId)) {
      return NextResponse.json(
        { success: false, error: "tagId is required" },
        { status: 400 },
      );
    }

    // Verify the lead belongs to this company.
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

    const leadTag = await db.leadTags.create({
      data: { leadId, tagId },
      select: { id: true, leadId: true, tagId: true },
    });

    return NextResponse.json({
      success: true,
      message: "Tag added",
      data: leadTag,
    });
  } catch (error) {
    console.error("[add-tag] error:", error);
    return pipelineError(error, "Failed to add tag");
  }
}
