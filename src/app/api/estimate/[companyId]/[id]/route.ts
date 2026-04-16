import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { InvoiceType } from "@prisma/client";

/**
 * @swagger
 * /api/estimate/{companyId}/{id}:
 *   get:
 *     summary: Get a single estimate/invoice by ID
 *     description: Fetches full details of an estimate or invoice, verified to belong to the given company
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "clxyz123"
 *         description: Invoice/estimate ID (cuid)
 *     responses:
 *       200:
 *         description: Estimate fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid company ID
 *       404:
 *         description: Estimate not found or does not belong to this company
 *       500:
 *         description: Internal server error
 *
 *   patch:
 *     summary: Update an estimate/invoice
 *     description: Updates basic fields and pipeline column of an estimate/invoice that belongs to the given company
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "clxyz123"
 *         description: Invoice/estimate ID (cuid)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: integer
 *                 nullable: true
 *               vehicleId:
 *                 type: integer
 *                 nullable: true
 *               columnId:
 *                 type: integer
 *                 nullable: true
 *               subtotal:
 *                 type: number
 *               discount:
 *                 type: number
 *               tax:
 *                 type: number
 *               serviceFee:
 *                 type: number
 *               vehicleExtraCost:
 *                 type: number
 *               grandTotal:
 *                 type: number
 *               deposit:
 *                 type: number
 *               due:
 *                 type: number
 *               internalNotes:
 *                 type: string
 *               terms:
 *                 type: string
 *               policy:
 *                 type: string
 *               customerNotes:
 *                 type: string
 *               customerComments:
 *                 type: string
 *               damageNotes:
 *                 type: string
 *                 nullable: true
 *               type:
 *                 type: string
 *                 enum: [Estimate, Invoice]
 *     responses:
 *       200:
 *         description: Estimate updated successfully
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
 *                   example: Estimate updated successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid company ID or input
 *       404:
 *         description: Estimate not found or does not belong to this company
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete an estimate/invoice
 *     description: Permanently deletes an estimate or invoice that belongs to the given company
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "clxyz123"
 *         description: Invoice/estimate ID (cuid)
 *     responses:
 *       200:
 *         description: Estimate deleted successfully
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
 *                   example: Estimate deleted successfully
 *       400:
 *         description: Invalid company ID
 *       404:
 *         description: Estimate not found or does not belong to this company
 *       500:
 *         description: Internal server error
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: { companyId: string; id: string } },
) {
  try {
    const companyId = Number(params.companyId);
    const { id } = params;

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid company ID" },
        { status: 400 },
      );
    }

    const estimate = await db.invoice.findFirst({
      where: { id, companyId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
          },
        },
        column: {
          select: { id: true, title: true },
        },
        invoiceItems: {
          include: {
            service: true,
            labor: {
              include: {
                tags: { include: { tag: true } },
              },
            },
            materials: {
              include: {
                tags: { include: { tag: true } },
              },
            },
            tags: {
              include: { tag: true },
            },
          },
        },
        photos: true,
        tasks: true,
        payments: true,
        tags: { include: { tag: true } },
        technician: true,
        Inspections: true,
      },
    });

    if (!estimate) {
      return NextResponse.json(
        { success: false, message: "Estimate not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: estimate });
  } catch (error) {
    console.error("ESTIMATE GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch estimate" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { companyId: string; id: string } },
) {
  try {
    const companyId = Number(params.companyId);
    const { id } = params;

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid company ID" },
        { status: 400 },
      );
    }

    const existing = await db.invoice.findFirst({
      where: { id, companyId },
      include: { column: { select: { title: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Estimate not found" },
        { status: 404 },
      );
    }

    const body = await req.json();

    const {
      clientId,
      vehicleId,
      columnId,
      subtotal,
      discount,
      tax,
      serviceFee,
      vehicleExtraCost,
      grandTotal,
      deposit,
      due,
      internalNotes,
      terms,
      policy,
      customerNotes,
      customerComments,
      damageNotes,
      type,
    } = body;

    // Resolve column to determine type override
    let resolvedType: InvoiceType = (type as InvoiceType) ?? existing.type;
    let isWorkOrder = existing.isWorkOrder;
    let deliveredAt = existing.deliveredAt;
    let completedAt = existing.completedAt;

    if (columnId) {
      const column = await db.column.findFirst({
        where: { id: Number(columnId), companyId },
      });
      if (!column) {
        return NextResponse.json(
          { success: false, message: "Column not found for this company" },
          { status: 400 },
        );
      }
      if (column.title === "In Progress") {
        resolvedType = "Invoice";
        isWorkOrder = true;
        deliveredAt = null;
      } else if (column.title === "Delivered" && !deliveredAt) {
        deliveredAt = new Date();
      } else if (column.title === "Completed" && !completedAt) {
        completedAt = new Date();
      }
    }

    const updated = await db.invoice.update({
      where: { id },
      data: {
        clientId:
          clientId !== undefined
            ? clientId
              ? Number(clientId)
              : null
            : undefined,
        vehicleId:
          vehicleId !== undefined
            ? vehicleId
              ? Number(vehicleId)
              : null
            : undefined,
        columnId:
          columnId !== undefined
            ? columnId
              ? Number(columnId)
              : null
            : undefined,
        subtotal: subtotal !== undefined ? Number(subtotal) : undefined,
        discount: discount !== undefined ? Number(discount) : undefined,
        tax: tax !== undefined ? Number(tax) : undefined,
        serviceFee: serviceFee !== undefined ? Number(serviceFee) : undefined,
        grandTotal: grandTotal !== undefined ? Number(grandTotal) : undefined,
        deposit: deposit !== undefined ? Number(deposit) : undefined,
        due: due !== undefined ? Number(due) : undefined,
        internalNotes: internalNotes !== undefined ? internalNotes : undefined,
        terms: terms !== undefined ? terms : undefined,
        policy: policy !== undefined ? policy : undefined,
        customerNotes: customerNotes !== undefined ? customerNotes : undefined,
        customerComments:
          customerComments !== undefined ? customerComments : undefined,
        damageNotes: damageNotes !== undefined ? damageNotes : undefined,
        type: resolvedType,
        isWorkOrder,
        deliveredAt,
        completedAt,
        convertedAt: new Date(),
        isViewed: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Estimate updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("ESTIMATE UPDATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update estimate" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { companyId: string; id: string } },
) {
  try {
    const companyId = Number(params.companyId);
    const { id } = params;

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid company ID" },
        { status: 400 },
      );
    }

    const existing = await db.invoice.findFirst({
      where: { id, companyId },
      include: { client: { select: { leadId: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Estimate not found" },
        { status: 404 },
      );
    }

    await db.$transaction(async (tx) => {
      await tx.invoice.delete({ where: { id } });

      if (existing.client?.leadId) {
        await tx.lead.updateMany({
          where: { id: existing.client.leadId },
          data: { isEstimateCreated: false },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Estimate deleted successfully",
    });
  } catch (error) {
    console.error("ESTIMATE DELETE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete estimate" },
      { status: 500 },
    );
  }
}
