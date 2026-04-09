import { getSalePipelineColumns } from "@/actions/pipelines/getSalePipelineColumns";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/pipeline:
 *   get:
 *     summary: Get sales pipeline columns
 *     tags: [Pipeline]
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
    const orderBy = (searchParams.get("orderBy") as "asc" | "desc") || "desc";

    const columns = await getSalePipelineColumns(
      type,
      searchTerm,
      initialLoad,
      orderBy,
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
