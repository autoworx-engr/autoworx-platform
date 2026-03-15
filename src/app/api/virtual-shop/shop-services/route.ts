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
        { success: false, message: "Company ID not found in session" },
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
        { success: false, message: "Missing required fields (shopId, title)" },
        { status: 400 },
      );
    }

    // Verify the shop belongs to the user's company
    const shop = await db.shop.findUnique({
      where: { id: parseInt(shopId, 10) },
    });

    if (!shop || shop.companyId !== companyId) {
      return NextResponse.json(
        { success: false, message: "Shop not found or access denied" },
        { status: 404 },
      );
    }

    const newShopService = await db.$transaction(async tx => {
      let totalPrice = 0;
      let totalDuration = 0;
      const categories: string[] = [];

      // Calculate totals BEFORE creating ShopService, or we can update it later.
      // But it's easier to calculate here or update later. Let's create it first, then attach items.
      const serviceRecord = await tx.shopService.create({
        data: {
          shopId: parseInt(shopId, 10),
          title,
          description,
          price: 0,
          duration: 0,
          imageUrl,
          category: categories,
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
            const service = item.service;
            const materials = item.materials || [];
            const labor = item.labor;
            const tags = item.tags || [];

            let laborId;
            let currentItemPrice = 0;
            if (service?.categoryId) {
              const findCategory = await tx.category.findUnique({
                where: { id: service?.categoryId },
              });
              if (findCategory) {
                categories.push(findCategory.name);
              }
            }

            if (labor) {
              const newLabor = await tx.labor.create({
                data: {
                  name: labor.name,
                  categoryId: labor.categoryId,
                  notes: labor.notes,
                  hours: labor.hours,
                  charge: labor.charge,
                  discount: labor.discount,
                  companyId,
                },
              });

              if (labor.tags && labor.tags.length > 0) {
                await Promise.all(
                  labor.tags.map(async tag => {
                    return tx.laborTag.create({
                      data: {
                        laborId: newLabor.id,
                        tagId: tag.id,
                      },
                    });
                  }),
                );
              }

              laborId = newLabor.id;

              const laborCost =
                (Number(labor.charge) || 0) * (Number(labor.hours) || 0);
              const laborDiscount = Number(labor.discount) || 0;
              currentItemPrice += Math.max(0, laborCost - laborDiscount);

              totalDuration += (Number(labor.hours) || 0) * 60; // converting hours to minutes
            }

            const invoiceItem = await tx.invoiceItem.create({
              data: {
                shopServiceId: serviceRecord.id,
                serviceId: service?.id,
                laborId: laborId,
              },
            });

            await Promise.all(
              materials.map(async material => {
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

                if (material.tags && material.tags.length > 0) {
                  await Promise.all(
                    material.tags.map(async tag => {
                      return tx.materialTag.create({
                        data: {
                          materialId: newMat.id,
                          tagId: tag.id,
                        },
                      });
                    }),
                  );
                }

                const matQuantity = Number(material.quantity) || 0;
                const matSell = Number(material.sell) || 0;
                const matDiscount = Number(material.discount) || 0;
                currentItemPrice += Math.max(
                  0,
                  matQuantity * matSell - matDiscount,
                );
              }),
            );

            await Promise.all(
              tags.map(async tag => {
                return tx.itemTag.create({
                  data: {
                    itemId: invoiceItem.id,
                    tagId: tag.id,
                  },
                });
              }),
            );

            totalPrice += currentItemPrice;
          }),
        );
      }

      const finalShopService = await tx.shopService.update({
        where: { id: serviceRecord.id },
        data: {
          price: totalPrice,
          duration: totalDuration > 0 ? totalDuration : 30, // Default to 30 if no labor hours specified
        },
      });

      return finalShopService;
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
