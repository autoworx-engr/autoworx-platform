import { NextRequest, NextResponse } from "next/server";
import { updateLastMailReadId } from "@/actions/communication/client/fetchMailgunMails";

/**
 * @swagger
 * /api/communication/client-hub/update-last-mail-read-id:
 *   post:
 *     summary: Update last mail read ID for a client
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
 *         description: Last mail read ID updated successfully
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const data = await updateLastMailReadId({
      clientId: body.clientId,
      companyId: body.companyId,
    });

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to update last mail read ID" },
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
