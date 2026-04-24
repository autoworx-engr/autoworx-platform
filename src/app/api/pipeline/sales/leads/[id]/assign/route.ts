import { db } from "@/lib/db";
import { sendLeadAssignNotification } from "@/lib/notification/pipeline-notify";
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

    // salesUserId may be a number (assign) or null (unassign).
    // The mobile sends `{ salesUserId: number | null }`.
    if (!("salesUserId" in body)) {
      return NextResponse.json(
        { success: false, error: "salesUserId is required" },
        { status: 400 },
      );
    }

    const salesUserId: number | null =
      body.salesUserId === null ? null : parseInt(body.salesUserId, 10);

    if (salesUserId !== null && isNaN(salesUserId)) {
      return NextResponse.json(
        { success: false, error: "salesUserId must be a number or null" },
        { status: 400 },
      );
    }

    await db.lead.update({
      where: { id: leadId, companyId },
      data: {
        assignedSalesUserId: salesUserId,
        assignedDate: salesUserId !== null ? new Date() : null,
      },
    });

    if (salesUserId !== null) {
      const lead = await db.lead.findUnique({
        where: { id: leadId },
        select: { clientName: true },
      });
      sendLeadAssignNotification({
        companyId,
        leadClientName: lead?.clientName ?? "",
        assignedEmployeeId: salesUserId,
      }).catch((err: unknown) =>
        console.error("[assign] notification error:", err),
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lead assignment updated",
    });
  } catch (error) {
    console.error("[assign] error:", error);
    return pipelineError(error, "Failed to update lead assignment");
  }
}
