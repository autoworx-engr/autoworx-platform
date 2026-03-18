import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { Labor, Material, Service, Tag, Prisma } from "@prisma/client";
import { createShopServiceSchema } from "@/validations/schemas/virtual-shop/shop-service.validation";

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
 *           type: string
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
 *                       invoiceItems:
 *                         type: array
 *                         description: Nested invoice items containing detailed breakdown of the service, labor, and materials.
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
 *                               example: null
 *                             service:
 *                               type: object
 *                               nullable: true
 *                               example: { "id": 5, "name": "Basic Wash", "categoryId": 2 }
 *                             materials:
 *                               type: array
 *                               items:
 *                                 type: object
 *                               example: [{ "id": 50, "name": "Premium Wax", "cost": 10, "sell": 15 }]
 *       400:
 *         description: Missing requires parameter (shopId).
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    // Default to 'desc' if not provided, strongly type the allowed values
    const sortOrder = (
      searchParams.get("sortOrder") === "asc" ? "asc" : "desc"
    ) as Prisma.SortOrder;

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    if (!shopId) {
      return NextResponse.json(
        { success: false, message: "Missing shopId" },
        { status: 400 },
      );
    }

    const whereClause: Prisma.ShopServiceWhereInput = {
      shopId: parseInt(shopId, 10),
      isActive: true,
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
    console.error("Error fetching shop services:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch shop services",
      },
      { status: 500 },
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
 *             properties:
 *               shopId:
 *                 type: string
 *                 example: "1"
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
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               items:
 *                 type: array
 *                 description: Includes materials and labor to auto-calculate the service base price.
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
 *                     title:
 *                       type: string
 *                       example: "Full Detail Package"
 *                     price:
 *                       type: number
 *                       example: 299
 *                     duration:
 *                       type: integer
 *                       example: 300
 *       400:
 *         description: Missing required fields or validation failure.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Company ID not found.
 *       404:
 *         description: Shop not found or access denied.
 *       500:
 *         description: Internal server error.
 */
type TCreateShopServiceRequest = {
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TCreateShopServiceRequest;
    await createShopServiceSchema.parseAsync(body);

    const {
      shopId,
      title,
      companyId,
      description,
      imageUrl,
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

    if (!shopId || !title) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    // 1. Verify the shop belongs to the user's company
    const shop = await db.shop.findUnique({
      where: { id: shopId },
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
          shopId,
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
