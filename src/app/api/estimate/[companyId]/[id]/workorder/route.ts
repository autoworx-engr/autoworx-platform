import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildWorkOrderData, saveWorkOrder } from "./_workorder";

/**
 * @swagger
 * /api/estimate/{companyId}/{id}/workorder:
 *   get:
 *     summary: Get work order data for an invoice
 *     description: Returns invoice, company, technicians-per-item (with photos), redo records and write permission. Mirrors the web getWorkOrderData server action, scoped to the company.
 *     tags:
 *       - Work Order
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer, example: 4 }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: "clxyz123" }
 *         description: Invoice/estimate ID (cuid)
 *     responses:
 *       200: { description: Work order data fetched }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Invoice not found }
 *       500: { description: Internal server error }
 *
 *   patch:
 *     summary: Save / create work order
 *     description: Sets dueDate, marks invoice as work order and stamps workOrderCreatedAt. Mirrors the updateDueDate server action.
 *     tags:
 *       - Work Order
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dueDate: { type: string, example: "2026-07-01" }
 *     responses:
 *       200: { description: Work order saved }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Invoice not found }
 *       500: { description: Internal server error }
 */

async function resolveCompany(req: NextRequest, companyIdParam: string) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const urlCompanyId = parseInt(companyIdParam, 10);
  if (isNaN(urlCompanyId) || urlCompanyId !== principal.companyId) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { principal };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId: companyIdParam, id } = await params;
    const { error, principal } = await resolveCompany(req, companyIdParam);
    if (error) return error;

    const data = await buildWorkOrderData(id, principal!);
    if (!data) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("WORKORDER GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch work order" },
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
    const { error, principal } = await resolveCompany(req, companyIdParam);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const dueDate: string = body?.dueDate ?? "";

    const invoice = await db.invoice.findFirst({
      where: { id, companyId: principal!.companyId },
      select: { id: true },
    });
    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 },
      );
    }

    const updated = await saveWorkOrder(id, dueDate);
    return NextResponse.json({
      success: true,
      message: "Work order saved",
      data: updated,
    });
  } catch (error) {
    console.error("WORKORDER PATCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save work order" },
      { status: 500 },
    );
  }
}
