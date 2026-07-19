import { createSalesLeadFull } from "@/actions/pipelines/createSalesLeadFull";
import { getLeadsWithCountOptimized } from "@/actions/pipelines/getLeads";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/leads:
 *   get:
 *     summary: Get sales leads with pagination and filtering
 *     tags: [Sales Pipeline Leads]
 *     parameters:
 *       - in: query
 *         name: columnId
 *         schema:
 *           type: integer
 *         description: Filter leads by pipeline column ID
 *       - in: query
 *         name: take
 *         schema:
 *           type: integer
 *         description: Number of leads to take
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *         description: Number of leads to skip
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Search term for leads
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter leads by assignee userId
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter leads by source
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *         description: Filter leads by service
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter leads by status
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction by createdAt (default desc). Must match the initial load order.
 *       - in: query
 *         name: excludeNoStage
 *         schema:
 *           type: boolean
 *         description: When true, exclude leads with no pipeline stage (columnId null) from results and totalCount. Ignored if columnId is set. Default false.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for date range filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for date range filter
 *     responses:
 *       200:
 *         description: Leads fetched successfully
 *       500:
 *         description: Failed to fetch leads
 */
export async function GET(request: NextRequest) {
  try {
    const companyId = (await getAuthPrincipal(request))?.companyId ?? null;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const columnIdStr = searchParams.get("columnId");
    const columnId = columnIdStr ? parseInt(columnIdStr) : undefined;

    const takeStr = searchParams.get("take");
    const take = takeStr ? parseInt(takeStr) : undefined;

    const skipStr = searchParams.get("skip");
    const skip = skipStr ? parseInt(skipStr) : undefined;

    const searchTerm = searchParams.get("searchTerm") || undefined;
    const assignedTo = searchParams.get("assignedTo") || undefined;
    const source = searchParams.get("source") || undefined;
    const service = searchParams.get("service") || undefined;
    const status = searchParams.get("status") || undefined;

    // Mobile's list view hides no-stage (columnId null) leads client-side;
    // excluding them here keeps totalCount/page size in sync with what the
    // list renders so infinite scroll doesn't stall. Opt-in — web still
    // shows no-stage leads as "Unqualified".
    const excludeNoStage = searchParams.get("excludeNoStage") === "true";

    // Mobile may send a sort field ("createdAt", "updatedAt", ...); getLeads
    // expects a direction. Treat any non-direction value as the default "desc"
    // so paginated "load more" pages keep the same order as the initial load.
    const orderByParam = searchParams.get("orderBy");
    const orderBy: "asc" | "desc" =
      orderByParam === "asc" || orderByParam === "desc" ? orderByParam : "desc";

    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    let dateRange: [string | null, string | null] | undefined = undefined;

    if (startDateStr && endDateStr) {
      // Extract only the YYYY-MM-DD part so the action can parse it directly
      // in the company timezone — prevents off-by-one-day errors when the
      // browser timezone differs from the company timezone.
      const toDateOnly = (iso: string): string | null =>
        iso.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
      dateRange = [toDateOnly(startDateStr), toDateOnly(endDateStr)];
    }

    const result = await getLeadsWithCountOptimized({
      columnId,
      take,
      skip,
      searchTerm,
      assignedTo,
      source,
      service,
      status,
      orderBy,
      dateRange,
      companyId,
      excludeNoStage,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error in GET /api/pipeline/sales/leads:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch leads",
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/pipeline/sales/leads:
 *   post:
 *     summary: Create a new sales lead
 *     tags: [Sales Pipeline Leads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientName:
 *                 type: string
 *               clientEmail:
 *                 type: string
 *               clientPhone:
 *                 type: string
 *               countryCode:
 *                 type: string
 *               vehicleInfo:
 *                 type: string
 *               services:
 *                 type: string
 *               source:
 *                 type: string
 *               comments:
 *                 type: string
 *               columnId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to create lead
 */
export async function POST(request: NextRequest) {
  try {
    const companyId = (await getAuthPrincipal(request))?.companyId ?? null;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      clientName,
      clientEmail,
      clientPhone,
      countryCode,
      vehicleInfo,
      services,
      source,
      comments,
      columnId: bodyColumnId,
    } = body as {
      clientName: string;
      clientEmail?: string;
      clientPhone?: string;
      countryCode?: string;
      vehicleInfo: string;
      services: string;
      source: string;
      comments?: string;
      columnId?: number;
    };

    if (!clientName || !vehicleInfo || !services || !source) {
      return NextResponse.json(
        {
          success: false,
          error: "clientName, vehicleInfo, services, and source are required",
        },
        { status: 400 },
      );
    }

    const lead = await createSalesLeadFull({
      companyId,
      clientName,
      clientEmail,
      clientPhone,
      countryCode,
      vehicleInfo,
      services,
      source,
      comments,
      columnId: bodyColumnId,
    });

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
