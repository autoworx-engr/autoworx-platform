import { removeLeadTag } from "@/actions/pipelines/leadTag";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/leads/{id}/tags/{tagId}:
 *   delete:
 *     summary: Remove tag from lead
 *     tags: [Sales Pipeline Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lead ID
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tag ID
 *     responses:
 *       200:
 *         description: Tag removed from lead successfully
 *       400:
 *         description: Invalid lead ID or tag ID
 *       500:
 *         description: Failed to remove lead tag
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; tagId: string }> },
) {
  try {
    const params = await props.params;
    const leadId = parseInt(params.id);
    const tagId = parseInt(params.tagId);

    if (isNaN(leadId) || isNaN(tagId)) {
      return NextResponse.json(
        { success: false, error: "Invalid lead ID or tag ID" },
        { status: 400 },
      );
    }

    const removedTag = await removeLeadTag(leadId, tagId);
    return NextResponse.json({ success: true, data: removedTag });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
