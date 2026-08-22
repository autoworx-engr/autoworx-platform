import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createInvoiceRedo } from "@/actions/estimate/labor/createInvoiceRedo";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/estimate/{companyId}/{id}/redo:
 *   post:
 *     summary: Create re-do entries for an invoice's technicians
 *     description: Marks selected technicians for re-do (sets status to In Progress and records notes). Mirrors the createInvoiceRedo server action. Only valid for delivered invoices.
 *     tags: [Work Order]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer, example: 4 }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: "clxyz123" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [redos]
 *             properties:
 *               redos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [serviceId, technicianId]
 *                   properties:
 *                     serviceId: { type: integer }
 *                     technicianId: { type: integer }
 *                     notes: { type: string }
 *     responses:
 *       200: { description: Redo created }
 *       400: { description: No technicians selected }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Invoice not found }
 *       500: { description: Internal server error }
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId: companyIdParam, id } = await params;
    const principal = await getAuthPrincipal(req);
    if (!principal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== principal.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoice = await db.invoice.findFirst({
      where: { id, companyId: principal.companyId },
      select: { id: true },
    });
    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const redos = Array.isArray(body) ? body : (body?.redos ?? []);
    if (!Array.isArray(redos) || redos.length === 0) {
      return NextResponse.json(
        { success: false, message: "Please select at least one technician" },
        { status: 400 },
      );
    }

    // Force every redo onto the path invoice; ignore any client-supplied invoiceId
    const payload = redos.map((r: any) => ({
      invoiceId: id,
      serviceId: Number(r.serviceId),
      technicianId: Number(r.technicianId),
      notes: r.notes ?? "",
    }));

    const result = await createInvoiceRedo(payload);
    return NextResponse.json({
      success: result.status === 200,
      message: "Redo saved successfully",
    });
  } catch (error: any) {
    console.error("REDO POST ERROR:", error);
    const normalized = errorHandler(error);
    return NextResponse.json(
      { success: false, message: normalized.message || "Failed to save redo" },
      { status: normalized.statusCode || 500 },
    );
  }
}
