import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/shop/get-work-orders:
 *   get:
 *     summary: Get shop pipeline work orders with pagination and sorting
 *     description: Returns work orders (invoices with isWorkOrder=true) for the shop pipeline. Supports pagination, sorting, column filtering, and search.
 *     tags: [Shop Pipeline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-based). Only applies when `take` is provided.
 *         example: 1
 *       - in: query
 *         name: take
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of records per page. Omit to return all records.
 *         example: 20
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt]
 *           default: createdAt
 *         description: Field to sort by
 *         example: createdAt
 *       - in: query
 *         name: sortOrder
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *         example: desc
 *       - in: query
 *         name: columnId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter by pipeline column ID
 *         example: 3
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by client first or last name (case-insensitive)
 *         example: John
 *     responses:
 *       200:
 *         description: Work orders retrieved successfully
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
 *                   example: Work orders retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 meta:
 *                   type: object
 *                   description: Present only when `take` is provided
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     take:
 *                       type: integer
 *                       example: 20
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const { searchParams } = req.nextUrl;

    const pageParam = searchParams.get("page");
    const takeParam = searchParams.get("take");
    const sortBy = (searchParams.get("sortBy") ?? "createdAt") as
      | "createdAt"
      | "updatedAt";
    const sortOrder = (searchParams.get("sortOrder") ?? "desc") as
      | "asc"
      | "desc";
    const columnIdParam = searchParams.get("columnId");
    const search = searchParams.get("search") ?? undefined;

    const page = pageParam ? Math.max(1, parseInt(pageParam)) : 1;
    const take = takeParam ? parseInt(takeParam) : undefined;
    const columnId = columnIdParam ? parseInt(columnIdParam) : undefined;

    const validSortBy = ["createdAt", "updatedAt"].includes(sortBy)
      ? sortBy
      : "createdAt";
    const validSortOrder = ["asc", "desc"].includes(sortOrder)
      ? sortOrder
      : "desc";

    const companyId = principal.companyId;

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      type: "Invoice",
      isWorkOrder: true,
    };

    if (columnId !== undefined && !isNaN(columnId)) {
      where.columnId = columnId;
    }

    if (search) {
      where.client = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const findManyArgs: Prisma.InvoiceFindManyArgs = {
      where,
      include: {
        client: true,
        vehicle: true,
        invoiceItems: {
          include: {
            service: {
              include: {
                Technician: true,
              },
            },
          },
        },
        tags: {
          select: {
            id: true,
            tag: true,
          },
        },
        tasks: true,
        assignedTo: true,
        column: true,
      },
      orderBy: { [validSortBy]: validSortOrder },
    };

    if (take !== undefined && !isNaN(take)) {
      findManyArgs.take = take;
      findManyArgs.skip = (page - 1) * take;
    }

    const [data, total] = await Promise.all([
      db.invoice.findMany(findManyArgs),
      take !== undefined && !isNaN(take)
        ? db.invoice.count({ where })
        : Promise.resolve(0),
    ]);

    const response: Record<string, unknown> = {
      success: true,
      message: "Work orders retrieved successfully",
      data,
    };

    if (take !== undefined && !isNaN(take)) {
      response.meta = {
        total,
        page,
        take,
        totalPages: Math.ceil(total / take),
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to retrieve work orders",
      },
      { status: 500 },
    );
  }
}
