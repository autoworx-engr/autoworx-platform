import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import moment from "moment-timezone";
import { createInvoice } from "@/actions/estimate/invoice/create";
import { addCustomer } from "@/actions/client/add";
import { customAlphabet } from "nanoid";
import { addVehicle } from "@/actions/vehicle/addVehicle";
import { addAppointment } from "@/actions/appointment/addAppointment";
import { AppError } from "@/error-boundary/error";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { sendBookingConfirmation } from "@/actions/communication/client/sendBookingConfirmation";
import { Prisma } from "@prisma/client";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import {
  normalizePhoneForStorage,
  phoneLookupWhereClause,
} from "@/utils/normalizePhone";
import {
  buildInvoiceItemsWithDefaults,
  mapInvoiceItemsForCreate,
} from "@/services/shopServiceInvoiceItems";

import z from "zod";

const searchParamsValidation = z.object({
  search: z
    .string({
      invalid_type_error: "Search must be a string",
    })
    .optional(),
  date: z
    .string({
      invalid_type_error: "Date must be a string",
    })
    .refine((value) => {
      if (!value) return true;
      const date = moment(value, "YYYY-MM-DD");
      if (!date.isValid()) {
        throw new Error("Invalid date format");
      }
      return date.toDate();
    }, "Invalid date format")
    .optional(),
  year: z
    .string({ invalid_type_error: "Year must be a string" })
    .refine((value) => {
      if (!value) return true;
      const year = parseInt(value);
      if (isNaN(year)) {
        throw new Error("Invalid year format");
      }
      return year;
    }, "Invalid year format")
    .optional(),
  month: z
    .enum(
      [
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
      ],
      {
        invalid_type_error: "Month must be a valid month name",
      },
    )
    .optional(),
  status: z
    .enum(["pending", "confirmed", "completed", "cancelled"], {
      invalid_type_error:
        "Status must be pending, confirmed, completed, or cancelled",
    })
    .optional(),
  sortOrder: z
    .enum(["asc", "desc"], {
      invalid_type_error: "Sort order must be asc or desc",
    })
    .optional(),
  page: z.number({ invalid_type_error: "Page must be a number" }).optional(),
  limit: z.number({ invalid_type_error: "Limit must be a number" }).optional(),
  startDate: z
    .string({
      invalid_type_error: "Start date must be a string",
    })
    .refine((value) => {
      if (!value) return true;
      const date = moment(value, "YYYY-MM-DD");
      if (!date.isValid()) {
        throw new Error("Invalid start date format");
      }
      return date.toDate();
    }, "Invalid start date format")
    .optional(),
  endDate: z
    .string({
      invalid_type_error: "End date must be a string",
    })
    .refine((value) => {
      if (!value) return true;
      const date = moment(value, "YYYY-MM-DD");
      if (!date.isValid()) {
        throw new Error("Invalid end date format");
      }
      return date.toDate();
    }, "Invalid end date format")
    .optional(),
  shopId: z
    .string({ invalid_type_error: "Shop ID must be a string" })
    .refine((value) => {
      if (!value) return true;
      const shopId = parseInt(value);
      if (isNaN(shopId)) {
        throw new Error("Invalid shop ID format");
      }
      return shopId;
    }, "Invalid shop ID format")
    .optional(),
});

const createServiceBookingSchema = z.object({
  sessionToken: z.string().optional(),
  shopId: z
    .union([z.string(), z.number()], {
      required_error: "Shop ID is required",
      invalid_type_error: "Shop ID must be a string or number",
    })
    .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val)),
  shopServices: z
    .array(
      z.object({
        shopServiceId: z.number({
          required_error: "Shop Service ID is required",
          invalid_type_error: "Shop Service ID must be a number",
        }),
        vehicleType: z
          .string({
            invalid_type_error: "Vehicle type must be a string",
          })
          .optional(),
      }),
      {
        required_error: "Shop services are required",
        invalid_type_error: "Shop services must be an array",
      },
    )
    .min(1, "At least one shop service must be selected"),
  appointmentDate: z.string({
    required_error: "Appointment date is required",
    invalid_type_error: "Appointment date must be a string",
  }),
  appointmentStartTime: z.string({
    required_error: "Appointment start time is required",
    invalid_type_error: "Appointment start time must be a string",
  }),
  fullName: z
    .string({
      required_error: "Full name is required",
      invalid_type_error: "Full name must be a string",
    })
    .min(1, "Full name is required"),
  email: z
    .string({
      invalid_type_error: "Email must be a string",
    })
    .email("Invalid email format")
    .optional()
    .or(z.literal("")),
  phone: z
    .string({
      required_error: "Phone number is required",
      invalid_type_error: "Phone number must be a string",
    })
    .min(1, "Phone number is required"),
  make: z
    .string({
      required_error: "Vehicle make is required",
      invalid_type_error: "Vehicle make must be a string",
    })
    .min(1, "Vehicle make is required"),
  model: z
    .string({
      required_error: "Vehicle model is required",
      invalid_type_error: "Vehicle model must be a string",
    })
    .min(1, "Vehicle model is required"),
  year: z
    .union([z.string(), z.number()], {
      required_error: "Vehicle year is required",
      invalid_type_error: "Vehicle year must be a string or number",
    })
    .transform((val) => val.toString()),
  notes: z
    .string({
      invalid_type_error: "Notes must be a string",
    })
    .optional(),
  giftCardCode: z
    .string({
      invalid_type_error: "Gift card code must be a string",
    })
    .optional(),
});

const roundMoney = (value: number) => Number(value.toFixed(2));

/**
 * @swagger
 * /api/virtual-shop/service-booking:
 *   get:
 *     summary: Retrieve a paginated list of service bookings (estimates/appointments)
 *     description: Fetch service bookings associated with the current user's company, including their corresponding client, vehicle, appointment, invoice, and booked services details. Supports searching by client name and pagination.
 *     tags:
 *       - Virtual Shop
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search keyword to filter bookings by client's first/last name, vehicle make/model/year, or booked service title (case-insensitive).
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings by appointment date (YYYY-MM-DD).
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: string
 *           example: "2026"
 *         description: The year to filter bookings by (required if filtering by month).
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: string
 *           enum: [january, february, march, april, may, june, july, august, september, october, november, december]
 *         description: Filter bookings by a specific month of the specified year.
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 *         description: Filter bookings by status.
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings from this start date (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings until this end date (YYYY-MM-DD).
 *       - in: query
 *         name: shopId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter bookings by a specific shop ID.
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
 *                     statusCounts:
 *                       type: object
 *                       properties:
 *                         pending:
 *                           type: integer
 *                           example: 5
 *                         confirmed:
 *                           type: integer
 *                           example: 10
 *                         completed:
 *                           type: integer
 *                           example: 7
 *                         cancelled:
 *                           type: integer
 *                           example: 3
 *                         total:
 *                           type: integer
 *                           example: 25
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
    const search = searchParams.get("search")?.trim() || undefined;
    const date = searchParams.get("date") ?? undefined;
    const month = searchParams.get("month") ?? undefined;
    const year = searchParams.get("year") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;
    const shopId = searchParams.get("shopId") ?? undefined;

    const sortOrder = (
      searchParams.get("sortOrder") === "asc" ? "asc" : "desc"
    ) as Prisma.SortOrder;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    await searchParamsValidation.parseAsync({
      search,
      date,
      year,
      month,
      sortOrder,
      page,
      limit,
      status,
      startDate,
      endDate,
      shopId,
    });

    const baseWhereClause: Prisma.ShopBookingWhereInput = {
      shop: {
        companyId,
        ...(shopId ? { id: parseInt(shopId, 10) } : {}),
      },
    };

    if (search) {
      const searchNum = parseInt(search, 10);
      baseWhereClause.OR = [
        {
          client: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          vehicle: {
            OR: [
              { make: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
              ...(!isNaN(searchNum) ? [{ year: searchNum }] : []),
            ],
          },
        },
        {
          services: {
            some: {
              title: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    if ((month && !year) || (year && !month)) {
      throw new AppError(400, "Month and year are required together");
    }

    if ((startDate && !endDate) || (!startDate && endDate)) {
      throw new AppError(
        400,
        "Start date and end date are required together for a range",
      );
    }

    if (date || (month && year) || (startDate && endDate)) {
      let gte: Date | undefined;
      let lte: Date | undefined;

      if (date) {
        const targetDate = moment(date, "YYYY-MM-DD");
        if (targetDate.isValid()) {
          gte = targetDate.clone().startOf("day").toDate();
          lte = targetDate.clone().endOf("day").toDate();
        }
      } else if (month && year) {
        const targetDate = moment()
          .year(parseInt(year, 10))
          .month(parseInt(month, 10));
        if (targetDate.isValid()) {
          gte = targetDate.clone().startOf("month").toDate();
          lte = targetDate.clone().endOf("month").toDate();
        }
      } else if (startDate && endDate) {
        const start = moment(startDate, "YYYY-MM-DD");
        const end = moment(endDate, "YYYY-MM-DD");
        if (start.isValid() && end.isValid()) {
          gte = start.clone().startOf("day").toDate();
          lte = end.clone().endOf("day").toDate();
        }
      }

      if (gte && lte) {
        baseWhereClause.appointment = {
          date: {
            gte,
            lte,
          },
        };
      }
    }

    const whereClause: Prisma.ShopBookingWhereInput = {
      ...baseWhereClause,
      ...(status ? { status: status.toUpperCase() as any } : {}),
    };

    const statusCountsRaw = await db.shopBooking.groupBy({
      by: ["status"],
      where: baseWhereClause,
      _count: {
        id: true,
      },
    });

    const statusCounts = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      total: 0,
    };

    statusCountsRaw.forEach((item) => {
      const key = item.status?.toLowerCase() as keyof typeof statusCounts;
      if (key && statusCounts[key] !== undefined) {
        statusCounts[key] = item._count.id;
        statusCounts.total += item._count.id;
      }
    });

    const [totalRecords, shopBookings] = await Promise.all([
      db.shopBooking.count({ where: whereClause }),
      db.shopBooking.findMany({
        where: whereClause,
        include: {
          shop: {
            select: {
              bookingSettings: true,
            },
          },
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
              subtotal: true,
              tax: true,
              serviceFee: true,
              grandTotal: true,
              vehicleExtraCost: true,
              deposit: true,
              due: true,
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
          statusCounts,
        },
        data: shopBookings.map((sb) => {
          const subtotal = Number(sb.invoice?.subtotal || 0);
          const taxRate = Number(sb.invoice?.tax || 0);
          const vehicleExtraCost = Number(sb.invoice?.vehicleExtraCost || 0);
          const serviceFeeAmount = Number(sb.invoice?.serviceFee || 0);
          const grandTotal = Number(sb.invoice?.grandTotal || 0);

          const totalServiceCost = subtotal - vehicleExtraCost;
          const taxAmount = (totalServiceCost * taxRate) / 100;

          const { shop, ...rest } = sb;
          const isDepositEnabled = Boolean(
            shop?.bookingSettings?.isDepositEnabled,
          );
          const depositType = shop?.bookingSettings?.depositType;
          const depositValue = Number(shop?.bookingSettings?.depositValue || 0);
          const depositRequired = !isDepositEnabled
            ? 0
            : depositType === "PERCENTAGE"
              ? Number(((grandTotal * depositValue) / 100).toFixed(2))
              : depositValue;

          return {
            ...rest,
            subtotal: subtotal,
            tax: taxAmount,
            serviceFee: serviceFeeAmount,
            total: grandTotal,
            depositRequired,
            depositPaid: Number(sb.invoice?.deposit || 0),
            balanceDue: Number(sb.invoice?.due || 0),
            services: sb.services.map((srv) => ({
              ...srv,
              price: Number(srv.price),
              modifierPrice: Number(srv.modifierPrice),
            })),
          };
        }),
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
 * /api/virtual-shop/service-booking:
 *   post:
 *     summary: Creates a new service booking via the virtual shop
 *     description: Handles customer service booking request. Creates or finds a client and vehicle, checks availability and stacking limits, creates an estimate (invoice) with the requested services, books an appointment, and records the shop booking history.
 *     tags:
 *       - Virtual Shop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shopId
 *               - shopServices
 *               - appointmentDate
 *               - appointmentStartTime
 *               - phone
 *               - make
 *               - model
 *               - year
 *             properties:
 *               shopId:
 *                 type: integer
 *                 description: The unique ID for the virtual shop.
 *                 example: 1
 *               shopServices:
 *                 type: array
 *                 description: Array of selected shop services with optional vehicle type. The cost is calculated by the backend.
 *                 items:
 *                   type: object
 *                   properties:
 *                     shopServiceId:
 *                       type: integer
 *                     vehicleType:
 *                       type: string
 *                 example: [{ shopServiceId: 1, vehicleType: "SUV" }]
 *               appointmentDate:
 *                 type: string
 *                 format: date
 *                 description: Date of the appointment (YYYY-MM-DD).
 *                 example: "2026-03-25"
 *               appointmentStartTime:
 *                 type: string
 *                 description: Time of the appointment (HH:mm format).
 *                 example: "10:30"
 *               fullName:
 *                 type: string
 *                 description: Customer full name.
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Customer email address.
 *                 example: "john@example.com"
 *               phone:
 *                 type: string
 *                 description: Customer phone number.
 *                 example: "+1234567890"
 *               make:
 *                 type: string
 *                 description: Vehicle make.
 *                 example: "Toyota"
 *               model:
 *                 type: string
 *                 description: Vehicle model.
 *                 example: "Camry"
 *               year:
 *                 type: integer
 *                 description: Vehicle year.
 *                 example: 2021
 *               notes:
 *                 type: string
 *                 description: Optional notes provided by the customer.
 *                 example: "Please call upon arrival"
 *               depositAmount:
 *                 type: number
 *                 description: The amount the customer has paid as a deposit for this booking.
 *                 example: 50.00
 *     responses:
 *       200:
 *         description: Virtual shop service created successfully.
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
 *                   example: "Virtual shop service created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     appointmentId:
 *                       type: integer
 *                       example: 10
 *                     estimateId:
 *                       type: string
 *                       example: "1234567890"
 *                     shopBookingId:
 *                       type: integer
 *                       example: 5
 *                     status:
 *                       type: string
 *                       example: "PENDING"
 *                     appointment:
 *                       type: object
 *                       properties:
 *                         date:
 *                           type: string
 *                           example: "2026-03-25T00:00:00.000Z"
 *                         startTime:
 *                           type: string
 *                           example: "10:30"
 *                     client:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                           example: "John"
 *                         lastName:
 *                           type: string
 *                           example: "Doe"
 *                         email:
 *                           type: string
 *                           example: "john@example.com"
 *                         mobile:
 *                           type: string
 *                           example: "+1234567890"
 *                     vehicle:
 *                       type: object
 *                       properties:
 *                         year:
 *                           type: integer
 *                           example: 2021
 *                         make:
 *                           type: string
 *                           example: "Toyota"
 *                         model:
 *                           type: string
 *                           example: "Camry"
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                             example: "Oil Change"
 *                           price:
 *                             type: number
 *                             example: 49.99
 *                     totals:
 *                       type: object
 *                       properties:
 *                         subtotal:
 *                           type: number
 *                           example: 49.99
 *                         tax:
 *                           type: number
 *                           example: 4.00
 *                         serviceFee:
 *                           type: number
 *                           example: 1.00
 *                         grandTotal:
 *                           type: number
 *                           example: 54.99
 *       400:
 *         description: Bad Request. Missing required fields, invalid booking, or insufficient deposit.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Missing required fields"
 *       404:
 *         description: Not Found. Shop not found, etc.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Shop not found with the provided ID."
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal Server Error"
 */
export async function POST(req: Request) {
  let createdClientId: number | null = null;
  let createdVehicleId: number | null = null;
  let createdEstimateId: string | null = null;
  let createdAppointmentId: number | null = null;

  try {
    const body = await req.json();
    const parsedBody = await createServiceBookingSchema.parseAsync(body);

    const {
      shopId,
      shopServices,
      appointmentDate,
      appointmentStartTime,
      fullName,
      email,
      phone,
      make,
      model,
      year,
      notes,
      giftCardCode,
      sessionToken,
    } = parsedBody;

    const shopServiceIds = shopServices
      .map((s: any) => s.shopServiceId)
      .filter(Boolean);

    const firstName = fullName?.split(" ")[0] || "Guest";
    const lastName = fullName?.split(" ").slice(1).join(" ") || undefined;

    return await db.$transaction(
      async (tx) => {
        // 2. Validate Shop
        const shop = await tx.shop.findUnique({
          where: { id: Number(shopId) },
          include: {
            company: {
              select: {
                name: true,
                smsGateway: true,
                terms: true,
                policy: true,
                tax: true,
                serviceFee: true,
              },
            },
          },
        });

        if (!shop) {
          throw new AppError(404, "Shop not found with the provided ID.");
        }

        const findCompanyAdminUser = await tx.user.findFirst({
          where: {
            companyId: shop?.companyId,
            employeeType: "Admin",
          },
        });

        if (!findCompanyAdminUser) {
          throw new AppError(
            404,
            "Company admin not found for the provided shop.",
          );
        }

        const companyId = shop.companyId;

        // 3. Find or Create Client
        const normalizedPhone = normalizePhoneForStorage(phone);
        const phoneClauses = phoneLookupWhereClause(phone) ?? [];
        const clientLookupConditions: any[] = [...phoneClauses];

        // if (email) clientLookupConditions.push({ email });

        let client = await tx.client.findFirst({
          where: { companyId, OR: clientLookupConditions },
        });

        if (!client) {
          const clientResult = await addCustomer({
            firstName,
            lastName,
            mobile: normalizedPhone,
            email,
            forceCompanyId: companyId,
          });

          if (clientResult.type !== "success" || !clientResult.data) {
            throw new AppError(
              400,
              clientResult.type === "globalError" ||
                clientResult.type === "error"
                ? clientResult.message
                : "Failed to create customer via shared action",
            );
          }
          client = clientResult.data;
          createdClientId = client?.id ?? null;

          if (client) {
            const column = await tx.column.findFirst({
              where: {
                title: "New Leads",
                companyId: shop.companyId,
                type: "sales",
              },
            });

            const servicesForLead = await tx.shopService.findMany({
              where: { id: { in: shopServiceIds } },
              select: { title: true },
            });
            const serviceTitles = servicesForLead
              .map((s) => s.title)
              .join(", ");

            await tx.lead.create({
              data: {
                clientName: `${firstName ?? ""} ${lastName ?? ""}`.trim(),
                clientEmail: email,
                clientPhone: phone,
                companyId: shop.companyId,
                source: "Virtual Shop",
                vehicleInfo: `${year} ${make} ${model}`,
                services: serviceTitles,
                clientId: client.id,
                columnId: column?.id,
              },
            });
          }
        }

        // 4. Find or Create Vehicle
        let vehicle = await tx.vehicle.findFirst({
          where: {
            clientId: client?.id,
            year: parseInt(year.toString()),
            make,
            model,
            companyId,
          },
        });

        if (!vehicle) {
          const vehicleResponse = await addVehicle({
            year: parseInt(year.toString()),
            make,
            model,
            submodel: "",
            type: "",
            transmission: "",
            engineSize: "",
            license: "",
            vin: "",
            notes: "",
            other: "",
            clientId: client?.id!,
            forceCompanyId: companyId,
          });
          if (vehicleResponse.type === "success") {
            vehicle = vehicleResponse.data;
            createdVehicleId = vehicle?.id ?? null;
          }
        }

        // 5. Lock ShopBookingSetting to prevent concurrent slot race conditions
        await tx.$executeRawUnsafe(
          'SELECT 1 FROM "shop_booking_settings" WHERE "shop_id" = $1 FOR UPDATE',
          Number(shop.id),
        );

        const bookingSettings = await tx.shopBookingSetting.findUnique({
          where: { shopId: shop.id },
          include: { availabilities: true },
        });

        if (!bookingSettings) {
          throw new AppError(404, "Shop booking settings not found.");
        }

        const dayOfWeekKey = moment(appointmentDate)
          .format("dddd")
          .toUpperCase() as
          | "MONDAY"
          | "TUESDAY"
          | "WEDNESDAY"
          | "THURSDAY"
          | "FRIDAY"
          | "SATURDAY"
          | "SUNDAY";

        const availability = bookingSettings.availabilities.find(
          (a) => a.dayOfWeek === dayOfWeekKey,
        );

        if (!availability || !availability.isOpen) {
          throw new AppError(
            400,
            `Shop is not open on ${dayOfWeekKey.toLowerCase()}s.`,
          );
        }

        // Validate time bounds
        if (availability.startTime && availability.endTime) {
          const reqTime = moment(appointmentStartTime, "HH:mm");
          const shopStart = moment(availability.startTime, "HH:mm");
          const shopEnd = moment(availability.endTime, "HH:mm");

          if (reqTime.isBefore(shopStart) || reqTime.isAfter(shopEnd)) {
            throw new AppError(
              400,
              `Appointment time must be between ${availability.startTime} and ${availability.endTime}.`,
            );
          }
        }

        // 6. Retrieve Service Invoice Items to calculate duration
        const selectedServices = await tx.shopService.findMany({
          where: {
            id: { in: shopServiceIds },
            shopId: shop.id,
          },
          include: {
            invoiceItems: {
              include: {
                service: true,
                materials: {
                  include: {
                    tags: {
                      include: {
                        tag: true,
                      },
                    },
                  },
                },
                labor: {
                  include: {
                    tags: {
                      include: {
                        tag: true,
                      },
                    },
                  },
                },
                tags: {
                  include: {
                    tag: true,
                  },
                },
              },
            },
          },
        });

        if (selectedServices.length === 0) {
          throw new AppError(400, "No valid services selected for this shop.");
        }

        let totalDuration = selectedServices.reduce(
          (acc, cur) => acc + Number(cur.duration || 30),
          0,
        );

        // 7. Check Capacity (Stacking context + duration overlaps + active holds)
        const intervalMinutes = bookingSettings.slotInterval || 30;
        const proposedAppointmentEndMoment = moment
          .utc(`${appointmentDate} ${appointmentStartTime}`, "YYYY-MM-DD HH:mm")
          .add(totalDuration > 0 ? totalDuration : intervalMinutes, "minutes");

        const startOfSelectedDay = new Date(`${appointmentDate}T00:00:00.000Z`);
        const startOfNextDay = new Date(
          startOfSelectedDay.getTime() + 24 * 60 * 60 * 1000,
        );

        const existingAppointments = await tx.appointment.findMany({
          where: {
            companyId,
            AND: [
              { date: { lt: startOfNextDay } },
              {
                OR: [
                  { endDate: { gte: startOfSelectedDay } },
                  {
                    endDate: null,
                    date: { gte: startOfSelectedDay },
                  },
                ],
              },
            ],
          },
          select: { date: true, endDate: true, startTime: true, endTime: true },
        });

        const activeHolds = await tx.shopSlotHold.findMany({
          where: {
            shopId: shop.id,
            date: new Date(appointmentDate),
            expiresAt: { gt: new Date() },
          },
          select: { startTime: true, endTime: true, sessionToken: true },
        });

        const slotMoment = moment.utc(
          `${appointmentDate} ${appointmentStartTime}`,
          "YYYY-MM-DD HH:mm",
        );

        const appointmentsInSlot = existingAppointments.filter((app) => {
          if (!app.startTime || !app.endTime || !app.date) return false;
          const startDateStr = moment.utc(app.date).format("YYYY-MM-DD");
          const endAnchorDate = app.endDate ?? app.date;
          const endDateStr = moment.utc(endAnchorDate).format("YYYY-MM-DD");

          const appStartMoment = moment.utc(
            `${startDateStr} ${app.startTime}`,
            "YYYY-MM-DD HH:mm",
          );
          const appEndMoment = moment.utc(
            `${endDateStr} ${app.endTime}`,
            "YYYY-MM-DD HH:mm",
          );
          return (
            proposedAppointmentEndMoment.isAfter(appStartMoment) &&
            slotMoment.isBefore(appEndMoment)
          );
        });

        const holdsInSlot = activeHolds.filter((hold) => {
          if (hold.sessionToken === sessionToken) return false; // This user owns this hold
          if (!hold.startTime || !hold.endTime) return false;
          const holdStartMoment = moment.utc(
            `${appointmentDate} ${hold.startTime}`,
            "YYYY-MM-DD HH:mm",
          );
          const holdEndMoment = moment.utc(
            `${appointmentDate} ${hold.endTime}`,
            "YYYY-MM-DD HH:mm",
          );
          return (
            proposedAppointmentEndMoment.isAfter(holdStartMoment) &&
            slotMoment.isBefore(holdEndMoment)
          );
        });

        const totalConcurrent = appointmentsInSlot.length + holdsInSlot.length;

        if (
          bookingSettings.isStackingEnabled &&
          totalConcurrent >= bookingSettings.stackingLimit
        ) {
          throw new AppError(
            400,
            `No available slots for ${appointmentDate} at ${appointmentStartTime}. Limit reached or slot was just reserved.`,
          );
        } else if (!bookingSettings.isStackingEnabled && totalConcurrent > 0) {
          throw new AppError(
            400,
            `No available slots for ${appointmentDate} at ${appointmentStartTime}. Slot is already booked or reserved.`,
          );
        }

        // Guarantee every invoice item references a valid Service —
        // shop services without invoice items get a default Service
        const allInvoiceItems = await buildInvoiceItemsWithDefaults(
          selectedServices,
          companyId,
        );

        if (allInvoiceItems.length === 0) {
          throw new AppError(
            400,
            "Cannot create an invoice without at least one service item.",
          );
        }

        const items = mapInvoiceItemsForCreate(allInvoiceItems);

        const vehicleExtraCost = selectedServices.reduce((acc, srv) => {
          const userInput = shopServices.find(
            (s: any) => s.shopServiceId === srv.id,
          );
          if (userInput?.vehicleType) {
            const vt = userInput.vehicleType.toLowerCase();
            if (vt === "truck") return acc + Number(srv.modifierTruck || 0);
            if (vt === "suv") return acc + Number(srv.modifierSUV || 0);
            if (vt === "sedan") return acc + Number(srv.modifierSedan || 0);
            if (vt === "coupe") return acc + Number(srv.modifierCoupe || 0);
          }
          return acc;
        }, 0);

        let totalServiceCost = selectedServices.reduce(
          (acc, cur) => acc + Number(cur.price),
          0,
        );

        const subtotal = totalServiceCost + vehicleExtraCost;

        const estimateId = customAlphabet("1234567890", 10)();

        const taxRate = bookingSettings.isTaxEnabled
          ? Number(shop.company.tax)
          : 0;
        const serviceFeeRate = bookingSettings.isServiceFeeEnabled
          ? Number(shop.company.serviceFee)
          : 0;

        // Tax and fee computed on subtotal
        const taxAmount = (subtotal * taxRate) / 100;
        const serviceFeeAmount = (subtotal * serviceFeeRate) / 100;

        const adjustedGrandTotal = roundMoney(
          subtotal + taxAmount + serviceFeeAmount,
        );

        const isDepositEnabled = bookingSettings.isDepositEnabled;
        const depositType = bookingSettings.depositType;
        const depositValue = Number(bookingSettings.depositValue || 0);
        const calculatedDepositAmount = !isDepositEnabled
          ? 0
          : depositType === "PERCENTAGE"
            ? Number(((adjustedGrandTotal * depositValue) / 100).toFixed(2))
            : depositValue;
        const requiredDepositAmount = roundMoney(
          Math.min(adjustedGrandTotal, Math.max(0, calculatedDepositAmount)),
        );

        // Helper: create ShopBookingService snapshot entries
        const createServiceSnapshots = async (shopBookingId: number) => {
          for (const srv of selectedServices) {
            const userInput = shopServices.find(
              (s: any) => s.shopServiceId === srv.id,
            );
            let modifierPrice = 0;
            let modifierType: string | null = null;

            if (userInput?.vehicleType) {
              const vt = userInput.vehicleType.toLowerCase();
              if (vt === "truck") {
                modifierType = "Truck";
                modifierPrice = Number(srv.modifierTruck || 0);
              } else if (vt === "suv") {
                modifierType = "SUV";
                modifierPrice = Number(srv.modifierSUV || 0);
              } else if (vt === "sedan") {
                modifierType = "Sedan";
                modifierPrice = Number(srv.modifierSedan || 0);
              } else if (vt === "coupe") {
                modifierType = "Coupe";
                modifierPrice = Number(srv.modifierCoupe || 0);
              } else {
                modifierType = userInput.vehicleType;
              }
            }

            await tx.shopBookingService.create({
              data: {
                shopBookingId,
                shopServiceId: srv.id,
                title: srv.title,
                price: srv.price,
                duration: srv.duration,
                modifierType: modifierType as any,
                modifierPrice,
              },
            });
          }
        };

        // ── Gift card validation (no redemption yet) ──
        let giftCardBalance = 0;
        const normalizedGiftCardCode =
          giftCardCode?.trim().toUpperCase() || null;

        if (normalizedGiftCardCode && requiredDepositAmount > 0) {
          const gc = await tx.issuedGiftCard.findFirst({
            where: { code: normalizedGiftCardCode, companyId },
            select: { id: true, status: true, currentBalance: true },
          });

          if (!gc) throw new AppError(404, "Gift card not found for this shop");
          if (gc.status !== "ACTIVE") {
            throw new AppError(
              400,
              `Cannot redeem a ${gc.status.toLowerCase()} gift card.`,
            );
          }

          giftCardBalance = roundMoney(Number(gc.currentBalance || 0));
          if (giftCardBalance <= 0) {
            throw new AppError(400, "Gift card has no balance to redeem");
          }
        }

        const giftCovered = roundMoney(
          Math.min(giftCardBalance, requiredDepositAmount),
        );
        const payableNow = roundMoney(
          Math.max(0, requiredDepositAmount - giftCovered),
        );

        // ── DEPOSIT REQUIRED + NEEDS PAYMENT: create PENDING booking ──
        if (requiredDepositAmount > 0 && payableNow > 0) {
          const shopBooking = await tx.shopBooking.create({
            data: {
              shopId: shop.id,
              clientId: client?.id,
              vehicleId: vehicle?.id,
              appointmentDate,
              appointmentTime: appointmentStartTime,
              status: "PENDING",
              depositRequired: requiredDepositAmount,
              pendingGiftCardCode: normalizedGiftCardCode || undefined,
              customerNotes: notes || undefined,
            } as any,
          });
          await createServiceSnapshots(shopBooking.id);

          if (sessionToken) {
            await tx.shopSlotHold.deleteMany({
              where: { shopId: shop.id, sessionToken },
            });
          }

          return NextResponse.json(
            {
              success: true,
              message:
                "Booking created. Please complete the deposit to confirm.",
              data: {
                shopBookingId: shopBooking.id,
                status: shopBooking.status,
                client: {
                  firstName: client?.firstName,
                  lastName: client?.lastName,
                  email: client?.email,
                  mobile: client?.mobile,
                },
                vehicle: {
                  year: vehicle?.year,
                  make: vehicle?.make,
                  model: vehicle?.model,
                },
                services: selectedServices.map((srv) => ({
                  title: srv.title,
                  price: srv.price,
                })),
                totals: {
                  subtotal,
                  tax: taxAmount,
                  serviceFee: serviceFeeAmount,
                  grandTotal: adjustedGrandTotal,
                  giftCardRedeemed: 0,
                  depositRequired: requiredDepositAmount,
                  depositPaid: 0,
                  balanceDue: adjustedGrandTotal,
                  payableNow,
                  giftCardCovered: giftCovered,
                },
              },
            },
            { status: 200 },
          );
        }

        // ── Gift card covers deposit fully: redeem now ──
        let giftCardRedeemedAmount = 0;
        if (giftCovered > 0 && normalizedGiftCardCode) {
          const gc = await tx.issuedGiftCard.findFirst({
            where: { code: normalizedGiftCardCode, companyId },
            select: { id: true, currentBalance: true },
          });

          if (gc) {
            giftCardRedeemedAmount = giftCovered;
            const newBal = roundMoney(
              Number(gc.currentBalance || 0) - giftCovered,
            );

            await tx.issuedGiftCard.updateMany({
              where: {
                id: gc.id,
                companyId,
                currentBalance: { gte: new Prisma.Decimal(giftCovered) },
              },
              data: {
                currentBalance: new Prisma.Decimal(newBal),
                status: newBal <= 0 ? "DEPLETED" : "ACTIVE",
              },
            });

            await tx.giftCardTransaction.create({
              data: {
                giftCardId: gc.id,
                type: "REDEMPTION",
                amount: new Prisma.Decimal(-giftCovered),
                balanceAfter: new Prisma.Decimal(newBal),
                referenceId: `SHOP-BOOKING-GC-FULL`,
                notes: "Gift card fully covered deposit at booking",
              },
            });
          }
        }

        const finalGrandTotal = roundMoney(
          adjustedGrandTotal - giftCardRedeemedAmount,
        );

        // ── CONFIRMED: no deposit needed OR gift card covers deposit ──
        const estimateResult = await createInvoice({
          invoiceId: estimateId,
          type: "Estimate",
          clientId: client?.id,
          vehicleId: vehicle?.id,
          subtotal,
          discount: giftCardRedeemedAmount,
          tax: taxRate,
          serviceFee: serviceFeeRate,
          vehicleExtraCost,
          deposit: 0,
          depositNotes: "",
          depositMethod: "",
          grandTotal: finalGrandTotal,
          due: finalGrandTotal,
          internalNotes: "",
          terms: shop.company.terms || "",
          policy: shop.company.policy || "",
          customerNotes: notes || "",
          customerComments: "",
          photos: [],
          items,
          tasks: [],
          inspections: [],
          damageNotes: "",
          forceCompanyId: companyId,
          isShopBooking: true,
        });

        if (estimateResult.type !== "success" || !estimateResult.data) {
          throw new AppError(
            400,
            estimateResult.type === "globalError" ||
              estimateResult.type === "error"
              ? estimateResult.message
              : "Failed to create estimate via shared action",
          );
        }

        const estimate = estimateResult.data;
        createdEstimateId = estimate.id;

        if (client?.leadId) {
          await tx.lead.update({
            where: { id: client?.leadId },
            data: { isEstimateCreated: true },
          });
        }

        const slotInterval = bookingSettings.slotInterval;
        const endTime = moment(appointmentStartTime, "HH:mm")
          .add(totalDuration > 0 ? totalDuration : slotInterval, "minutes")
          .format("HH:mm");

        const appointmentResult = await addAppointment({
          title: `${year} ${make} ${model} - ${fullName}`,
          date: appointmentDate,
          startTime: appointmentStartTime,
          endTime,
          clientId: client?.id,
          vehicleId: vehicle?.id,
          notes: notes || undefined,
          draftEstimate: estimate.id,
          timezone: "UTC",
          assignedUsers: [findCompanyAdminUser.id],
          forceCompanyId: companyId,
          forceUserId: findCompanyAdminUser?.id,
        });

        if (appointmentResult.type !== "success" || !appointmentResult.data) {
          throw new AppError(
            400,
            appointmentResult.type === "globalError" ||
              appointmentResult.type === "error"
              ? appointmentResult.message
              : "Failed to create appointment via shared action",
          );
        }

        const appointment = appointmentResult.data;
        createdAppointmentId = appointment.id;

        const shopBooking = await tx.shopBooking.create({
          data: {
            shopId: shop.id,
            clientId: client?.id,
            vehicleId: vehicle?.id,
            appointmentId: appointment.id,
            invoiceId: estimate.id,
            appointmentDate,
            appointmentTime: appointmentStartTime,
            status: "CONFIRMED",
            customerNotes: notes || undefined,
          },
        });

        await createServiceSnapshots(shopBooking.id);

        await sendBookingConfirmation({
          client: {
            id: client!.id,
            firstName: client!.firstName,
            email: client?.email,
            mobile: client?.mobile,
          },
          shop: {
            companyId: shop.companyId,
            company: shop.company,
          },
          appointment: {
            date: appointmentDate,
            startTime: appointmentStartTime,
          },
          vehicle: vehicle
            ? {
                year: vehicle.year,
                make: vehicle.make,
                model: vehicle.model,
              }
            : null,
          services: selectedServices.map((s: any) => ({ title: s.title })),
          isDeposit: false,
        });

        if (sessionToken) {
          await tx.shopSlotHold.deleteMany({
            where: { shopId: shop.id, sessionToken },
          });
        }

        return NextResponse.json(
          {
            success: true,
            message: "Virtual shop service created successfully",
            data: {
              appointmentId: appointment.id,
              estimateId: estimate.id,
              shopBookingId: shopBooking.id,
              status: shopBooking.status,
              appointment: {
                date: appointment.date,
                startTime: appointment.startTime,
              },
              client: {
                firstName: client?.firstName,
                lastName: client?.lastName,
                email: client?.email,
                mobile: client?.mobile,
              },
              vehicle: {
                year: vehicle?.year,
                make: vehicle?.make,
                model: vehicle?.model,
              },
              services: selectedServices.map((srv) => ({
                title: srv.title,
                price: srv.price,
              })),
              totals: {
                subtotal: Number(estimate.subtotal),
                tax: taxAmount,
                serviceFee: serviceFeeAmount,
                grandTotal: Number(estimate.grandTotal),
                giftCardRedeemed: giftCardRedeemedAmount,
                depositRequired: 0,
                depositPaid: 0,
                balanceDue: Number(estimate.due),
              },
            },
          },
          { status: 200 },
        );
      },
      {
        timeout: 30000,
        maxWait: 30000,
      },
    );
  } catch (error: any) {
    console.log("error in service-booking", error);

    // Fallback/Compensation for resources created via global db actions during the failed transaction
    if (createdAppointmentId) {
      await db.appointment
        .delete({ where: { id: createdAppointmentId } })
        .catch((e) =>
          console.error("Fallback deletion failed for Appointment:", e),
        );
    }
    if (createdEstimateId) {
      await db.invoice
        .delete({ where: { id: createdEstimateId } })
        .catch((e) =>
          console.error("Fallback deletion failed for Estimate:", e),
        );
    }
    if (createdVehicleId) {
      await db.vehicle
        .delete({ where: { id: createdVehicleId } })
        .catch((e) =>
          console.error("Fallback deletion failed for Vehicle:", e),
        );
    }
    if (createdClientId) {
      // The shared addCustomer action also creates a Lead, let's delete the client (which cascades or we can rely on lead being created in tx normally, but if addCustomer does it, it's global)
      await db.client
        .delete({ where: { id: createdClientId } })
        .catch((e) => console.error("Fallback deletion failed for Client:", e));
    }

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
