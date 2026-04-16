import { NextRequest, NextResponse } from "next/server";
import { getClientDescription } from "@/app/(dashboard)/dashboard/communication/client/_actions/getClientDescription";

/**
 * @swagger
 * /api/communication/client-hub/get-client-description:
 *   get:
 *     summary: Get client description with conversations and company users
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         required: true
 *         schema:
 *           type: number
 *         example: 11
 *       - in: query
 *         name: companyId
 *         required: false
 *         schema:
 *           type: number
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Client description retrieved successfully
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
 *                   example: Client description retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversationsData:
 *                       type: object
 *                     companyUsers:
 *                       type: array
 *                       items:
 *                         type: object
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
 *                   example: clientId is required
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
 *                   example: Failed to retrieve client description
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const clientIdParam = searchParams.get("clientId");
    const companyIdParam = searchParams.get("companyId");

    if (!clientIdParam) {
      return NextResponse.json(
        { success: false, message: "clientId is required" },
        { status: 400 },
      );
    }

    const clientId = Number(clientIdParam);
    const companyId = Number(companyIdParam);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "clientId must be a valid number" },
        { status: 400 },
      );
    }

    if (companyIdParam && isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "companyId must be a valid number" },
        { status: 400 },
      );
    }

    const data = await getClientDescription(clientId, companyId);

    return NextResponse.json({
      success: true,
      message: "Client description retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to retrieve client description",
      },
      { status: 500 },
    );
  }
}
