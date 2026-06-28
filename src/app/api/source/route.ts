import { getCompanySources } from "@/actions/source/getCompanySources";
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
