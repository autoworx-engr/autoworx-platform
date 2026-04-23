import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";

/**
 * @swagger
 * /api/invoice/track-view:
 *   post:
 *     summary: Track invoice view
 *     tags: [Invoice]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invoiceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: View tracked
 *       400:
 *         description: Invoice ID required
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 },
      );
    }

    // Check if user is authenticated
    const session = await getServerSession(authOptions);

    // Only track view if user is NOT authenticated
    if (session?.user) {
      return NextResponse.json(
        { message: "Authenticated users are not tracked" },
        { status: 200 },
      );
    }

    // Update the invoice to mark as viewed
    await db.invoice.update({
      where: { id: invoiceId },
      data: { isViewed: true },
    });

    return NextResponse.json(
      { message: "Invoice view tracked successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error tracking invoice view:", error);
    return NextResponse.json(
      { error: "Failed to track invoice view" },
      { status: 500 },
    );
  }
}
