import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeClientAccess } from "../_authorizeClient";

/**
 * @swagger
 * /api/client/client-details/{id}/estimates:
 *   get:
 *     summary: Get client's estimates/invoices (paginated)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Client ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Client tasks fetched successfully
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
 *       403:
 *         description: Forbidden - record belongs to another company
 *       404:
 *         description: Client not found
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const access = await authorizeClientAccess(req, params.id);
    if ("error" in access) return access.error;
    const { clientId } = access;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "10") || 10,
      100,
    );
    const skip = (page - 1) * limit;

    const [estimates, total] = await Promise.all([
      db.invoice.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.invoice.count({ where: { clientId } }),
    ]);

    return NextResponse.json({
      success: true,
      data: estimates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + estimates.length < total,
      },
    });
  } catch (error) {
    console.error("CLIENT ESTIMATE FETCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch client estimates" },
      { status: 500 },
    );
  }
}
