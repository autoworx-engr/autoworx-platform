import { getClientMessageCount } from "@/actions/pipelines/getClinetMessageCount";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/shop/get-client-message-count:
 *   get:
 *     summary: Get unread message count for a client
 *     description: Returns the number of unread SMS messages from a client. Used to show message badges on work order cards in the pipeline.
 *     tags: [Shop Pipeline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         required: true
 *         schema:
 *           type: number
 *         example: 5
 *     responses:
 *       200:
 *         description: Message count retrieved successfully
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
 *                   example: Message count retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                       example: 3
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
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const clientIdParam = searchParams.get("clientId");

    if (!clientIdParam) {
      return NextResponse.json(
        { success: false, message: "clientId is required" },
        { status: 400 },
      );
    }

    const clientId = Number(clientIdParam);
    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "clientId must be a valid number" },
        { status: 400 },
      );
    }

    const result = await getClientMessageCount(clientId);

    if (result.type === "error") {
      return NextResponse.json(
        {
          success: false,
          message:
            (result as any).message || "Failed to retrieve message count",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Message count retrieved successfully",
      data: (result as any).data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to retrieve message count",
      },
      { status: 500 },
    );
  }
}
