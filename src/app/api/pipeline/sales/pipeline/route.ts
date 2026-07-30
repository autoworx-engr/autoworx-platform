import { getSalePipelineColumns } from "@/actions/pipelines/getSalePipelineColumns";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
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
    // Resolve company from the authenticated principal (Bearer token for mobile
    // or next-auth session for web). Never trust a client-supplied companyId —
    // doing so would let a caller read another company's pipeline.
    const companyId = (await getAuthPrincipal(request))?.companyId ?? null;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

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

    const columns = await getSalePipelineColumns(
      type,
      searchTerm,
      initialLoad,
      orderBy,
      companyId,
    );

    return NextResponse.json({
      success: true,
      data: columns,
    });
  } catch (error: any) {
    console.error("Error in GET /api/pipeline/sales/pipeline:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch sales pipeline",
      },
      { status: 500 },
    );
  }
}
