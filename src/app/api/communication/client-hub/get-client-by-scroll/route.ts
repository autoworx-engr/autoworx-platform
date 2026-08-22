import { NextRequest, NextResponse } from "next/server";
import { getClientByScroll } from "@/app/(dashboard)/dashboard/communication/client/_actions/getClientByScroll";

/**
 * @swagger
 * /api/communication/client-hub/get-client-by-scroll:
 *   get:
 *     summary: Get clients by scroll (pagination)
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: skip
 *         required: true
 *         schema:
 *           type: number
 *         example: 0
 *       - in: query
 *         name: take
 *         required: true
 *         schema:
 *           type: number
 *         example: 20
 *       - in: query
 *         name: companyId
 *         required: false
 *         schema:
 *           type: number
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Clients retrieved successfully
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
 *                   example: Clients retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: skip and take are required
 *
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to retrieve clients
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const skipParam = searchParams.get("skip");
    const takeParam = searchParams.get("take");
    const companyIdParam = searchParams.get("companyId");

    if (!skipParam || !takeParam) {
      return NextResponse.json(
        { success: false, message: "skip and take are required" },
        { status: 400 },
      );
    }

    const skip = Number(skipParam);
    const take = Number(takeParam);
    const companyId = companyIdParam ? Number(companyIdParam) : undefined;

    if (isNaN(skip) || isNaN(take)) {
      return NextResponse.json(
        { success: false, message: "skip and take must be valid numbers" },
        { status: 400 },
      );
    }

    const data = await getClientByScroll({ skip, take, companyId });

    return NextResponse.json({
      success: true,
      message: "Clients retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to retrieve clients",
      },
      { status: 500 },
    );
  }
}
