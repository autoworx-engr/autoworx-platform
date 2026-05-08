import { updateLeadSalesUser } from "@/actions/pipelines/updateLeadSalesUser";
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

    const body = await request.json();
    if (!("salesUserId" in body)) {
      return NextResponse.json(
        { success: false, error: "salesUserId is required" },
        { status: 400 },
      );
    }

    const salesUserId: number | null =
      body.salesUserId != null ? parseInt(body.salesUserId) : null;

    const companyId = (await getCompanyIdFromBearer(request)) ?? undefined;
    const updatedLead = await updateLeadSalesUser(
      leadId,
      salesUserId,
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
