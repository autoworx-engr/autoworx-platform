import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  date: z.string(),
  vendorId: z.number().int().positive().optional(),
  unit: z.string().max(5).optional(),
  lot: z.string().max(50).optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdParam } = await params;
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

    const { productId, quantity, price, date, vendorId, unit, lot, notes } =
      parsed.data;

    const product = await db.inventoryProduct.findFirst({
      where: { id: productId, companyId },
      select: {
        id: true,
        quantity: true,
        price: true,
        unit: true,
        lot: true,
        lowInventoryAlert: true,
        name: true,
      },
    });
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: `Inventory item ${productId} not found for this company.`,
        },
        { status: 404 },
      );
    }

    const newQuantity = Number(product.quantity ?? 0) + quantity;

    const updatedProduct = await db.$transaction(async (tx) => {
      await tx.inventoryProductHistory.create({
        data: {
          companyId,
          productId,
          date: new Date(date),
          quantity,
          notes: notes ?? null,
          type: "Purchase",
          price,
          vendorId: vendorId ?? null,
        },
      });

      return tx.inventoryProduct.update({
        where: { id: productId },
        data: {
          quantity: newQuantity,
          price,
          unit: unit ?? product.unit,
          lot: lot ?? product.lot,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        productId,
        newQuantity: Number(updatedProduct.quantity),
        price: Number(updatedProduct.price),
      },
    });
  } catch (error: any) {
    console.error("INVENTORY REPLENISH ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to replenish inventory",
      },
      { status: 500 },
    );
  }
}
