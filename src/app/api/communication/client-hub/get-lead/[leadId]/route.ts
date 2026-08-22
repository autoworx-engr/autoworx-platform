import { NextRequest, NextResponse } from "next/server";
import { getLead } from "@/app/(dashboard)/dashboard/communication/client/_actions/getLead";

/**
 * @swagger
 * /api/communication/client-hub/get-lead/{leadId}:
 *   get:
 *     summary: Get lead by ID
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: leadId
 *         required: true
 *         schema:
 *           type: number
 *         example: 28
 *     responses:
 *       200:
 *         description: Lead retrieved successfully
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
 *                   example: Lead retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     isLead:
 *                       type: boolean
 *                       example: true
 *                     services:
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
 *                   example: leadId is required
 *
 *       404:
 *         description: Lead not found
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
 *                   example: Lead not found
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
 *                   example: Failed to retrieve lead
 */

type RouteParams = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function GET(req: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const leadId = Number(params.leadId);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { success: false, message: "leadId must be a valid number" },
        { status: 400 },
      );
    }

    const data = await getLead(leadId);

    if (!data) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lead retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to retrieve lead",
      },
      { status: 500 },
    );
  }
}
