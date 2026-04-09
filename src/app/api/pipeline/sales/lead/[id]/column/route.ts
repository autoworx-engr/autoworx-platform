import { updateLeadColumn } from "@/actions/pipelines/getLeads";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/lead/{id}/column:
 *   put:
 *     summary: Update the column of a sales lead
 *     tags: [Pipeline]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the lead to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newColumnId
 *             properties:
 *               newColumnId:
 *                 type: integer
 *                 description: The ID of the new column
 *     responses:
 *       200:
 *         description: Lead column updated successfully
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Failed to update lead column
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const leadId = parseInt(params.id);
    if (isNaN(leadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid lead ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { newColumnId } = body;

    if (typeof newColumnId !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "newColumnId is required and must be a number",
        },
        { status: 400 },
      );
    }

    const updatedLead = await updateLeadColumn(leadId, newColumnId);

    return NextResponse.json({
      success: true,
      data: updatedLead,
    });
  } catch (error: any) {
    console.error(
      `Error in PUT /api/pipeline/sales/lead/${params.id}/column:`,
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update lead column",
      },
      { status: 500 },
    );
  }
}
