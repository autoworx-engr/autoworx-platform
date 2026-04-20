import { updateLeadColumn } from "@/actions/pipelines/getLeads";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/leads/{id}/column:
 *   put:
 *     summary: Update lead column
 *     tags: [Sales Pipeline Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - columnId
 *             properties:
 *               columnId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Lead column updated successfully
 *       400:
 *         description: Missing columnId or invalid lead ID
 *       500:
 *         description: Failed to update lead column
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

    const { columnId, newColumnId } = await request.json();
    const finalColumnId = columnId ?? newColumnId;

    if (!finalColumnId) {
      return NextResponse.json(
        { success: false, error: "columnId is required" },
        { status: 400 },
      );
    }

    const updatedLead = await updateLeadColumn(leadId, parseInt(finalColumnId));
    return NextResponse.json({ success: true, data: updatedLead });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
