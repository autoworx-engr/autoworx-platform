import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/fleet/statement/{statementId}:
 *   get:
 *     summary: Get fleet statement details
 *     tags: [Fleet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: statementId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fleet statement details
 *       404:
 *         description: Statement not found
 */
export async function GET(request: NextRequest, props: { params: Promise<{ statementId: string }> }) {
  const params = await props.params;
  try {
    const { statementId } = params;

    const statement = await db.fleetStatement.findFirst({
      where: {
        id: statementId,
      },
      include: {
        Fleet: {
          include: {
            client: {
              include: {
                company: true,
              },
            },
          },
        },
        invoice: {
          include: {
            vehicle: true,
            client: true,
            column: true,
          },
        },
      },
    });

    if (!statement) {
      return NextResponse.json(
        { error: "Fleet statement not found" },
        { status: 404 }
      );
    }

    // Calculate totals
    const totalAmount = statement.invoice.reduce(
      (sum, invoice) => sum + Number(invoice.grandTotal || 0),
      0
    );

    const totalPaid = statement.invoice.reduce(
      (sum, invoice) => sum + Number(invoice.totalPayment || 0),
      0
    );

    const totalDue = statement.invoice.reduce(
      (sum, invoice) => sum + Number(invoice.due || 0),
      0
    );

    return NextResponse.json({
      ...statement,
      totals: {
        totalAmount,
        totalPaid,
        totalDue,
      },
    });
  } catch (error) {
    console.error("Error fetching fleet statement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
