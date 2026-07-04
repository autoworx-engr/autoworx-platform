import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildWordSearchAnd } from "@/lib/wordSearch";

/**
 * @swagger
 * /api/estimate/{companyId}/vehicles:
 *   get:
 *     summary: Get vehicles for a company
 *     description: Returns vehicles scoped to the given company. Optionally filter by clientId to get vehicles belonging to a specific client.
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: integer
 *           example: 12
 *         description: Filter vehicles by client ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "Toyota"
 *         description: Search by make, model or license plate
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 50
 *         description: Records per page (default 50)
 *     responses:
 *       200:
 *         description: Vehicles fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       make:
 *                         type: string
 *                       model:
 *                         type: string
 *                       year:
 *                         type: integer
 *                       licensePlate:
 *                         type: string
 *                       clientId:
 *                         type: integer
 *                 pagination:
 *                   type: object
 *       400:
 *         description: Invalid company ID
 *       500:
 *         description: Internal server error
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdParam } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId")
      ? Number(searchParams.get("clientId"))
      : undefined;
    const search = searchParams.get("search") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { companyId };

    if (clientId && !isNaN(clientId)) {
      where.clientId = clientId;
    }

    const searchAnd = buildWordSearchAnd(
      search,
      ["make", "model", "license"],
      ["year"],
    );
    if (searchAnd) {
      where.AND = searchAnd;
    }

    const [vehicles, total] = await Promise.all([
      db.vehicle.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(search ? {} : { skip, take: limit }),
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          color: true,
          vin: true,
          clientId: true,
        },
      }),
      db.vehicle.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: vehicles,
      pagination: search
        ? {
            page: 1,
            limit: total,
            total,
            totalPages: 1,
            hasMore: false,
          }
        : {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: skip + vehicles.length < total,
          },
    });
  } catch (error) {
    console.error("ESTIMATE VEHICLES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch vehicles" },
      { status: 500 },
    );
  }
}
