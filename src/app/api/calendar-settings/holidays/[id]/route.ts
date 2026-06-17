import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

/**
 * @swagger
 * /api/calendar-settings/holidays/{id}:
 *   delete:
 *     summary: Delete a holiday for the authenticated company
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, example: 5 }
 *         description: Holiday id
 *     responses:
 *       200:
 *         description: Holiday deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Holiday deleted successfully" }
 *       400:
 *         description: Invalid holiday id
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Holiday not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId === null) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: idStr } = await props.params;
    const id = Number(idStr);
    if (!id || isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid holiday id" },
        { status: 400 },
      );
    }

    const { count } = await db.holiday.deleteMany({
      where: { id, companyId },
    });
    if (count === 0) {
      return NextResponse.json(
        { success: false, message: "Holiday not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
