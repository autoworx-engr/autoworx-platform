import { removeLeadFromPipeline } from "@/actions/pipelines/updateLeadSalesUser";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/leads/{id}/remove:
 *   put:
 *     summary: Remove lead from pipeline
 *     tags: [Sales Pipeline Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead removed from pipeline successfully
 *       400:
 *         description: Invalid lead ID
 *       500:
 *         description: Failed to remove lead from pipeline
 */
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const leadId = parseInt(params.id);
    if (isNaN(leadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid lead ID" },
        { status: 400 },
      );
    }

    const updatedLead = await removeLeadFromPipeline(leadId);
    return NextResponse.json({ success: true, data: updatedLead });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
