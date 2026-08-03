import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { AppError } from "@/error-boundary/error";

/**
 * @swagger
 * /api/pipeline/sales/{companyId}/services:
 *   get:
 *     summary: Get canned services for a company
 *     description: Returns pre-defined (canned) services for the given company. These are reusable service templates used when adding line items to an estimate.
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
 *           example: "Oil"
 *         description: Filter services by name or description
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *           example: 2
 *         description: Filter services by category ID
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
 *         description: Services fetched successfully
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
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       categoryId:
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

    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer")
      ? authHeader.split(" ")[1]
      : authHeader;

    const verifyToken = await jwtVerifyToken(accessToken);

    if (!verifyToken?.payload) {
      throw new AppError(401, "Unauthorized");
    }

    const companyId = verifyToken?.payload?.companyId as number;

    if (!companyId || isNaN(companyId)) {
      throw new AppError(400, "Invalid company ID");
    }

    if (Number(companyIdParam) !== companyId) {
      throw new AppError(403, "Forbidden: Invalid company access");
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || undefined;
    const categoryId = searchParams.get("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { companyId, canned: true };

    if (categoryId && !isNaN(categoryId)) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [services, total] = await Promise.all([
      db.service.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          categoryId: true,
        },
      }),
      db.service.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: services,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + services.length < total,
      },
    });
  } catch (error) {
    console.error("ESTIMATE SERVICES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch services" },
      { status: 500 },
    );
  }
}
