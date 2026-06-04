import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/estimate/{companyId}/services/{id}:
 *   patch:
 *     summary: Update a canned service
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
 *           example: 7
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
 *                 example: "Oil Change"
 *               categoryId:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "Full synthetic oil change"
 *     responses:
 *       200:
 *         description: Service updated successfully
 *       400:
 *         description: Invalid input or duplicate name
 *       404:
 *         description: Service not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a canned service
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
 *           example: 7
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *       404:
 *         description: Service not found
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
        { success: false, message: "Invalid service ID" },
        { status: 400 },
      );
    }

    const existing = await db.service.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Service not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { name, categoryId, description } = body;

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json(
        { success: false, message: "name cannot be empty" },
        { status: 400 },
      );
    }

    if (name !== undefined) {
      const duplicate = await db.service.findFirst({
        where: { companyId, name: name.trim(), canned: true, NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: "A canned service with this name already exists",
          },
          { status: 400 },
        );
      }
    }

    const updated = await db.service.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(categoryId !== undefined && {
          categoryId: categoryId ? Number(categoryId) : null,
        }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("UPDATE SERVICE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update service" },
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
        { success: false, message: "Invalid service ID" },
        { status: 400 },
      );
    }

    const existing = await db.service.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Service not found" },
        { status: 404 },
      );
    }

    await db.service.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Service deleted" });
  } catch (error) {
    console.error("DELETE SERVICE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete service" },
      { status: 500 },
    );
  }
}
