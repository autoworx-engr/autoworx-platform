import { NextRequest, NextResponse } from "next/server";
import { getClientById } from "@/app/(dashboard)/dashboard/communication/client/_actions/getClientById";

/**
 * @swagger
 * /api/communication/client-hub/get-client-by-id:
 *   get:
 *     summary: Get client by ID
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
 *
 *     responses:
 *       200:
 *         description: Client retrieved successfully
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
 *                   example: Client retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                       example: 11
 *                     firstName:
 *                       type: string
 *                       example: Saidul
 *                     lastName:
 *                       type: string
 *                       example: Islam
 *                     mobile:
 *                       type: string
 *                       example: "09885236058"
 *                     countryCode:
 *                       type: string
 *                       example: US
 *                     email:
 *                       type: string
 *                       example: saidulislam@gmail.com
 *                     address:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     city:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     state:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     zip:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     isFleet:
 *                       type: boolean
 *                       example: false
 *                     photo:
 *                       type: string
 *                       example: /images/default.png
 *                     fromRequest:
 *                       type: boolean
 *                       example: false
 *                     fromRequestedCompanyId:
 *                       type: number
 *                       nullable: true
 *                       example: null
 *                     sourceId:
 *                       type: number
 *                       nullable: true
 *                       example: null
 *                     converted:
 *                       type: boolean
 *                       example: false
 *                     companyId:
 *                       type: number
 *                       example: 1
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-01-14T05:05:37.239Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-01-14T05:14:36.974Z"
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
 *                   example: Client ID is required
 *
 *       401:
 *         description: Unauthorized
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
 *                   example: Unauthorized access
 *
 *       404:
 *         description: Client not found
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
 *                   example: Client not found
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
 *                   example: Internal server error
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = parseInt(searchParams.get("clientId") || "0");

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: "clientId is required" },
        { status: 400 },
      );
    }

    const data = await getClientById(clientId);

    return NextResponse.json({
      success: true,
      message: "Client retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to retrieve client" },
      { status: 500 },
    );
  }
}
