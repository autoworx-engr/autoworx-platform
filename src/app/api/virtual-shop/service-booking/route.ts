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
    .refine(value => {
      if (!value) return true;
      const date = moment(value, "YYYY-MM-DD");
      if (!date.isValid()) {
        throw new Error("Invalid date format");
      }
      return date.toDate();
    })
    .optional(),
  year: z
    .string({ invalid_type_error: "Year must be a string" })
    .refine(value => {
      if (!value) return true;
      const year = parseInt(value);
      if (isNaN(year)) {
        throw new Error("Invalid year format");
      }
      return year;
    })
    .optional(),
  month: z
    .enum([
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
    ])
    .optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number({ invalid_type_error: "Page must be a number" }).optional(),
  limit: z.number({ invalid_type_error: "Limit must be a number" }).optional(),
});

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
    const search = searchParams.get("search") ?? undefined;
    const date = searchParams.get("date") ?? undefined;
    const month = searchParams.get("month") ?? undefined;
    const year = searchParams.get("year") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

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
    });

    const whereClause: Prisma.ShopBookingWhereInput = {
      shop: {
        companyId,
      },
    };

    if (status) {
      whereClause.status = status.toUpperCase() as any;
    }

    if (search) {
      const searchNum = parseInt(search, 10);
      whereClause.OR = [
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

    if (date || (month && year)) {
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
      }

      if (gte && lte) {
        whereClause.appointment = {
          date: {
            gte,
            lte,
          },
        };
      }
    }

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
        },
        data: shopBookings.map(sb => {
          const subtotal = Number(sb.invoice?.subtotal || 0);
          const taxRate = Number(sb.invoice?.tax || 0);
          const vehicleExtraCost = Number(sb.invoice?.vehicleExtraCost || 0);
          const serviceFeeAmount = Number(sb.invoice?.serviceFee || 0);

          const totalServiceCost = subtotal - vehicleExtraCost;
          const taxAmount = (totalServiceCost * taxRate) / 100;

          const { shop, ...rest } = sb;

          return {
            ...rest,
            subtotal: subtotal,
            tax: taxAmount,
            serviceFee: serviceFeeAmount,
            total: Number(sb.invoice?.grandTotal || 0),
            depositRequired: Number(shop?.bookingSettings?.depositValue || 0),
            depositPaid: Number(sb.invoice?.deposit || 0),
            balanceDue: Number(sb.invoice?.due || 0),
            services: sb.services.map(srv => ({
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
    } = body;

    // 1. Validate required input
    if (
      !shopId ||
      !shopServices ||
      !Array.isArray(shopServices) ||
      shopServices.length === 0 ||
      !appointmentDate ||
      !appointmentStartTime ||
      !phone ||
      !make ||
      !model ||
      !year
    ) {
      throw new AppError(400, "Missing required fields");
    }

    const shopServiceIds = shopServices
      .map((s: any) => s.shopServiceId)
      .filter(Boolean);

    const firstName = fullName?.split(" ")[0] || "Guest";
    const lastName = fullName?.split(" ").slice(1).join(" ") || undefined;

    return await db.$transaction(async tx => {
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
      let client = await tx.client.findFirst({
        where: {
          mobile: phone,
          companyId,
        },
      });

      if (!client) {
        const clientResult = await addCustomer({
          firstName,
          lastName,
          mobile: phone,
          email,
          forceCompanyId: companyId,
        });

        if (clientResult.type !== "success" || !clientResult.data) {
          throw new AppError(
            400,
            clientResult.type === "globalError" || clientResult.type === "error"
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
          await tx.lead.create({
            data: {
              clientName: `${firstName} ${lastName}`,
              clientEmail: email,
              clientPhone: phone,
              companyId: shop.companyId,
              source: "Virtual Shop",
              vehicleInfo: `${year} ${make} ${model}`,
              services: shopServiceIds.map(id => id).join(", "),
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
          year: parseInt(year),
          make,
          model,
          companyId,
        },
      });

      if (!vehicle) {
        const vehicleResponse = await addVehicle({
          year: parseInt(year),
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

      // 5. Find ShopBookingSetting & check Availability
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
        a => a.dayOfWeek === dayOfWeekKey,
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

      // 6. Check Capacity (Stacking context)
      // Check existing appointments for this exact slot
      const existingAppointmentsCount = await tx.appointment.count({
        where: {
          companyId,
          date: new Date(appointmentDate),
          startTime: appointmentStartTime,
        },
      });

      if (
        bookingSettings.isStackingEnabled &&
        existingAppointmentsCount >= bookingSettings.stackingLimit
      ) {
        throw new AppError(
          400,
          `No available slots for ${appointmentDate} at ${appointmentStartTime}. Limit reached.`,
        );
      } else if (
        !bookingSettings.isStackingEnabled &&
        existingAppointmentsCount > 0
      ) {
        throw new AppError(
          400,
          `No available slots for ${appointmentDate} at ${appointmentStartTime}. Slot is already booked.`,
        );
      }

      // 7. Retrieve Service Invoice Items & Calculate Totals
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

      const allInvoiceItems = selectedServices.flatMap(srv => {
        return srv.invoiceItems;
      });

      const items = allInvoiceItems.map(({ id, ...item }) => ({
        ...item,
        materials: item.materials.map(material => ({
          ...material,
          quantity: (Number(material.quantity) || 0) as any,
          cost: (Number(material.cost) || 0) as any,
          sell: (Number(material.sell) || 0) as any,
          discount: (Number(material.discount) || 0) as any,
          tags: material.tags.map((mt: any) => mt.tag),
        })),
        labor: item.labor
          ? {
              ...item.labor,
              hours: (Number(item.labor.hours) || 0) as any,
              charge: (Number(item.labor.charge) || 0) as any,
              discount: (Number(item.labor.discount) || 0) as any,
              tags: item.labor.tags.map((lt: any) => lt.tag),
            }
          : null,
        tags: item.tags.map((it: any) => it.tag),
      }));

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

      // tax and service fee is calculated on totalServiceCost
      const taxAmount = (totalServiceCost * taxRate) / 100;
      const serviceFeeAmount = (totalServiceCost * serviceFeeRate) / 100;

      const grandTotal = subtotal + taxAmount + serviceFeeAmount;
      const isDepositEnabled = bookingSettings.isDepositEnabled;
      const requiredDepositAmount = isDepositEnabled
        ? Number(bookingSettings.depositValue)
        : 0;

      const shopBookingStatus = !isDepositEnabled ? "CONFIRMED" : "PENDING";

      // 8. Create Estimate using the refactored shared action
      const estimateResult = await createInvoice({
        invoiceId: estimateId,
        type: "Estimate",
        clientId: client?.id,
        vehicleId: vehicle?.id,
        subtotal,
        discount: 0,
        tax: taxRate,
        serviceFee: serviceFeeAmount,
        vehicleExtraCost,
        deposit: 0,
        depositNotes: "",
        depositMethod: "",
        grandTotal,
        due: grandTotal,
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

      // Mark lead as estimate created if exists
      if (client?.leadId) {
        await tx.lead.update({
          where: { id: client?.leadId },
          data: { isEstimateCreated: true },
        });
      }

      // 9. Create Appointment
      const slotInterval = bookingSettings.slotInterval;
      const endTime = moment(appointmentStartTime, "HH:mm")
        .add(slotInterval, "minutes")
        .format("HH:mm");

      const appointmentResult = await addAppointment({
        title: `${year} ${make} ${model} - ${fullName}`,
        date: appointmentDate,
        startTime: appointmentStartTime,
        endTime,
        clientId: client?.id,
        vehicleId: vehicle?.id,
        notes: notes || null,
        draftEstimate: estimate.id,
        timezone: "UTC", // Defaulting, you might obtain from shop.company.timezone
        assignedUsers: [], // Empty for guest bookings, unless specific logic is added
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

      // 10. Create ShopBooking History
      const shopBooking = await tx.shopBooking.create({
        data: {
          shopId: shop.id,
          clientId: client?.id,
          appointmentId: appointment.id,
          invoiceId: estimate.id,
          status: shopBookingStatus,
          customerNotes: notes || null,
        },
      });

      // Create snapshot entries for the services in ShopBookingService
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
            modifierType = userInput.vehicleType; // fallback just in case
          }
        }

        await tx.shopBookingService.create({
          data: {
            shopBookingId: shopBooking.id,
            shopServiceId: srv.id,
            title: srv.title,
            price: srv.price,
            duration: srv.duration,
            modifierType: modifierType as any,
            modifierPrice,
          },
        });
      }

      // Send Confirmation via reusable helper
      if (shopBookingStatus === "CONFIRMED") {
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
      }

      // Return success response
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
            services: selectedServices.map(srv => ({
              title: srv.title,
              price: srv.price,
            })),
            totals: {
              subtotal: Number(estimate.subtotal),
              tax: taxAmount,
              serviceFee: serviceFeeAmount,
              grandTotal: Number(estimate.grandTotal),
              depositRequired: requiredDepositAmount,
              depositPaid: 0,
              balanceDue: Number(estimate.due),
            },
          },
        },
        { status: 200 },
      );
    });
  } catch (error: any) {
    console.log("error in service-booking", error);

    // Fallback/Compensation for resources created via global db actions during the failed transaction
    if (createdAppointmentId) {
      await db.appointment
        .delete({ where: { id: createdAppointmentId } })
        .catch(e =>
          console.error("Fallback deletion failed for Appointment:", e),
        );
    }
    if (createdEstimateId) {
      await db.invoice
        .delete({ where: { id: createdEstimateId } })
        .catch(e => console.error("Fallback deletion failed for Estimate:", e));
    }
    if (createdVehicleId) {
      await db.vehicle
        .delete({ where: { id: createdVehicleId } })
        .catch(e => console.error("Fallback deletion failed for Vehicle:", e));
    }
    if (createdClientId) {
      // The shared addCustomer action also creates a Lead, let's delete the client (which cascades or we can rely on lead being created in tx normally, but if addCustomer does it, it's global)
      await db.client
        .delete({ where: { id: createdClientId } })
        .catch(e => console.error("Fallback deletion failed for Client:", e));
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
