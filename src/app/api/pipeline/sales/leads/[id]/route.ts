import { db } from "@/lib/db";
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
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

    const bearerCompanyId = await getCompanyIdFromBearer(request);
    const queryCompanyId = request.nextUrl.searchParams.get("companyId");
    const companyId =
      bearerCompanyId ?? (queryCompanyId ? parseInt(queryCompanyId, 10) : null);

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const lead = await db.lead.findFirst({
      where: { id: leadId, companyId },
      include: {
        salesUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeType: true,
          },
        },
        leadTags: { include: { tag: true } },
        column: true,
        tasks: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 },
      );
    }

    const { salesUser, ...rest } = lead;
    return NextResponse.json({
      success: true,
      message: "Lead fetched successfully",
      data: {
        ...rest,
        assignedSalesUser: salesUser
          ? {
              id: salesUser.id,
              firstName: salesUser.firstName,
              lastName: salesUser.lastName,
              email: salesUser.email ?? "",
              employeeType: salesUser.employeeType ?? null,
            }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Failed to fetch lead",
      },
      { status: 500 },
    );
  }
}
