import { updateLeadSalesUser } from "@/actions/pipelines/updateLeadSalesUser";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/leads/{id}/assign:
 *   put:
 *     summary: Update lead sales user assignment
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
 *               - salesUserId
 *             properties:
 *               salesUserId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Lead sales user updated successfully
 *       400:
 *         description: Missing salesUserId or invalid lead ID
 *       500:
 *         description: Failed to update lead sales user
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

    const { salesUserId } = await request.json();
    if (!salesUserId) {
      return NextResponse.json(
        { success: false, error: "salesUserId is required" },
        { status: 400 },
      );
    }

    const updatedLead = await updateLeadSalesUser(
      leadId,
      parseInt(salesUserId),
    );
    return NextResponse.json({ success: true, data: updatedLead });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
