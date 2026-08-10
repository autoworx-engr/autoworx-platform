import { paymentLeadsConvertion } from "@/actions/estimate/invoice/paymentLeadsConvertion";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/shop/leads-conversion:
 *   post:
 *     summary: Move a client's lead to the "Converted" column after payment
 *     description: >
 *       Finds the lead linked to the invoice's client and moves it to the
 *       "Converted" pipeline column. Fires a "Lead Closed" notification.
 *       Safe to call multiple times — skips if the lead is already converted.
 *     tags: [Shop Pipeline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceId
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 example: "clxyz123abc"
 *     responses:
 *       200:
 *         description: Lead conversion processed successfully
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
 *                   example: Lead conversion processed successfully
 *       400:
 *         description: invoiceId is missing
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
 *                   example: invoiceId is required
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const body = await req.json();
    const invoiceId = body?.invoiceId;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, message: "invoiceId is required" },
        { status: 400 },
      );
    }

    await paymentLeadsConvertion(invoiceId);

    return NextResponse.json({
      success: true,
      message: "Lead conversion processed successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}
