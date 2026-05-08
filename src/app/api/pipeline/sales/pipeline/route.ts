import { getSalePipelineColumns } from "@/actions/pipelines/getSalePipelineColumns";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/pipeline:
 *   get:
 *     summary: Get sales pipeline columns
 *     tags: [Sales Pipeline]
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Search term to filter leads
 *       - in: query
 *         name: initialLoad
 *         schema:
 *           type: boolean
 *         description: Whether this is the initial load (default true)
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Order of leads by date (default desc)
 *     responses:
 *       200:
 *         description: Sales pipeline columns fetched successfully
 *       500:
 *         description: Failed to fetch sales pipeline
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = "sales"; // Fixed type as this is the sales pipeline API
    const searchTerm = searchParams.get("searchTerm") || undefined;
    const initialLoadParam = searchParams.get("initialLoad");
    const initialLoad = initialLoadParam ? initialLoadParam === "true" : true;
    // Mobile sends a sort field ("createdAt", "updatedAt", "columnChangedAt").
    // Platform getLeads expects a direction ("asc" | "desc") for the sort.
    // Treat any non-direction value as "use default desc".
    const orderByParam = searchParams.get("orderBy");
    const orderBy: "asc" | "desc" =
      orderByParam === "asc" || orderByParam === "desc" ? orderByParam : "desc";
    const companyIdParam = searchParams.get("companyId");
    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : undefined;

    const rawColumns = await getSalePipelineColumns(
      type,
      searchTerm,
      initialLoad,
      orderBy,
      companyId,
    );

    // Remap salesUser → assignedSalesUser on each lead so the mobile
    // TLead contract is satisfied (kanban and list-view share the same type).
    const columns = rawColumns.map((col) => ({
      ...col,
      leads: col.leads.map((lead) => {
        const { salesUser, ...rest } = lead as typeof lead & {
          salesUser: {
            id: number;
            firstName: string;
            lastName: string | null;
            email: string | null;
            employeeType: string | null;
          } | null;
        };
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
      }),
    }));

    return NextResponse.json({
      success: true,
      data: columns,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Failed to fetch sales pipeline",
      },
      { status: 500 },
    );
  }
}
