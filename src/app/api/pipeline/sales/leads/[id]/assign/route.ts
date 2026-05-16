import { db } from "@/lib/db";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { sendLeadAssignNotification } from "@/lib/notification/pipeline-notify";
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

    const authHeader = request.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    const verifyToken = await jwtVerifyToken(accessToken);
    const companyId = verifyToken?.payload?.companyId as number | undefined;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const salesUserId: number | null =
      body.salesUserId !== undefined ? body.salesUserId : null;

    const updatedLead = await db.lead.update({
      where: { id: leadId, companyId },
      data: {
        assignedSalesUserId: salesUserId,
        assignedDate: salesUserId ? new Date() : null,
      },
    });

    if (salesUserId) {
      await sendLeadAssignNotification({
        companyId,
        leadClientName: updatedLead.clientName ?? "",
        assignedEmployeeId: salesUserId,
      });
    }

    return NextResponse.json({ success: true, data: updatedLead });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
