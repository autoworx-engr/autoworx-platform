import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildWordSearchAnd } from "@/lib/wordSearch";

/**
 * @swagger
 * /api/estimate/{companyId}/services:
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
 *         description: Filter services by name, description or category name
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
    const search = searchParams.get("search") || undefined;
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

    const searchAnd = buildWordSearchAnd(search, [
      "name",
      "description",
      "category.name",
    ]);
    if (searchAnd) {
      where.AND = searchAnd;
    }

    const [services, total] = await Promise.all([
      db.service.findMany({
        where,
        orderBy: { id: "desc" },
        ...(search ? {} : { skip, take: limit }),
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

/**
 * @swagger
 * /api/estimate/{companyId}/services:
 *   post:
 *     summary: Create a canned service
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Oil Change"
 *               categoryId:
 *                 type: integer
 *                 example: 2
 *               description:
 *                 type: string
 *                 example: "Full synthetic oil change"
 *     responses:
 *       201:
 *         description: Service created successfully
 *       400:
 *         description: name is required or already exists
 *       500:
 *         description: Internal server error
 */
export async function POST(
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

    const body = await req.json();
    const { name, categoryId, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "name is required" },
        { status: 400 },
      );
    }

    const existing = await db.service.findFirst({
      where: { companyId, name: name.trim(), canned: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "A canned service with this name already exists",
        },
        { status: 400 },
      );
    }

    const service = await db.service.create({
      data: {
        name: name.trim(),
        companyId,
        canned: true,
        categoryId: categoryId ? Number(categoryId) : undefined,
        description: description?.trim() || undefined,
      },
    });

    return NextResponse.json({ success: true, data: service }, { status: 201 });
  } catch (error) {
    console.error("CREATE SERVICE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create service" },
      { status: 500 },
    );
  }
}
