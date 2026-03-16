import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { updateShopServiceSchema } from "@/validations/schemas/virtual-shop/shop-service.validation";

import { Labor, Material, Service, Tag } from "@prisma/client";
// Use your update schema if you have one, otherwise falling back to the create schema

type TUpdateShopServiceRequest = {
  shopId: string;
  title: string;
  description?: string;
  items: {
    id?: number;
    service: Service | null;
    materials: ((Material & { tags: Tag[] }) | null)[];
    labor: (Labor & { tags: Tag[] }) | null;
    tags: Tag[];
    serviceDesc?: string;
  }[];
  imageUrl?: string;
  modifierCoupe?: string;
  modifierSedan?: string;
  modifierSUV?: string;
  modifierTruck?: string;
  isActive?: boolean;
};

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Company ID not found" },
        { status: 403 },
      );
    }

    const serviceId = parseInt(params.id, 10);
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { success: false, message: "Invalid Shop Service ID" },
        { status: 400 },
      );
    }

    const body = (await req.json()) as TUpdateShopServiceRequest;
    await updateShopServiceSchema.parseAsync(body);

    const {
      title,
      description,
      imageUrl,
      items,
      modifierCoupe,
      modifierSedan,
      modifierSUV,
      modifierTruck,
      isActive,
    } = body;

    // 1. Verify Ownership
    const existingService = await db.shopService.findUnique({
      where: { id: serviceId },
      include: { shop: true },
    });

    if (!existingService || existingService.shop.companyId !== companyId) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 404 },
      );
    }

    // 2. PRE-CALCULATE TOTALS & CATEGORIES (Keeps transaction fast)
    let totalPrice = 0;
    let totalDuration = 0;
    const categoryIdsToFetch = new Set<number>();

    items?.forEach(item => {
      if (item.service?.categoryId) {
        categoryIdsToFetch.add(item.service.categoryId);
      }

      if (item.labor) {
        const laborCost =
          (Number(item.labor.charge) || 0) * (Number(item.labor.hours) || 0);
        const laborDiscount = Number(item.labor.discount) || 0;
        totalPrice += Math.max(0, laborCost - laborDiscount);
        totalDuration += (Number(item.labor.hours) || 0) * 60;
      }

      item.materials?.forEach(mat => {
        if (!mat || !mat.name) return;
        const matQuantity = Number(mat.quantity) || 0;
        const matSell = Number(mat.sell) || 0;
        const matDiscount = Number(mat.discount) || 0;
        totalPrice += Math.max(0, matQuantity * matSell - matDiscount);
      });
    });

    // Fetch categories in ONE query outside the transaction
    const fetchedCategories = await db.category.findMany({
      where: { id: { in: Array.from(categoryIdsToFetch) } },
      select: { name: true },
    });
    const categories = fetchedCategories.map(c => c.name);

    // 3. DATABASE TRANSACTION
    const updatedShopService = await db.$transaction(async tx => {
      // --- BULK CLEANUP PHASE ---
      // Fetch IDs needed for cascading manual deletes
      const oldInvoiceItems = await tx.invoiceItem.findMany({
        where: { shopServiceId: serviceId },
        select: { id: true, laborId: true },
      });

      const oldInvoiceItemIds = oldInvoiceItems.map(i => i.id);
      const oldLaborIds = oldInvoiceItems
        .map(i => i.laborId)
        .filter(Boolean) as number[]; // Assuming Int

      if (oldInvoiceItemIds.length > 0) {
        // Find materials linked to these invoice items
        const oldMaterials = await tx.material.findMany({
          where: { invoiceItemId: { in: oldInvoiceItemIds } },
          select: { id: true },
        });
        const oldMaterialIds = oldMaterials.map(m => m.id);

        if (oldMaterialIds.length > 0) {
          await tx.materialTag.deleteMany({
            where: { materialId: { in: oldMaterialIds } },
          });
          await tx.material.deleteMany({
            where: { id: { in: oldMaterialIds } },
          });
        }

        await tx.itemTag.deleteMany({
          where: { itemId: { in: oldInvoiceItemIds } },
        });
        await tx.invoiceItem.deleteMany({
          where: { id: { in: oldInvoiceItemIds } },
        });
      }

      if (oldLaborIds.length > 0) {
        await tx.laborTag.deleteMany({
          where: { laborId: { in: oldLaborIds } },
        });
        await tx.labor.deleteMany({ where: { id: { in: oldLaborIds } } });
      }

      // --- REBUILD PHASE ---
      if (items && items.length > 0) {
        await Promise.all(
          items.map(async item => {
            let newLaborId;

            if (item.labor) {
              const newLabor = await tx.labor.create({
                data: {
                  name: item.labor.name,
                  categoryId: item.labor.categoryId,
                  notes: item.labor.notes,
                  hours: item.labor.hours,
                  charge: item.labor.charge,
                  discount: item.labor.discount,
                  companyId,
                },
              });
              newLaborId = newLabor.id;

              if (item.labor.tags?.length) {
                await tx.laborTag.createMany({
                  data: item.labor.tags.map(tag => ({
                    laborId: newLabor.id,
                    tagId: tag.id,
                  })),
                });
              }
            }

            const invoiceItem = await tx.invoiceItem.create({
              data: {
                shopServiceId: serviceId,
                serviceId: item.service?.id,
                laborId: newLaborId,
              },
            });

            if (item.materials?.length) {
              await Promise.all(
                item.materials.map(async material => {
                  if (!material || !material.name) return;

                  const newMat = await tx.material.create({
                    data: {
                      name: material.name,
                      vendorId: material.vendorId,
                      categoryId: material.categoryId,
                      notes: material.notes,
                      quantity: material.quantity,
                      cost: material.cost,
                      sell: material.sell,
                      discount: material.discount,
                      companyId,
                      invoiceItemId: invoiceItem.id,
                      productId: material.productId,
                    },
                  });

                  if (material.tags?.length) {
                    await tx.materialTag.createMany({
                      data: material.tags.map(tag => ({
                        materialId: newMat.id,
                        tagId: tag.id,
                      })),
                    });
                  }
                }),
              );
            }

            if (item.tags?.length) {
              await tx.itemTag.createMany({
                data: item.tags.map(tag => ({
                  itemId: invoiceItem.id,
                  tagId: tag.id,
                })),
              });
            }
          }),
        );
      }

      // --- UPDATE PARENT RECORD ---
      return await tx.shopService.update({
        where: { id: serviceId },
        data: {
          title,
          description,
          imageUrl,
          category: categories,
          modifierCoupe: modifierCoupe ? parseFloat(modifierCoupe) : 0,
          modifierSedan: modifierSedan ? parseFloat(modifierSedan) : 0,
          modifierSUV: modifierSUV ? parseFloat(modifierSUV) : 0,
          modifierTruck: modifierTruck ? parseFloat(modifierTruck) : 0,
          isActive: isActive !== undefined ? isActive : true,
          price: totalPrice,
          duration: totalDuration > 0 ? totalDuration : 30,
        },
      });
    });

    return NextResponse.json(
      { success: true, data: updatedShopService },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error updating shop service:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Company ID not found in session" },
        { status: 403 },
      );
    }

    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing required id" },
        { status: 400 },
      );
    }

    const deletedShopService = await db.shopService.delete({
      where: { id: parseInt(id, 10), shop: { companyId } },
    });

    return NextResponse.json({
      success: true,
      message: "Shop service deleted successfully",
      data: deletedShopService,
    });
  } catch (error: any) {
    console.error("Error deleting shop service:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Something went wrong" },
      { status: 500 },
    );
  }
}
