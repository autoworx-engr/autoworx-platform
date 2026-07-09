import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/estimate/{companyId}/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 3
 *     responses:
 *       200:
 *         description: Category deleted successfully
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
 *                   example: Category deleted successfully
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId: companyIdParam, id: idParam } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid category ID" },
        { status: 400 },
      );
    }

    const existing = await db.category.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 },
      );
    }

    await db.$transaction([
      db.appointment.updateMany({
        where: { serviceCategoryId: id },
        data: { serviceCategoryId: null },
      }),
      db.service.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      }),
      db.material.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      }),
      db.labor.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      }),
      db.inventoryProduct.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      }),
      db.servicePlaybook.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      }),
      db.category.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete category" },
      { status: 500 },
    );
  }
}
