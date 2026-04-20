import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/estimate/{companyId}/clients:
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
  { params }: { params: { companyId: string } },
) {
  try {
    const companyId = Number(params.companyId);

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid company ID" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { companyId };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        orderBy: { firstName: "asc" },
        skip,
        take: limit,
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
      pagination: {
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
