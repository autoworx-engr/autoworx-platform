import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { createShopServiceSchema } from "@/validations/schemas/virtual-shop/shop-service.validation";
import { Labor, Material, Prisma, Service, Tag } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

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
 * /api/virtual-shop/shop-services:
 *   get:
 *     summary: Retrieve a paginated list of shop services
 *     description: Fetch shop services associated with a specific shop ID, including their invoice items. Supports filtering by category, searching by title, and pagination.
 *     tags:
 *       - Virtual Shop
 *     parameters:
 *       - in: query
 *         name: shopId
 *         required: true
 *         schema:
 *           type: number
 *         description: The ID of the shop to fetch services for.
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter services by category name (e.g., 'Detailing'). Pass "All" to skip this filter.
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search keyword to filter services by title (case-insensitive).
 *       - in: query
 *         name: includeInactive
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: When true, returns both active and inactive services. When omitted or false, returns active services only.
 *       - in: query
 *         name: sortOrder
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order based on creation date.
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Limit of items per page.
 *     responses:
 *       200:
 *         description: Successfully fetched shop services.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totalRecords:
 *                       type: integer
 *                       example: 45
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPrevPage:
 *                       type: boolean
 *                       example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       shopId:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "Interior Deep Clean"
 *                       description:
 *                         type: string
 *                         example: "Full vacuum, steam cleaning, leather conditioning."
 *                       price:
 *                         type: number
 *                         example: 129
 *                       duration:
 *                         type: integer
 *                         example: 120
 *                       category:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Detailing"]
 *                       imageUrl:
 *                         type: string
 *                         nullable: true
 *                         example: "https://example.com/image.jpg"
 *                       modifierCoupe:
 *                         type: number
 *                         example: 0
 *                       modifierSedan:
 *                         type: number
 *                         example: 20
 *                       modifierSUV:
 *                         type: number
 *                         example: 30
 *                       modifierTruck:
 *                         type: number
 *                         example: 40
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       invoiceItems:
 *                         type: array
 *                         description: Nested invoice items containing detailed breakdown of the service, labor, materials, and tags.
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 101
 *                             serviceId:
 *                               type: integer
 *                               nullable: true
 *                               example: 5
 *                             laborId:
 *                               type: integer
 *                               nullable: true
 *                               example: 202
 *                             service:
 *                               type: object
 *                               nullable: true
 *                               example: { "id": 5, "name": "Basic Wash", "categoryId": 2 }
 *                             labor:
 *                               type: object
 *                               nullable: true
 *                               example: { "id": 202, "name": "Standard Labor", "hours": 1, "charge": 80 }
 *                             materials:
 *                               type: array
 *                               items:
 *                                 type: object
 *                               example: [{ "id": 50, "name": "Premium Wax", "cost": 10, "sell": 15 }]
 *                             tags:
 *                               type: array
 *                               items:
 *                                 type: object
 *                               example: [{ "id": 1, "name": "Exterior" }]
 *       400:
 *         description: Missing required parameter (shopId).
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
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim() || null;
    const includeInactive = searchParams.get("includeInactive") === "true";
    // Default to 'desc' if not provided, strongly type the allowed values
    const sortOrder = (
      searchParams.get("sortOrder") === "asc" ? "asc" : "desc"
    ) as Prisma.SortOrder;

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    if (!shopId) {
      throw new AppError(400, "Missing shopId");
    }

    const whereClause: Prisma.ShopServiceWhereInput = {
      shopId: parseInt(shopId, 10),
      ...(includeInactive ? {} : { isActive: true }),
    };

    if (category && category !== "All") {
      whereClause.category = {
        has: category,
      };
    }

    if (search) {
      whereClause.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Run both queries in parallel for better performance
    const [totalRecords, shopServices] = await Promise.all([
      db.shopService.count({ where: whereClause }),
      db.shopService.findMany({
        where: whereClause,
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
        orderBy: {
          createdAt: sortOrder,
        },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json(
      {
        success: true,
        meta: {
          totalRecords,
          totalPages,
          page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        data: shopServices,
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
 * /api/virtual-shop/shop-services:
 *   post:
 *     summary: Create a new shop service
 *     description: Creates a new shop service, including nested invoice items, materials, labor, and their tags. Calculates total base price from items automatically.
 *     tags:
 *       - Virtual Shop
 *     security:
 *       - bearerAuth: []
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
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: "Full Detail Package"
 *               description:
 *                 type: string
 *                 example: "Complete interior and exterior detailing."
 *               imageUrl:
 *                 type: string
 *                 example: "https://example.com/image.jpg"
 *               modifierCoupe:
 *                 type: string
 *                 example: "0"
 *               modifierSedan:
 *                 type: string
 *                 example: "50"
 *               modifierSUV:
 *                 type: string
 *                 example: "75"
 *               modifierTruck:
 *                 type: string
 *                 example: "100"
 *               customDuration:
 *                 type: number
 *                 description: Custom duration for the service in minutes.
 *                 example: 120
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: One or more categories to associate with the shop service. Can also be a single string.
 *                 example: ["Detailing"]
 *               items:
 *                 type: array
 *                 description: Includes materials and labor to auto-calculate the service base price. At least one item is required, and each item must have materials or labor.
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
 *                       example: { "name": "Deep Clean Labor", "categoryId": 1, "notes": "Thoroughly clean", "hours": 5, "charge": 50, "discount": 0, "tags": [] }
 *                     materials:
 *                       type: array
 *                       items:
 *                         type: object
 *                       example: [{ "name": "Premium Wax", "vendorId": 2, "categoryId": 3, "notes": "Carnauba", "quantity": 1, "cost": 15, "sell": 49, "discount": 0, "productId": 4, "tags": [] }]
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
 *       201:
 *         description: Shop service successfully created.
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
 *                       example: "Complete interior and exterior detailing."
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
 *         description: Missing required fields or validation failure.
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
 *         description: Shop not found or access denied.
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
type TCreateShopServiceRequest = {
  shopId: number;
  companyId: number;
  title: string;
  shortDescription?: string;
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
  customDuration?: string | number;
  category?: string | string[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TCreateShopServiceRequest;
    await createShopServiceSchema.parseAsync(body);

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
      shopId,
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
    } = body;

    if (!shopId || !title) {
      throw new AppError(400, "Missing required fields");
    }

    // 1. Verify the shop belongs to the user's company
    const shop = await db.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop || shop.companyId !== companyId) {
      throw new AppError(404, "Shop not found or access denied");
    }

    // 2. PRE-CALCULATE TOTALS & CATEGORIES (Keeps transaction fast & fixes the category bug)
    let totalPrice = 0;
    let totalDuration = 0;
    const categoryIdsToFetch = new Set<number>();

    items?.forEach((item) => {
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
      item.materials?.forEach((mat) => {
        if (!mat || !mat.name) return;
        const matQuantity = Number(mat.quantity) || 0;
        const matSell = Number(mat.sell) || 0;
        const matDiscount = Number(mat.discount) || 0;
        totalPrice += Math.max(0, matQuantity * matSell - matDiscount);
      });
    });

    // Handle duration: use customDuration if provided, otherwise fallback to calculated totalDuration
    let finalDuration = totalDuration;
    if (customDuration !== undefined && customDuration !== null) {
      const parsedCustomDuration = Number(customDuration);
      if (!isNaN(parsedCustomDuration)) {
        finalDuration = parsedCustomDuration;
      }
    }

    // Default duration to 30 mins if no duration was specified/calculated
    if (finalDuration === 0) finalDuration = 30;

    // Fetch all categories in ONE query outside the transaction
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
    const newShopService = await db.$transaction(async (tx) => {
      // Because we pre-calculated everything, we can create the final record immediately.
      // No need to update it at the end of the transaction!
      const serviceRecord = await tx.shopService.create({
        data: {
          shopId,
          title,
          shortDescription,
          description,
          price: totalPrice,
          duration: finalDuration,
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
          items.map(async (item) => {
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
                  data: item.labor.tags.map((tag) => ({
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

                  // Use createMany instead of a loop for tags
                  if (material.tags?.length) {
                    await tx.materialTag.createMany({
                      data: material.tags.map((tag) => ({
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
                data: item.tags.map((tag) => ({
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
    const formattedError = errorHandler(error);
    console.log({ formattedError });
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
