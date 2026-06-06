import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  userId: z.number().int().positive(),
  invoiceItemId: z.number().int().positive(),
  date: z.string().optional(),
  due: z.string(),
  amount: z.number().nonnegative().optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  status: z.enum(["Pending", "In Progress"]).optional(),
  note: z.string().optional(),
});

type Params = { params: Promise<{ companyId: string; invoiceId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { companyId: companyIdParam, invoiceId } = await params;
    const jwtCompanyId = await getCompanyIdFromBearer(req);
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      userId,
      invoiceItemId,
      date,
      due,
      amount,
      priority = "Medium",
      status = "Pending",
      note,
    } = parsed.data;

    // Verify invoice is a work order belonging to this company
    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, companyId },
      select: { id: true, isWorkOrder: true },
    });
    if (!invoice) {
      return NextResponse.json(
        { success: false, message: `Invoice ${invoiceId} not found.` },
        { status: 404 },
      );
    }
    if (!invoice.isWorkOrder) {
      return NextResponse.json(
        {
          success: false,
          message: `${invoiceId} is not a work order. Convert it to a work order first.`,
        },
        { status: 400 },
      );
    }

    // Verify user belongs to this company
    const user = await db.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: `User ${userId} not found in this company.`,
        },
        { status: 404 },
      );
    }

    // Verify invoiceItem belongs to this invoice
    const item = await db.invoiceItem.findFirst({
      where: { id: invoiceItemId, invoiceId },
      include: { labor: true },
    });
    if (!item) {
      return NextResponse.json(
        {
          success: false,
          message: `Service item ${invoiceItemId} not found on invoice ${invoiceId}.`,
        },
        { status: 404 },
      );
    }

    const laborAmount =
      amount ??
      Number(item.labor?.charge ?? 0) * Number(item.labor?.hours ?? 0);

    // Transaction: resolve serviceId → backfill InvoiceItem → create Technician
    const technician = await db.$transaction(async (tx) => {
      let serviceId = item.serviceId;

      if (!serviceId) {
        const serviceName = item.serviceDesc ?? "General Service";

        let service = await tx.service.findFirst({
          where: {
            name: { equals: serviceName, mode: "insensitive" },
            companyId,
          },
          select: { id: true },
        });

        if (!service) {
          service = await tx.service.create({
            data: { name: serviceName, companyId },
            select: { id: true },
          });
        }

        serviceId = service.id;

        await tx.invoiceItem.update({
          where: { id: invoiceItemId },
          data: { serviceId },
        });
      }

      return tx.technician.create({
        data: {
          userId,
          invoiceId,
          invoiceItemId,
          serviceId,
          companyId,
          date: date ? new Date(date) : new Date(),
          due: new Date(due),
          amount: laborAmount,
          priority,
          status,
          note: note ?? null,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          technicianId: technician.id,
          userId,
          invoiceItemId,
          serviceDesc: item.serviceDesc ?? "General Service",
          status: technician.status,
          priority: technician.priority,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("TECHNICIAN ASSIGN ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to assign technician",
      },
      { status: 500 },
    );
  }
}
