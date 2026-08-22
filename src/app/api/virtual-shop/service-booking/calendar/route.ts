import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import moment from "moment-timezone";
import { AppError } from "@/error-boundary/error";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { Prisma } from "@prisma/client";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import z from "zod";

const searchParamsValidation = z.object({
  year: z
    .string({ invalid_type_error: "Year must be a string" })
    .refine((value) => {
      if (!value) return true;
      const year = parseInt(value);
      if (isNaN(year)) {
        throw new Error("Invalid year format");
      }
      return year;
    })
    .optional(),
  month: z.enum([
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ]),
});

/**
 * @swagger
 * /api/virtual-shop/service-booking/calendar:
 *   get:
 *     summary: Retrieve shop bookings for a specific month for calendar view
 *     description: Fetch a lightweight list of shop bookings for a given month and year. Includes client name, appointment date, and status.
 *     tags:
 *       - Virtual Shop
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026"
 *         description: The year to fetch bookings for.
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *           enum: [january, february, march, april, may, june, july, august, september, october, november, december]
 *         description: The month to fetch bookings for.
 *     responses:
 *       200:
 *         description: Successfully fetched calendar bookings.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       appointment:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           startTime:
 *                             type: string
 *                           endTime:
 *                             type: string
 *                       client:
 *                         type: object
 *                         properties:
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *       400:
 *         description: Validation error for month/year.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Company ID not found.
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer")
      ? authHeader.split(" ")[1]
      : authHeader;

    const verifyToken = await jwtVerifyToken(accessToken);

    if (!verifyToken?.payload) {
      throw new AppError(401, "Unauthorized");
    }

    const companyId = verifyToken?.payload?.companyId as number;

    if (!companyId) {
      throw new AppError(403, "Company ID not found in session");
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") ?? undefined;
    const month = searchParams.get("month") ?? undefined;

    if (!year || !month) {
      throw new AppError(400, "Year and month are required");
    }

    await searchParamsValidation.parseAsync({ year, month });

    const targetDate = moment().year(parseInt(year, 10)).month(month);

    if (!targetDate.isValid()) {
      throw new AppError(400, "Invalid year or month");
    }

    const gte = targetDate.clone().startOf("month").toDate();
    const lte = targetDate.clone().endOf("month").toDate();

    const whereClause: Prisma.ShopBookingWhereInput = {
      shop: {
        companyId,
      },
      appointment: {
        date: {
          gte,
          lte,
        },
      },
    };

    const bookings = await db.shopBooking.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        appointment: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        appointment: {
          date: "asc",
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: bookings,
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
