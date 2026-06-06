import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ companyId: string; invoiceId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
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

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, companyId },
      select: { id: true, type: true, isWorkOrder: true, columnId: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: `Invoice ${invoiceId} not found.` },
        { status: 404 },
      );
    }

    if (invoice.type !== "Invoice") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only invoices can become work orders. Estimates must be converted to invoices first.",
        },
        { status: 400 },
      );
    }

    if (invoice.isWorkOrder) {
      return NextResponse.json(
        {
          success: false,
          message: `Invoice ${invoiceId} is already a work order.`,
          data: { invoiceId },
        },
        { status: 409 },
      );
    }

    const inProgressCol = await db.column.findFirst({
      where: { companyId, title: "In Progress", type: "shop" },
      select: { id: true },
    });

    const updated = await db.invoice.update({
      where: { id: invoiceId },
      data: {
        isWorkOrder: true,
        workOrderCreatedAt: new Date(),
        columnId: inProgressCol?.id ?? invoice.columnId,
      },
      select: { id: true, isWorkOrder: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        invoiceId: updated.id,
        isWorkOrder: true,
        columnTitle: "In Progress",
      },
    });
  } catch (error: any) {
    console.error("WORK ORDER CREATE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create work order",
      },
      { status: 500 },
    );
  }
}
