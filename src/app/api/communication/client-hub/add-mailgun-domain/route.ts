import { NextRequest, NextResponse } from "next/server";
import { addMailgunDomain } from "@/actions/communication/client/mailgunActions";

/**
 * @swagger
 * /api/communication/client-hub/add-mailgun-domain:
 *   post:
 *     summary: Add Mailgun domain
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
 *               - domain
 *             properties:
 *               domain:
 *                 type: string
 *               companyId:
 *                 type: number
 *     responses:
 *       200:
 *         description: Domain added successfully
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const data = await addMailgunDomain({
      domain: body.domain,
      companyId: body.companyId,
    });

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to add Mailgun domain" },
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
