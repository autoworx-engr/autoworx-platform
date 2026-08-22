import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/estimate/{companyId}/tags:
 *   get:
 *     summary: Get general tags for a company
 *     description: Returns tags of type "GENERAL" for the given company. These are used to tag line items when creating or editing an estimate.
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
 *         name: type
 *         schema:
 *           type: string
 *           example: "GENERAL"
 *           default: "GENERAL"
 *         description: Tag type filter (defaults to GENERAL)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "VIP"
 *         description: Filter tags by name
 *     responses:
 *       200:
 *         description: Tags fetched successfully
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
 *                       color:
 *                         type: string
 *                       type:
 *                         type: string
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
    const type = searchParams.get("type") || "GENERAL";
    const search = searchParams.get("search")?.trim() || undefined;

    const where: Record<string, any> = { companyId, type };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const tags = await db.tag.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    console.error("ESTIMATE TAGS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch tags" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/estimate/{companyId}/tags:
 *   post:
 *     summary: Create a tag
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
 *                 example: "VIP"
 *               textColor:
 *                 type: string
 *                 example: "#FFFFFF"
 *               bgColor:
 *                 type: string
 *                 example: "#6571FF"
 *               type:
 *                 type: string
 *                 enum: [GENERAL, SALES, CLIENT, INVENTORY]
 *                 default: GENERAL
 *     responses:
 *       201:
 *         description: Tag created successfully
 *       400:
 *         description: name is required or tag already exists
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
    const { name, textColor, bgColor, type = "GENERAL" } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "name is required" },
        { status: 400 },
      );
    }

    const validTypes = ["GENERAL", "SALES", "CLIENT", "INVENTORY"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          message: "type must be one of: GENERAL, SALES, CLIENT, INVENTORY",
        },
        { status: 400 },
      );
    }

    const existing = await db.tag.findFirst({
      where: { companyId, name: name.trim(), type },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "This tag already exists" },
        { status: 400 },
      );
    }

    const tag = await db.tag.create({
      data: {
        companyId,
        name: name.trim(),
        textColor: textColor || "black",
        bgColor: bgColor || "white",
        type,
      },
    });

    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (error) {
    console.error("CREATE TAG ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create tag" },
      { status: 500 },
    );
  }
}
