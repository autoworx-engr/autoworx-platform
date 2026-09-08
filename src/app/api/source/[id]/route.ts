import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { isDefaultClientSourceName } from "@/lib/consts";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/source/{id}:
 *   delete:
 *     summary: Delete a client source
 *     description: Deletes a company-owned client source. Default sources shared with the Add Lead form cannot be deleted.
 *     tags: [Source]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Source ID
 *     responses:
 *       200:
 *         description: Source deleted successfully
 *       400:
 *         description: Invalid id, or the source is a non-deletable default
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Source not found for this company
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const id = Number((await params).id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "A valid source id is required" },
        { status: 400 },
      );
    }

    const source = await db.source.findFirst({ where: { id, companyId } });
    if (!source) {
      return NextResponse.json(
        { success: false, message: "Source not found" },
        { status: 404 },
      );
    }

    if (isDefaultClientSourceName(source.name)) {
      return NextResponse.json(
        { success: false, message: "Default sources cannot be deleted" },
        { status: 400 },
      );
    }

    await db.source.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Source deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to delete source",
      },
      { status: 500 },
    );
  }
}
