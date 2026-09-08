import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/vehicle/colors/{id}:
 *   delete:
 *     summary: Delete a vehicle colour
 *     tags:
 *       - Vehicle
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 3
 *     responses:
 *       200:
 *         description: Colour deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Color deleted successfully
 *       400:
 *         description: Invalid colour ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Colour not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (companyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid color ID" },
        { status: 400 },
      );
    }

    // Scope the lookup by company so one tenant can never delete another's
    // colour by guessing an id.
    const existing = await db.vehicleColor.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Color not found" },
        { status: 404 },
      );
    }

    // Vehicle.colorId is `onDelete: SetNull`, so vehicles referencing this
    // colour survive the delete with a null colour rather than cascading away.
    await db.vehicleColor.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Color deleted successfully",
    });
  } catch (error) {
    console.error("DELETE VEHICLE COLOR ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete color" },
      { status: 500 },
    );
  }
}
