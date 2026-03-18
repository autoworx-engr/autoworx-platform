import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { updateShopServiceSchema } from "@/validations/schemas/virtual-shop/shop-service.validation";

import { Labor, Material, Service, Tag } from "@prisma/client";
// Use your update schema if you have one, otherwise falling back to the create schema

/**
 * @swagger
 * /api/virtual-shop/shop-services/{id}:
 *   get:
 *     summary: Retrieve a specific shop service by ID
 *     description: Fetch a specific shop service including its nested invoice items, labor, materials, and tags based on the provided shop service ID.
 *     tags:
 *       - Virtual Shop
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the shop service to retrieve.
 *     responses:
 *       200:
 *         description: Successfully fetched the shop service.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     shopId:
 *                       type: integer
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: "Interior Deep Clean"
 *                     description:
 *                       type: string
 *                       example: "Full vacuum, steam cleaning, leather conditioning."
 *                     price:
 *                       type: number
 *                       example: 129
 *                     duration:
 *                       type: integer
 *                       example: 120
 *                     category:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Detailing"]
 *                     imageUrl:
 *                       type: string
 *                       nullable: true
 *                       example: "https://example.com/image.jpg"
 *                     modifierCoupe:
 *                       type: number
 *                       example: 0
 *                     modifierSedan:
 *                       type: number
 *                       example: 20
 *                     modifierSUV:
 *                       type: number
 *                       example: 30
 *                     modifierTruck:
 *                       type: number
 *                       example: 40
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     invoiceItems:
 *                       type: array
 *                       description: Nested invoice items containing detailed breakdown of the service, labor, and materials.
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 101
 *                           serviceId:
 *                             type: integer
 *                             nullable: true
 *                             example: 5
 *                           laborId:
 *                             type: integer
 *                             nullable: true
 *                             example: null
 *                           service:
 *                             type: object
 *                             nullable: true
 *                             example: { "id": 5, "name": "Basic Wash", "categoryId": 2 }
 *                           materials:
 *                             type: array
 *                             items:
 *                               type: object
 *                             example: [{ "id": 50, "name": "Premium Wax", "cost": 10, "sell": 15 }]
 *       400:
 *         description: Invalid or missing parameter (id).
 *       404:
 *         description: Shop service not found.
 *       500:
 *         description: Internal server error.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, message: "Invalid or missing shop service ID" },
        { status: 400 },
      );
    }

    const shopService = await db.shopService.findUnique({
      where: {
        id: parseInt(id, 10),
      },
      include: {
        invoiceItems: {
          include: {
            service: true,
            labor: true,
            materials: true,
            tags: true,
          },
        },
      },
    });

    if (!shopService) {
      return NextResponse.json(
        { success: false, message: "Shop service not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: shopService,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching shop service by ID:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch shop service",
      },
      { status: 500 },
    );
  }
}

type TUpdateShopServiceRequest = {
  shopId: number;
  companyId: number;
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

/**
 * @swagger
 * /api/virtual-shop/shop-services/{id}:
 *   put:
 *     summary: Update an existing shop service
 *     description: Modifies a shop service, recalculates totals, rebuilds nested dependencies (like invoice items, labor, and materials), and updates based on the provided values. Requires authentication.
 *     tags:
 *       - Virtual Shop
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the shop service to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shopId
 *               - companyId
 *               - title
 *               - items
 *             properties:
 *               shopId:
 *                 type: number
 *                 description: ID of the underlying shop.
 *                 example: 1
 *               companyId:
 *                 type: number
 *                 description: ID of the company owning the shop.
 *                 example: 4
 *               title:
 *                 type: string
 *                 description: Title of the shop service.
 *                 example: "Full Detail Package Updated"
 *               description:
 *                 type: string
 *                 description: Optional description.
 *                 example: "Updated premium deep cleaning inside and out."
 *               imageUrl:
 *                 type: string
 *                 description: Optional image URL.
 *                 example: "https://example.com/updated-image.jpg"
 *               modifierCoupe:
 *                 type: string
 *                 description: Price modifier for Coupe.
 *                 example: "0"
 *               modifierSedan:
 *                 type: string
 *                 description: Price modifier for Sedan.
 *                 example: "10"
 *               modifierSUV:
 *                 type: string
 *                 description: Price modifier for SUV.
 *                 example: "20"
 *               modifierTruck:
 *                 type: string
 *                 description: Price modifier for Truck.
 *                 example: "30"
 *               isActive:
 *                 type: boolean
 *                 description: Toggle service availability.
 *                 example: true
 *               items:
 *                 type: array
 *                 description: Nested array for rebuilding invoice configurations.
 *                 items:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: object
 *                       nullable: true
 *                       example: { "id": 5, "name": "service name", "categoryId": 1, "description": "anything" }
 *                     labor:
 *                       type: object
 *                       nullable: true
 *                       example: { "name": "Deep Clean Labor", "hours": 5, "charge": 50, "discount": 0, "tags": [] }
 *                     materials:
 *                       type: array
 *                       items:
 *                         type: object
 *                       example: [{ "name": "Premium Wax", "quantity": 1, "cost": 15, "sell": 49, "discount": 0, "tags": [] }]
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: object
 *                       example: []
 *                     serviceDesc:
 *                       type: string
 *                       example: "Includes paint decontamination."
 *           example:
 *             shopId: 1
 *             title: "Full Ceramic Coating & Detail"
 *             companyId: 4
 *             description: "Complete exterior paint correction and c..."
 *             imageUrl: "https://example.com/ceramic-coating.jpg"
 *             modifierCoupe: "0"
 *             modifierSedan: "50"
 *             modifierSUV: "100"
 *             modifierTruck: "150"
 *             isActive: true
 *             items:
 *               - service:
 *                   id: 2526
 *                   name: "Test Door Serffvice 6"
 *                   description: "Full exterior paint correction service."
 *                   companyId: 4
 *                   categoryId: 421
 *                   createdAt: "2024-01-15T08:00:00.000Z"
 *                   updatedAt: "2024-06-10T12:00:00.000Z"
 *                 labor:
 *                   name: "Master Detailer"
 *                   notes: "Apply carefully"
 *                   tags: []
 *                   hours: 2
 *                   charge: 150
 *                   discount: 0
 *                   cannedLabor: false
 *                 materials:
 *                   - name: "ISO 70% ALC"
 *                     notes: "Apply in shaded area only"
 *                     quantity: "1"
 *                     cost: 45
 *                     sell: 150
 *                     discount: 0
 *                     companyId: 4
 *                     productId: 1
 *                     createdAt: "2024-01-15T08:00:00.000Z"
 *                     updatedAt: "2024-06-10T12:00:00.000Z"
 *                     tags: []
 *                 tags: []
 *     responses:
 *       200:
 *         description: Successfully updated shop service.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Updated Shop Service object
 *       400:
 *         description: Invalid or missing data.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Company ID not found.
 *       404:
 *         description: Shop service not found or access denied.
 *       500:
 *         description: Internal server error.
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const serviceId = parseInt(params.id, 10);
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { success: false, message: "Invalid Shop Service ID" },
        { status: 400 },
      );
    }

    const body = (await req.json()) as TUpdateShopServiceRequest;
    await updateShopServiceSchema.parseAsync({ id: serviceId, ...body });

    const {
      title,
      description,
      imageUrl,
      companyId,
      items,
      modifierCoupe,
      modifierSedan,
      modifierSUV,
      modifierTruck,
      isActive,
    } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Company ID not found" },
        { status: 403 },
      );
    }

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

/**
 * @swagger
 * /api/virtual-shop/shop-services/{id}:
 *   delete:
 *     summary: Delete a shop service
 *     description: Deletes an existing shop service. Ensures the requesting user belongs to the company running the shop service. Requires authentication.
 *     tags:
 *       - Virtual Shop
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the shop service to delete.
 *     responses:
 *       200:
 *         description: Successfully deleted the shop service.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Shop service deleted successfully"
 *                 data:
 *                   type: object
 *                   description: The raw response data for the deleted service.
 *       400:
 *         description: Missing required id or bad request.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Company ID not found in session.
 *       500:
 *         description: Internal server error.
 */
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
