import { db } from "@/lib/db";
import { calcStatementTotals } from "@/lib/fleet/calcStatementTotals";
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
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ statementId: string }> },
) {
  try {
    const { statementId } = await params;

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
        { status: 404 },
      );
    }

    // Calculate totals
    const totalAmount = statement.invoice.reduce(
      (sum, invoice) => sum + Number(invoice.grandTotal || 0),
      0,
    );

    const totalPaid = statement.invoice.reduce(
      (sum, invoice) => sum + Number(invoice.totalPayment || 0),
      0,
    );

    const totalDue = statement.invoice.reduce(
      (sum, invoice) => sum + Number(invoice.due || 0),
      0,
    );

    return NextResponse.json({
      ...statement,
      totals: calcStatementTotals(statement.invoice),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
