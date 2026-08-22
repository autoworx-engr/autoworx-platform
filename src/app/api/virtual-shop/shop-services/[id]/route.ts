import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

import { updateShopServiceSchema } from "@/validations/schemas/virtual-shop/shop-service.validation";

import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { getToken } from "next-auth/jwt";
// Use your update schema if you have one, otherwise falling back to the create schema

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         errorDetails:
 *           type: object
 */

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
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     invoiceItems:
 *                       type: array
 *                       description: Nested invoice items containing detailed breakdown of the service, labor, materials, and tags.
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
 *                             example: 202
 *                           service:
 *                             type: object
 *                             nullable: true
 *                             example: { "id": 5, "name": "Basic Wash", "categoryId": 2 }
 *                           labor:
 *                             type: object
 *                             nullable: true
 *                             example: { "id": 202, "name": "Standard Labor", "hours": 1, "charge": 80 }
 *                           materials:
 *                             type: array
 *                             items:
 *                               type: object
 *                             example: [{ "id": 50, "name": "Premium Wax", "cost": 10, "sell": 15 }]
 *                           tags:
 *                             type: array
 *                             items:
 *                               type: object
 *                             example: [{ "id": 1, "name": "Exterior" }]
 *       400:
 *         description: Invalid or missing parameter (id).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Shop service not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const { id } = params;

    if (!id || isNaN(Number(id))) {
      throw new AppError(400, "Invalid or missing shop service ID");
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
      throw new AppError(404, "Shop service not found");
    }

    return NextResponse.json(
      {
        success: true,
        data: shopService,
      },
      { status: 200 },
    );
  } catch (error: any) {
    const formattedError = errorHandler(error);
    return NextResponse.json(
      {
        success: false,
        message: formattedError.message,
        errorDetails: formattedError,
      },
      { status: formattedError.statusCode },
    );
  }
}

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
 *               - title
 *               - items
 *             properties:
 *               shopId:
 *                 type: number
 *                 description: ID of the underlying shop.
 *                 example: 1
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
 *               customDuration:
 *                 type: number
 *                 description: Explicit duration in minutes.
 *                 example: 120
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: One or more categories to associate with the shop service. Can also be a single string.
 *                 example: ["Detailing"]
 *               items:
 *                 type: array
 *                 description: Nested array for rebuilding invoice configurations. At least one item is required, and each item must have materials or labor.
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
 *             description: "Complete exterior paint correction and ceramic coating application."
 *             imageUrl: "https://example.com/ceramic-coating.jpg"
 *             modifierCoupe: "0"
 *             modifierSedan: "50"
 *             modifierSUV: "100"
 *             modifierTruck: "150"
 *             isActive: true
 *             category: ["Detailing"]
 *             customDuration: 120
 *             items:
 *               - service:
 *                   id: 2526
 *                   name: "Test Door Service 6"
 *                   description: "Full exterior paint correction service."
 *                 labor:
 *                   name: "Master Detailer"
 *                   notes: "Apply carefully"
 *                   tags: []
 *                   hours: 2
 *                   charge: 150
 *                   discount: 0
 *                 materials:
 *                   - name: "ISO 70% ALC"
 *                     notes: "Apply in shaded area only"
 *                     quantity: "1"
 *                     cost: 45
 *                     sell: 150
 *                     discount: 0
 *                     productId: 1
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
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 10
 *                     shopId:
 *                       type: integer
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: "Full Detail Package"
 *                     description:
 *                       type: string
 *                       example: "Updated premium deep cleaning."
 *                     price:
 *                       type: number
 *                       example: 299
 *                     duration:
 *                       type: integer
 *                       example: 300
 *                     category:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Detailing"]
 *                     imageUrl:
 *                       type: string
 *                       example: "https://example.com/image.jpg"
 *                     modifierCoupe:
 *                       type: number
 *                       example: 0
 *                     modifierSedan:
 *                       type: number
 *                       example: 50
 *                     modifierSUV:
 *                       type: number
 *                       example: 75
 *                     modifierTruck:
 *                       type: number
 *                       example: 100
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid or missing data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Shop service not found or access denied.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const serviceId = parseInt(params.id, 10);
    if (isNaN(serviceId)) {
      throw new AppError(400, "Invalid Shop Service ID");
    }

    const body = await req.json();
    const validatedData = await updateShopServiceSchema.parseAsync({
      id: serviceId,
      ...body,
    });

    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    let companyId: number | undefined;

    if (accessToken) {
      try {
        const verifyToken = await jwtVerifyToken(accessToken);
        companyId = verifyToken?.payload?.companyId as number | undefined;
      } catch {
        throw new AppError(401, "Unauthorized");
      }
    } else {
      const sessionToken = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      companyId = sessionToken?.companyId as number | undefined;
    }

    if (!companyId) {
      throw new AppError(401, "Unauthorized");
    }

    const {
      title,
      shortDescription,
      description,
      imageUrl,
      items,
      modifierCoupe,
      modifierSedan,
      modifierSUV,
      modifierTruck,
      isActive,
      customDuration,
      category: providedCategory,
    } = validatedData;

    if (!companyId) {
      throw new AppError(403, "Company ID not found");
    }

    // 1. Verify Ownership
    const existingService = await db.shopService.findUnique({
      where: { id: serviceId },
      include: { shop: true },
    });

    if (!existingService || existingService.shop.companyId !== companyId) {
      throw new AppError(404, "Access denied");
    }

    // 2. PRE-CALCULATE TOTALS & CATEGORIES (Keeps transaction fast)
    let totalPrice = 0;
    let totalDuration = 0;
    const categoryIdsToFetch = new Set<number>();

    items?.forEach((item) => {
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

      item.materials?.forEach((mat) => {
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

    const categorySet = new Set(fetchedCategories.map((c) => c.name));

    if (providedCategory) {
      if (Array.isArray(providedCategory)) {
        providedCategory.forEach((c) => categorySet.add(c));
      } else {
        categorySet.add(providedCategory);
      }
    }

    const categories = Array.from(categorySet);

    // 3. DATABASE TRANSACTION
    const updatedShopService = await db.$transaction(
      async (tx) => {
        // --- BULK CLEANUP PHASE ---
        // Fetch IDs needed for cascading manual deletes
        const oldInvoiceItems = await tx.invoiceItem.findMany({
          where: { shopServiceId: serviceId },
          select: { id: true, laborId: true },
        });

        const oldInvoiceItemIds = oldInvoiceItems.map((i) => i.id);
        const oldLaborIds = oldInvoiceItems
          .map((i) => i.laborId)
          .filter(Boolean) as number[]; // Assuming Int

        if (oldInvoiceItemIds.length > 0) {
          // Find materials linked to these invoice items
          const oldMaterials = await tx.material.findMany({
            where: { invoiceItemId: { in: oldInvoiceItemIds } },
            select: { id: true },
          });
          const oldMaterialIds = oldMaterials.map((m) => m.id);

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
            items.map(async (item) => {
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
                  const validTags = item.labor.tags.filter(
                    (tag): tag is NonNullable<typeof tag> => !!(tag && tag.id),
                  );
                  await tx.laborTag.createMany({
                    data: validTags.map((tag) => ({
                      laborId: newLabor.id,
                      tagId: tag.id!,
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
                  item.materials.map(async (material) => {
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
                      const validTags = material.tags.filter(
                        (tag): tag is NonNullable<typeof tag> =>
                          !!(tag && tag.id),
                      );
                      await tx.materialTag.createMany({
                        data: validTags.map((tag) => ({
                          materialId: newMat.id,
                          tagId: tag.id!,
                        })),
                      });
                    }
                  }),
                );
              }

              if (item.tags?.length) {
                const validTags = item.tags.filter(
                  (tag): tag is NonNullable<typeof tag> => !!(tag && tag.id),
                );
                await tx.itemTag.createMany({
                  data: validTags.map((tag) => ({
                    itemId: invoiceItem.id,
                    tagId: tag.id!,
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
            shortDescription,
            description,
            imageUrl,
            category: categories,
            modifierCoupe: modifierCoupe ? Number(modifierCoupe) : 0,
            modifierSedan: modifierSedan ? Number(modifierSedan) : 0,
            modifierSUV: modifierSUV ? Number(modifierSUV) : 0,
            modifierTruck: modifierTruck ? Number(modifierTruck) : 0,
            isActive: isActive !== undefined ? isActive : true,
            price: totalPrice,
            duration: (() => {
              const base =
                customDuration !== undefined && customDuration !== null
                  ? Number(customDuration)
                  : totalDuration;
              return base > 0 ? base : 30;
            })(),
          },
        });
      },
      {
        timeout: 30000,
        maxWait: 10000,
      },
    );

    return NextResponse.json(
      { success: true, data: updatedShopService },
      { status: 200 },
    );
  } catch (error: any) {
    const formattedError = errorHandler(error);
    return NextResponse.json(
      {
        success: false,
        message: formattedError.message,
        errorDetails: formattedError,
      },
      { status: formattedError.statusCode },
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
 *       400:
 *         description: Missing required id or bad request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Company ID not found in session.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Shop service not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    let companyId: number | undefined;

    if (accessToken) {
      try {
        const verifyToken = await jwtVerifyToken(accessToken);
        companyId = verifyToken?.payload?.companyId as number | undefined;
      } catch {
        throw new AppError(401, "Unauthorized");
      }
    } else {
      const sessionToken = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      companyId = sessionToken?.companyId as number | undefined;
    }

    if (!companyId) {
      throw new AppError(401, "Unauthorized");
    }

    const id = params.id;

    if (!id) {
      throw new AppError(400, "Missing required id");
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
    const formattedError = errorHandler(error);
    return NextResponse.json(
      {
        success: false,
        message: formattedError.message,
        errorDetails: formattedError,
      },
      { status: formattedError.statusCode },
    );
  }
}
