import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/estimate/{companyId}/labors/{id}:
 *   patch:
 *     summary: Update a canned labor
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
 *           example: 12
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Brake Pad Replacement"
 *               categoryId:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *               charge:
 *                 type: number
 *                 example: 80.00
 *               notes:
 *                 type: string
 *                 nullable: true
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Labor updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Labor not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a canned labor
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
 *           example: 12
 *     responses:
 *       200:
 *         description: Labor deleted successfully
 *       404:
 *         description: Labor not found
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
        { success: false, message: "Invalid labor ID" },
        { status: 400 },
      );
    }

    const existing = await db.labor.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Labor not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { name, categoryId, hours, charge, discount, notes, tagIds } = body;

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json(
        { success: false, message: "name cannot be empty" },
        { status: 400 },
      );
    }

    const updated = await db.$transaction(async (tx) => {
      const labor = await tx.labor.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(categoryId !== undefined && {
            categoryId: categoryId ? Number(categoryId) : null,
          }),
          ...(hours !== undefined && {
            hours: hours !== null ? Number(hours) : null,
          }),
          ...(charge !== undefined && {
            charge: charge !== null ? Number(charge) : null,
          }),
          ...(discount !== undefined && {
            discount: discount !== null ? Number(discount) : null,
          }),
          ...(notes !== undefined && { notes: notes?.trim() || null }),
        },
      });

      if (Array.isArray(tagIds)) {
        await tx.laborTag.deleteMany({ where: { laborId: id } });
        if (tagIds.length > 0) {
          await tx.laborTag.createMany({
            data: tagIds.map((tagId: number) => ({ laborId: id, tagId })),
          });
        }
      }

      return labor;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("UPDATE LABOR ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update labor" },
      { status: 500 },
    );
  }
}

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
        { success: false, message: "Invalid labor ID" },
        { status: 400 },
      );
    }

    const existing = await db.labor.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Labor not found" },
        { status: 404 },
      );
    }

    await db.labor.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Labor deleted" });
  } catch (error) {
    console.error("DELETE LABOR ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete labor" },
      { status: 500 },
    );
  }
}
