import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateTechnician } from "@/actions/estimate/technician/updateTechnician";
import { deleteTechnician } from "@/actions/estimate/technician/deleteTechnician";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/estimate/{companyId}/{id}/technicians/{techId}:
 *   patch:
 *     summary: Update a technician assignment
 *     description: Updates technician fields, images and vehicle parts, then recomputes the work order status. Mirrors the updateTechnician server action.
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
 *       - in: path
 *         name: techId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: integer }
 *               serviceId: { type: integer }
 *               date: { type: string }
 *               due: { type: string }
 *               amount: { type: number }
 *               priority: { type: string, enum: [Low, Medium, High] }
 *               status: { type: string, enum: [Pending, "In Progress", Complete, Cancel] }
 *               note: { type: string }
 *               technicianNote: { type: string }
 *               imageUrls:
 *                 type: array
 *                 items: { type: string }
 *               vehicleParts:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       200: { description: Technician updated }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Technician not found }
 *       500: { description: Internal server error }
 *
 *   delete:
 *     summary: Delete a technician assignment
 *     description: Removes the technician (and any linked redo) and recomputes the work order status. Mirrors the deleteTechnician server action.
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
 *       - in: path
 *         name: techId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Technician deleted }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Technician not found }
 *       500: { description: Internal server error }
 */

type Params = Promise<{ companyId: string; id: string; techId: string }>;

async function authorize(
  req: NextRequest,
  companyIdParam: string,
  id: string,
  techIdParam: string,
) {
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
  const techId = parseInt(techIdParam, 10);
  // Technician must belong to an invoice in the caller's company
  const technician = await db.technician.findFirst({
    where: { id: techId, invoiceId: id, companyId: principal.companyId },
    select: { id: true },
  });
  if (isNaN(techId) || !technician) {
    return {
      error: NextResponse.json(
        { success: false, message: "Technician not found" },
        { status: 404 },
      ),
    };
  }
  return { techId };
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const { companyId, id, techId: techIdParam } = await params;
    const { error, techId } = await authorize(req, companyId, id, techIdParam);
    if (error) return error;

    const body = await req.json();
    const {
      vehicleParts = [],
      imageUrls = [],
      name: _name,
      ...rest
    } = body ?? {};

    const result = await updateTechnician(
      techId!,
      {
        ...rest,
        invoiceId: id,
        date: new Date(rest.date),
        due: rest.due ? new Date(rest.due) : null,
        amount: Number(rest.amount),
        serviceId: rest.serviceId ? Number(rest.serviceId) : null,
        userId: Number(rest.userId),
      },
      vehicleParts,
      imageUrls,
    );

    const ok = (result as any)?.type === "success";
    return NextResponse.json(
      {
        success: ok,
        message: ok ? "Technician updated" : (result as any)?.message,
        data: (result as any)?.data,
      },
      { status: ok ? 200 : 400 },
    );
  } catch (error: any) {
    console.error("TECHNICIAN PATCH ERROR:", error);
    const normalized = errorHandler(error);
    return NextResponse.json(
      {
        success: false,
        message: normalized.message || "Failed to update technician",
        path: normalized.errorSource?.[0]?.path ?? "",
      },
      { status: normalized.statusCode || 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const { companyId, id, techId: techIdParam } = await params;
    const { error, techId } = await authorize(req, companyId, id, techIdParam);
    if (error) return error;

    const result = await deleteTechnician({ id: techId!, invoiceId: id });
    const ok = result.type === "success";
    return NextResponse.json(
      { success: ok, message: ok ? "Technician deleted" : result.message },
      { status: ok ? 200 : 400 },
    );
  } catch (error: any) {
    console.error("TECHNICIAN DELETE ERROR:", error);
    const normalized = errorHandler(error);
    return NextResponse.json(
      {
        success: false,
        message: normalized.message || "Failed to delete technician",
      },
      { status: normalized.statusCode || 500 },
    );
  }
}
