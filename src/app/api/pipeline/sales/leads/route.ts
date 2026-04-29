import { getLeadsWithCountOptimized } from "@/actions/pipelines/getLeads";
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
      dateRange,
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
