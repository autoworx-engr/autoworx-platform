import { NextRequest, NextResponse } from "next/server";
import { starUnstarClient } from "@/actions/communication/client/starUnstarClient";

/**
 * @swagger
 * /api/communication/client-hub/star-unstar-client:
 *   post:
 *     summary: Star or unstar a client
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *               - state
 *             properties:
 *               clientId:
 *                 type: number
 *               state:
 *                 type: boolean
 *               companyId:
 *                 type: number
 *     responses:
 *       200:
 *         description: Client star status updated successfully
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const data = await starUnstarClient({
      clientId: body.clientId,
      state: body.state,
      companyId: body.companyId,
    });

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to update star status" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
