import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createTechnician, listTechnicians } from "./_technicians";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/estimate/{companyId}/{id}/technicians:
 *   get:
 *     summary: List technicians assigned to an invoice
 *     description: Returns technicians (with user, vehicleParts, images and hasPermission) for an invoice. Optionally filter by invoiceItemId. Mirrors getTechniciansWithPermission.
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
 *       - in: query
 *         name: invoiceItemId
 *         required: false
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Technicians listed }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Invoice not found }
 *       500: { description: Internal server error }
 *
 *   post:
 *     summary: Assign a technician to an invoice item
 *     description: Creates a technician assignment and recomputes the work order status. Mirrors the addTechnician server action.
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
 *             required: [userId, serviceId, invoiceItemId]
 *             properties:
 *               userId: { type: integer }
 *               serviceId: { type: integer }
 *               invoiceItemId: { type: integer }
 *               date: { type: string, example: "2026-07-01" }
 *               due: { type: string, example: "2026-07-05" }
 *               amount: { type: number }
 *               priority: { type: string, enum: [Low, Medium, High] }
 *               status: { type: string, enum: [Pending, "In Progress", Complete, Cancel] }
 *               note: { type: string }
 *               technicianNote: { type: string }
 *               vehicleParts:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       200: { description: Technician assigned }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Invoice not found }
 *       500: { description: Internal server error }
 */

async function authorize(req: NextRequest, companyIdParam: string, id: string) {
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
  const invoice = await db.invoice.findFirst({
    where: { id, companyId: principal.companyId },
    select: { id: true },
  });
  if (!invoice) {
    return {
      error: NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 },
      ),
    };
  }
  return { principal };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId, id } = await params;
    const { error, principal } = await authorize(req, companyId, id);
    if (error) return error;

    const itemParam = req.nextUrl.searchParams.get("invoiceItemId");
    const invoiceItemId = itemParam ? parseInt(itemParam, 10) : undefined;

    const data = await listTechnicians(id, invoiceItemId, principal!.userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("TECHNICIANS GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to list technicians" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId, id } = await params;
    const { error, principal } = await authorize(req, companyId, id);
    if (error) return error;

    const body = await req.json();
    const { vehicleParts = [], ...rest } = body ?? {};

    const data = await createTechnician(
      {
        ...rest,
        invoiceId: id,
        date: new Date(rest.date),
        due: rest.due ? new Date(rest.due) : null,
        amount: Number(rest.amount),
        serviceId: Number(rest.serviceId),
        invoiceItemId: Number(rest.invoiceItemId),
        userId: Number(rest.userId),
      },
      vehicleParts,
      principal!.companyId,
    );

    return NextResponse.json({
      success: true,
      message: "Technician assigned",
      data,
    });
  } catch (error: any) {
    console.error("TECHNICIANS POST ERROR:", error);
    const normalized = errorHandler(error);
    return NextResponse.json(
      {
        success: false,
        message: normalized.message || "Failed to assign technician",
        path: normalized.errorSource?.[0]?.path ?? "",
      },
      { status: normalized.statusCode || 500 },
    );
  }
}
