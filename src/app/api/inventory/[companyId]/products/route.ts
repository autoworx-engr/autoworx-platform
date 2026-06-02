import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(3).max(100),
  type: z.enum(["Product", "Supply"]),
  quantity: z.number().nonnegative(),
  price: z.number().nonnegative(),
  unit: z.string().max(5).optional().default("pc"),
  description: z.string().max(1000).optional(),
  vendorId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  lowInventoryAlert: z.number().int().nonnegative().optional(),
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

    const {
      name,
      type,
      quantity,
      price,
      unit,
      description,
      vendorId,
      categoryId,
      lowInventoryAlert,
    } = parsed.data;

    if (
      lowInventoryAlert !== undefined &&
      lowInventoryAlert !== null &&
      lowInventoryAlert >= quantity
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `lowInventoryAlert (${lowInventoryAlert}) must be less than quantity (${quantity}).`,
        },
        { status: 400 },
      );
    }

    const existing = await db.inventoryProduct.findFirst({
      where: { name, companyId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `An inventory item named '${name}' already exists for this company.`,
        },
        { status: 409 },
      );
    }

    const newProduct = await db.$transaction(async (tx) => {
      const product = await tx.inventoryProduct.create({
        data: {
          name,
          type,
          quantity,
          price,
          unit: unit ?? "pc",
          description: description ?? null,
          vendorId: vendorId ?? null,
          categoryId: categoryId ?? null,
          lowInventoryAlert: lowInventoryAlert ?? null,
          companyId,
        },
      });
      await tx.inventoryProductHistory.create({
        data: {
          companyId,
          productId: product.id,
          date: new Date(),
          quantity: Number(product.quantity) || 1,
          type: "Purchase",
          price: product.price,
          vendorId: product.vendorId ?? null,
        },
      });
      return product;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          productId: newProduct.id,
          name: newProduct.name,
          type: newProduct.type,
          quantity: Number(newProduct.quantity),
          price: Number(newProduct.price),
          unit: newProduct.unit ?? "pc",
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("INVENTORY CREATE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create inventory item",
      },
      { status: 500 },
    );
  }
}
