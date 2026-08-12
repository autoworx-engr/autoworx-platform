import { CATEGORY_NAME_MAX_LENGTH } from "@/lib/categoryConstants";
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

/**
 * @swagger
 * /api/estimate/{companyId}/categories/{id}:
 *   patch:
 *     summary: Update a category's name and/or colour
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Diagnostics
 *               color:
 *                 type: string
 *                 example: "#60A5FA"
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Invalid category ID or body
 *       404:
 *         description: Category not found
 *       409:
 *         description: A category with that name already exists
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
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

    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const color =
      typeof body?.color === "string" ? body.color.trim() : undefined;

    if (name !== undefined && name.length === 0) {
      return NextResponse.json(
        { success: false, message: "Category name cannot be empty" },
        { status: 400 },
      );
    }

    if (name !== undefined && name.length > CATEGORY_NAME_MAX_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Category name must be ${CATEGORY_NAME_MAX_LENGTH} characters or fewer`,
        },
        { status: 400 },
      );
    }

    if (name === undefined && color === undefined) {
      return NextResponse.json(
        { success: false, message: "Nothing to update" },
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

    // Renaming onto an existing category would create a confusing duplicate in
    // every picker, so reject it rather than silently allowing it.
    if (name !== undefined && name !== existing.name) {
      const duplicate = await db.category.findFirst({
        where: { companyId, name, id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: "A category with that name already exists",
          },
          { status: 409 },
        );
      }
    }

    const updated = await db.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH CATEGORY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update category" },
      { status: 500 },
    );
  }
}
