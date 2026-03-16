import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { Labor, Material, Service, Tag } from "@prisma/client";
import { createShopServiceSchema } from "@/validations/schemas/virtual-shop/shop-service.validation";

type TCreateShopServiceRequest = {
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

export async function POST(req: Request) {
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

    const body = (await req.json()) as TCreateShopServiceRequest;
    await createShopServiceSchema.parseAsync(body);

    const {
      shopId,
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

    if (!shopId || !title) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    // 1. Verify the shop belongs to the user's company
    const shop = await db.shop.findUnique({
      where: { id: parseInt(shopId, 10) },
    });

    if (!shop || shop.companyId !== companyId) {
      return NextResponse.json(
        { success: false, message: "Shop not found or access denied" },
        { status: 404 },
      );
    }

    // 2. PRE-CALCULATE TOTALS & CATEGORIES (Keeps transaction fast & fixes the category bug)
    let totalPrice = 0;
    let totalDuration = 0;
    const categoryIdsToFetch = new Set<number>();

    items?.forEach(item => {
      // Gather category IDs
      if (item.service?.categoryId) {
        categoryIdsToFetch.add(item.service.categoryId);
      }

      // Calculate Labor
      if (item.labor) {
        const laborCost =
          (Number(item.labor.charge) || 0) * (Number(item.labor.hours) || 0);
        const laborDiscount = Number(item.labor.discount) || 0;
        totalPrice += Math.max(0, laborCost - laborDiscount);
        totalDuration += (Number(item.labor.hours) || 0) * 60; // converting hours to minutes
      }

      // Calculate Materials
      item.materials?.forEach(mat => {
        if (!mat || !mat.name) return;
        const matQuantity = Number(mat.quantity) || 0;
        const matSell = Number(mat.sell) || 0;
        const matDiscount = Number(mat.discount) || 0;
        totalPrice += Math.max(0, matQuantity * matSell - matDiscount);
      });
    });

    // Default duration to 30 mins if no labor hours were specified
    if (totalDuration === 0) totalDuration = 30;

    // Fetch all categories in ONE query outside the transaction
    const fetchedCategories = await db.category.findMany({
      where: { id: { in: Array.from(categoryIdsToFetch) } },
      select: { name: true },
    });
    const categories = fetchedCategories.map(c => c.name);

    // 3. DATABASE TRANSACTION
    const newShopService = await db.$transaction(async tx => {
      // Because we pre-calculated everything, we can create the final record immediately.
      // No need to update it at the end of the transaction!
      const serviceRecord = await tx.shopService.create({
        data: {
          shopId: parseInt(shopId, 10),
          title,
          description,
          price: totalPrice,
          duration: totalDuration,
          imageUrl,
          category: categories, // Properly populates the categories array now
          modifierCoupe: modifierCoupe ? parseFloat(modifierCoupe) : 0,
          modifierSedan: modifierSedan ? parseFloat(modifierSedan) : 0,
          modifierSUV: modifierSUV ? parseFloat(modifierSUV) : 0,
          modifierTruck: modifierTruck ? parseFloat(modifierTruck) : 0,
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      if (items && items.length > 0) {
        await Promise.all(
          items.map(async item => {
            let laborId;

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
              laborId = newLabor.id;

              // Use createMany instead of a loop for tags
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
                shopServiceId: serviceRecord.id,
                serviceId: item.service?.id,
                laborId: laborId,
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

                  // Use createMany instead of a loop for tags
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

            // Use createMany instead of a loop for item tags
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

      return serviceRecord;
    });

    return NextResponse.json(
      { success: true, data: newShopService },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating shop service:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Something went wrong" },
      { status: 500 },
    );
  }
}
