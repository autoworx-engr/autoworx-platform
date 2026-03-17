import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { Prisma } from "@prisma/client";

/**
 * @swagger
 * /api/virtual-shop/shop-bookings:
 *   get:
 *     summary: Retrieve a paginated list of shop bookings (estimates/appointments)
 *     description: Fetch shop bookings associated with the current user's company, including their corresponding client, vehicle, appointment, invoice, and booked services details. Supports searching by client name and pagination.
 *     tags:
 *       - Virtual Shop Booking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search keyword to filter bookings by client's first or last name (case-insensitive).
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
 *         description: Successfully fetched shop bookings.
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
 *                       example: 25
 *                     totalPages:
 *                       type: integer
 *                       example: 3
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
 *                       subtotal:
 *                         type: number
 *                         example: 1023.00
 *                       tax:
 *                         type: number
 *                         example: 0.00
 *                       total:
 *                         type: number
 *                         example: 1023.00
 *                       depositRequired:
 *                         type: number
 *                         example: 256.00
 *                       depositPaid:
 *                         type: number
 *                         example: 0.00
 *                       balanceDue:
 *                         type: number
 *                         example: 1023.00
 *                       client:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           firstName:
 *                             type: string
 *                             example: "John"
 *                           lastName:
 *                             type: string
 *                             example: "Doe"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                           mobile:
 *                             type: string
 *                             example: "+1234567890"
 *                       vehicle:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           year:
 *                             type: integer
 *                             example: 2023
 *                           make:
 *                             type: string
 *                             example: "BMW"
 *                           model:
 *                             type: string
 *                             example: "M3"
 *                       appointment:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-02-24T00:00:00.000Z"
 *                           startTime:
 *                             type: string
 *                             example: "09:00"
 *                           endTime:
 *                             type: string
 *                             example: "18:00"
 *                       invoice:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "1234567890"
 *                           status:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "confirmed"
 *                       services:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             title:
 *                               type: string
 *                               example: "Full Detail Package"
 *                             price:
 *                               type: number
 *                               example: 349.00
 *                             modifierType:
 *                               type: string
 *                               nullable: true
 *                               example: "Sedan"
 *                             duration:
 *                               type: integer
 *                               example: 120
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Company ID not found.
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const sortOrder = (
      searchParams.get("sortOrder") === "asc" ? "asc" : "desc"
    ) as Prisma.SortOrder;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ShopBookingWhereInput = {
      shop: {
        companyId,
      },
    };

    if (search) {
      whereClause.client = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [totalRecords, shopBookings] = await Promise.all([
      db.shopBooking.count({ where: whereClause }),
      db.shopBooking.findMany({
        where: whereClause,
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              mobile: true,
            },
          },
          vehicle: {
            select: {
              year: true,
              make: true,
              model: true,
            },
          },
          appointment: {
            select: {
              date: true,
              startTime: true,
              endTime: true,
            },
          },
          invoice: {
            select: {
              id: true,
              status: {
                select: {
                  name: true,
                },
              },
            },
          },
          services: {
            select: {
              title: true,
              price: true,
              duration: true,
              modifierType: true,
              modifierPrice: true,
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
        data: shopBookings.map(sb => ({
          ...sb,
          subtotal: Number(sb.subtotal),
          tax: Number(sb.tax),
          total: Number(sb.total),
          depositRequired: Number(sb.depositRequired),
          depositPaid: Number(sb.depositPaid),
          balanceDue: Number(sb.balanceDue),
          services: sb.services.map(srv => ({
            ...srv,
            price: Number(srv.price),
            modifierPrice: Number(srv.modifierPrice),
          })),
        })),
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching shop bookings:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch shop bookings",
      },
      { status: 500 },
    );
  }
}
