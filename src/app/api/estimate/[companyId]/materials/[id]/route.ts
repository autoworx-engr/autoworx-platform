import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/estimate/{companyId}/materials/{id}:
 *   patch:
 *     summary: Update a material (inventory product of type Product)
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Brake Pad"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "High-performance brake pad"
 *               categoryId:
 *                 type: integer
 *                 nullable: true
 *                 example: 3
 *               vendorId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *               price:
 *                 type: number
 *                 nullable: true
 *                 example: 49.99
 *               quantity:
 *                 type: number
 *                 nullable: true
 *                 example: 10
 *               unit:
 *                 type: string
 *                 nullable: true
 *                 example: "pc"
 *               lot:
 *                 type: string
 *                 nullable: true
 *                 example: "LOT-001"
 *               lowInventoryAlert:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *     responses:
 *       200:
 *         description: Material updated successfully
 *       400:
 *         description: Invalid input or duplicate name
 *       404:
 *         description: Material not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a material (inventory product of type Product)
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
 *         description: Material deleted successfully
 *       404:
 *         description: Material not found
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
        { success: false, message: "Invalid material ID" },
        { status: 400 },
      );
    }

    const existing = await db.inventoryProduct.findFirst({
      where: { id, companyId, type: "Product" },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Material not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      categoryId,
      vendorId,
      price,
      quantity,
      unit,
      lot,
      lowInventoryAlert,
    } = body;

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json(
        { success: false, message: "name cannot be empty" },
        { status: 400 },
      );
    }

    if (name !== undefined) {
      const duplicate = await db.inventoryProduct.findFirst({
        where: { companyId, name: name.trim(), type: "Product", NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: "A material with this name already exists",
          },
          { status: 400 },
        );
      }
    }

    const updated = await db.inventoryProduct.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(categoryId !== undefined && {
          categoryId: categoryId ? Number(categoryId) : null,
        }),
        ...(vendorId !== undefined && {
          vendorId: vendorId ? Number(vendorId) : null,
        }),
        ...(price !== undefined && {
          price: price !== null ? Number(price) : null,
        }),
        ...(quantity !== undefined && {
          quantity: quantity !== null ? Number(quantity) : null,
        }),
        ...(unit !== undefined && { unit: unit?.trim() || null }),
        ...(lot !== undefined && { lot: lot?.trim() || null }),
        ...(lowInventoryAlert !== undefined && {
          lowInventoryAlert: lowInventoryAlert
            ? Number(lowInventoryAlert)
            : null,
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("UPDATE MATERIAL ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update material" },
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
        { success: false, message: "Invalid material ID" },
        { status: 400 },
      );
    }

    const existing = await db.inventoryProduct.findFirst({
      where: { id, companyId, type: "Product" },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Material not found" },
        { status: 404 },
      );
    }

    await db.inventoryProduct.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Material deleted" });
  } catch (error) {
    console.error("DELETE MATERIAL ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete material" },
      { status: 500 },
    );
  }
}
