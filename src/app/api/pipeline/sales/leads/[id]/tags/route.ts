import { saveLeadTag } from "@/actions/pipelines/leadTag";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/leads/{id}/tags:
 *   post:
 *     summary: Add tag to lead
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
 *               - tagId
 *             properties:
 *               tagId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Tag added to lead successfully
 *       400:
 *         description: Missing tagId or invalid lead ID
 *       500:
 *         description: Failed to add lead tag
 */
export async function POST(
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

    const { tagId } = await request.json();
    if (!tagId) {
      return NextResponse.json(
        { success: false, error: "tagId is required" },
        { status: 400 },
      );
    }

    const newTag = await saveLeadTag(leadId, parseInt(tagId));
    return NextResponse.json({ success: true, data: newTag });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
