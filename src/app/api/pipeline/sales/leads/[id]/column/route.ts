import { updateLeadColumn } from "@/actions/pipelines/getLeads";
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const leadId = parseInt(params.id);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid lead ID" },
        { status: 400 },
      );
    }

    const { columnId, newColumnId } = await request.json();
    const finalColumnId = columnId ?? newColumnId;

    if (!finalColumnId) {
      return NextResponse.json(
        { success: false, error: "columnId is required" },
        { status: 400 },
      );
    }

    const companyId = (await getCompanyIdFromBearer(request)) ?? undefined;
    const updatedLead = await updateLeadColumn(
      leadId,
      parseInt(finalColumnId),
      companyId,
    );
    return NextResponse.json({ success: true, data: updatedLead });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
