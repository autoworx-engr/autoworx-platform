import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fullUpdateInvoice } from "./_updateInvoice";

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
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId: companyIdParam, id } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

    const estimateInclude = {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          countryCode: true,
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
        select: { id: true, title: true, bgColor: true, textColor: true },
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
      payments: {
        include: {
          card: true,
          check: true,
          cash: true,
          other: true,
          deposit: true,
        },
      },
      tags: { include: { tag: true } },
      technician: true,
      Inspections: true,
    } as const;

    let estimate = await db.invoice.findFirst({
      where: { id, companyId },
      include: estimateInclude,
    });

    if (!estimate) {
      const requestLink = await db.requestEstimate.findFirst({
        where: {
          invoiceId: id,
          OR: [
            { senderCompanyId: companyId },
            { receiverCompanyId: companyId },
          ],
        },
        select: { id: true },
      });

      if (requestLink) {
        estimate = await db.invoice.findFirst({
          where: { id },
          include: estimateInclude,
        });
      }
    }

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
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId: companyIdParam, id } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = await fullUpdateInvoice(id, jwtCompanyId, body);
    return NextResponse.json(
      { success: result.success, message: result.message, data: result.data },
      { status: result.status },
    );
  } catch (error: any) {
    console.error("ESTIMATE UPDATE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update estimate",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId: companyIdParam, id } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

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
      // Technician rows require an invoiceId with no cascade, and InvoiceRedo
      // rows require a technicianId with no cascade, so both must be cleared
      // before the invoice can be deleted or P2003 is thrown.
      await tx.invoiceRedo.deleteMany({ where: { invoiceId: id } });
      await tx.technician.deleteMany({ where: { invoiceId: id } });

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
