import { getCompanySources } from "@/actions/source/getCompanySources";
import { newSource } from "@/actions/source/newSource";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/source:
 *   get:
 *     summary: Get all client sources for the company
 *     description: Returns the company's client sources, used by the mobile "New Client" source selector.
 *     tags: [Source]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Company ID. Falls back to the authenticated principal's company.
 *     responses:
 *       200:
 *         description: Sources retrieved successfully
 *       400:
 *         description: companyId could not be resolved
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthPrincipal(req);
    const companyIdParam = req.nextUrl.searchParams.get("companyId");
    const companyId = principal?.companyId ?? Number(companyIdParam);

    if (!companyId || Number.isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "companyId is required" },
        { status: 400 },
      );
    }

    const data = await getCompanySources(companyId);
    return NextResponse.json({
      success: true,
      message: "Sources retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to retrieve sources",
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/source:
 *   post:
 *     summary: Create a new client source
 *     description: Creates a new client source for the authenticated user's company.
 *     tags: [Source]
 *     security:
 *       - bearerAuth: []
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
 *                 example: Google Ads
 *     responses:
 *       200:
 *         description: Source created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Source added
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 7
 *                     name:
 *                       type: string
 *                       example: Google Ads
 *                     companyId:
 *                       type: integer
 *                       example: 1
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error (e.g. name is missing)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const name = body?.name;

    const result = await newSource(name, companyId);

    if (result.type === "globalError" || result.type === "error") {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: (result as any).statusCode ?? 400 },
      );
    }

    const created = (result as { type: "success"; data: unknown }).data;
    return NextResponse.json({
      success: true,
      message: result.message ?? "Source added",
      data: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create source",
      },
      { status: 500 },
    );
  }
}
