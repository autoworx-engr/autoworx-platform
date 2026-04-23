import { NextRequest, NextResponse } from "next/server";
import updateFirstContactTimeClient from "@/actions/communication/client/updateFirstContactTimeClient";

/**
 * @swagger
 * /api/communication/client-hub/update-first-contact-time:
 *   post:
 *     summary: Update first contact time for a client
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
 *             properties:
 *               clientId:
 *                 type: number
 *               companyId:
 *                 type: number
 *     responses:
 *       200:
 *         description: First contact time updated successfully
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    await updateFirstContactTimeClient(body.clientId, body.companyId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
