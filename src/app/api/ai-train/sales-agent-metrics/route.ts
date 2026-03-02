import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/ai-train/sales-agent-metrics:
 *   get:
 *     summary: Get Sales Agent performance metrics
 *     tags:
 *       - Analytics
 *     responses:
 *       200:
 *         description: Metrics fetched successfully
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = parseInt(searchParams.get("companyId") || "");

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Company ID required" },
        { status: 400 },
      );
    }

    const [totalTexts, distinctClients, tasksCreated] = await Promise.all([
      // Total texts where sales agent involved
      db.clientSMS.count({
        where: {
          companyId,
          isSalesAgent: true,
        },
      }),

      // Unique clients contacted
      db.clientSMS.findMany({
        where: {
          companyId,
          isSalesAgent: true,
        },
        select: { clientId: true },
        distinct: ["clientId"],
      }),

      // Tasks created by sales agent
      db.task.count({
        where: {
          companyId,
          createdBy: "sales_agent",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalClients: distinctClients.length,
        totalTexts,
        appointmentsBooked: tasksCreated,
      },
    });
  } catch (error) {
    console.error("SALES AGENT METRICS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}
