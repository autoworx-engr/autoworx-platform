import { NextRequest, NextResponse } from "next/server";
import { createInfobipConfig } from "@/actions/communication/client/createInfobipConfig";

/**
 * @swagger
 * /api/communication/client-hub/create-infobip-config:
 *   post:
 *     summary: Create or update Infobip configuration
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
 *               - companyId
 *               - phoneNumber
 *             properties:
 *               companyId:
 *                 type: number
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Infobip configuration created successfully
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const data = await createInfobipConfig({
      companyId: body.companyId,
      phoneNumber: body.phoneNumber,
    });

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to create Infobip config" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, data: data.data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
