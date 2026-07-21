import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildWordSearchAnd } from "@/lib/wordSearch";

/**
 * @swagger
 * /api/client/{companyId}:
 *   get:
 *     summary: Get clients for a company
 *     description: Returns all clients belonging to the given company. Used to populate the customer selector when creating or editing an estimate.
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
 *         name: search
 *         schema:
 *           type: string
 *           example: "John"
 *         description: Filter clients by first name, last name or email
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
 *         description: Clients fetched successfully
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
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       mobile:
 *                         type: string
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
    const search = searchParams.get("search")?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { companyId };

    const searchAnd = buildWordSearchAnd(search, [
      "firstName",
      "lastName",
      "email",
    ]);
    if (searchAnd) {
      where.AND = searchAnd;
    }

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(search ? {} : { skip, take: limit }),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          photo: true,
        },
      }),
      db.client.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: clients,
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
            hasMore: skip + clients.length < total,
          },
    });
  } catch (error) {
    console.error("ESTIMATE CLIENTS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch clients" },
      { status: 500 },
    );
  }
}
