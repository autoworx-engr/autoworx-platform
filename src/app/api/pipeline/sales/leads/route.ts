import { getLeadsWithCountOptimized } from "@/actions/pipelines/getLeads";
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/leads:
 *   get:
 *     summary: Get sales leads with pagination and filtering
 *     tags: [Sales Pipeline Leads]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Company ID (mobile JWT auth — falls back to session for web)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (1-based). Mobile uses page; web may use skip.
 *       - in: query
 *         name: take
 *         schema:
 *           type: integer
 *         description: Number of leads per page
 *       - in: query
 *         name: columnId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Leads fetched successfully
 *       500:
 *         description: Failed to fetch leads
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const companyIdStr = searchParams.get("companyId");
    const companyId = companyIdStr ? parseInt(companyIdStr, 10) : undefined;

    const pageStr = searchParams.get("page");
    const page = pageStr ? Math.max(1, parseInt(pageStr, 10)) : 1;

    const takeStr = searchParams.get("take");
    const take = takeStr ? parseInt(takeStr, 10) : 20;

    // Support both page-based (mobile) and skip-based (web) pagination.
    const skipStr = searchParams.get("skip");
    const skip = skipStr ? parseInt(skipStr, 10) : (page - 1) * take;

    const columnIdStr = searchParams.get("columnId");
    const columnId = columnIdStr ? parseInt(columnIdStr) : undefined;

    const searchTerm = searchParams.get("searchTerm") || undefined;
    const assignedTo = searchParams.get("assignedTo") || undefined;
    const source = searchParams.get("source") || undefined;
    const service = searchParams.get("service") || undefined;
    const status = searchParams.get("status") || undefined;

    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    let dateRange: [string | null, string | null] | undefined = undefined;

    if (startDateStr && endDateStr) {
      const toDateOnly = (iso: string): string | null =>
        iso.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
      dateRange = [toDateOnly(startDateStr), toDateOnly(endDateStr)];
    }

    const result = await getLeadsWithCountOptimized({
      companyId,
      columnId,
      take,
      skip,
      searchTerm,
      assignedTo,
      source,
      service,
      status,
      dateRange,
    });

    // Rename salesUser → assignedSalesUser for the mobile TLead contract.
    const leads = result.leads.map((lead: any) => {
      const { salesUser, ...rest } = lead;
      return {
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
      };
    });

    const total = result.totalCount;
    const totalPages = take > 0 ? Math.ceil(total / take) : 1;

    return NextResponse.json({
      success: true,
      data: leads,
      meta: {
        total,
        page,
        take,
        totalPages,
        hasNextPage: page * take < total,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/pipeline/sales/leads:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leads" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const bearerCompanyId = await getCompanyIdFromBearer(request);
    const body = await request.json();

    const companyId: number = bearerCompanyId ?? body.companyId;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const {
      clientName,
      clientEmail,
      clientPhone,
      countryCode,
      vehicleInfo,
      services,
      source,
      comments,
      columnId,
    } = body;

    if (!clientName || !vehicleInfo || !services || !source) {
      return NextResponse.json(
        {
          success: false,
          error: "clientName, vehicleInfo, services, and source are required",
        },
        { status: 400 },
      );
    }

    const lead = await db.lead.create({
      data: {
        clientName,
        clientEmail: clientEmail ?? null,
        clientPhone: clientPhone ?? null,
        countryCode: countryCode ?? "",
        vehicleInfo,
        services,
        source,
        comments: comments ?? null,
        companyId,
        columnId: columnId ?? null,
        isLead: true,
        isQualified: columnId != null,
      },
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
      },
    });

    const { salesUser, ...rest } = lead;
    return NextResponse.json({
      success: true,
      message: "Lead created successfully",
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
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Failed to create lead",
      },
      { status: 500 },
    );
  }
}
