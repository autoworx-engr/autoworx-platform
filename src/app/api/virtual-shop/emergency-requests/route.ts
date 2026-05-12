import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  normalizePhoneForStorage,
  phoneLookupWhereClause,
} from "@/utils/normalizePhone";
import z from "zod";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { sendUrgentServiceRequestNotification } from "@/lib/notification/urgent-service-notify";
import { sendEmergencyClientNotification } from "@/lib/notification/emergency-client-notify";
import { getToken } from "next-auth/jwt";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { EmergencyRequestStatus, Prisma } from "@prisma/client";
import { protocol, rootDomain } from "@/lib/subdomains";

/**
 * @swagger
 * /api/virtual-shop/emergency-requests:
 *   get:
 *     summary: List emergency booking requests
 *     description: Fetch a paginated list of emergency booking requests for a company or specific shop.
 *     tags: [Virtual Shop - Emergency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: integer
 *         description: Filter by shop ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, UNDER_REVIEW, APPROVED, ALTERNATIVE_PROPOSED, CLIENT_CONFIRMED, REJECTED, EXPIRED, CANCELLED]
 *         description: Filter by request status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved emergency requests.
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
 *                     $ref: '#/components/schemas/EmergencyBookingRequest'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: NextRequest) {
  try {
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
        const sessionToken = await getToken({
          req,
          secret: process.env.NEXTAUTH_SECRET,
        });
        companyId = sessionToken?.companyId as number | undefined;
      }
    } else {
      const sessionToken = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      companyId = sessionToken?.companyId as number | undefined;
    }

    if (!companyId) throw new AppError(401, "Unauthorized");

    const { searchParams } = new URL(req.url);
    const shopIdParam = searchParams.get("shopId");
    const statusParam = searchParams.get(
      "status",
    ) as EmergencyRequestStatus | null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)),
    );
    const skip = (page - 1) * limit;

    const where: Prisma.EmergencyBookingRequestWhereInput = {
      shop: { companyId },
      ...(shopIdParam ? { shopId: parseInt(shopIdParam, 10) } : {}),
      ...(statusParam ? { status: statusParam } : {}),
    };

    const [total, requests] = await Promise.all([
      db.emergencyBookingRequest.count({ where }),
      db.emergencyBookingRequest.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobile: true,
            },
          },
          vehicle: {
            select: { id: true, make: true, model: true, year: true },
          },
          shop: { select: { id: true, storeName: true } },
          reviewer: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
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

const schema = z.object({
  shopId: z.number().int().positive(),
  contactName: z.string().min(1).max(255),
  contactEmail: z.string().email().max(255),
  contactPhone: z.string().min(1).max(50),
  description: z.string().min(1),
  requestedDate: z.string().optional(),
  requestedTime: z.string().optional(),
  flexibleTiming: z.boolean().default(true),
  vehicleId: z.number().int().positive().optional(),
  vehicleDetails: z
    .object({
      make: z.string().min(1).max(100),
      model: z.string().min(1).max(100),
      year: z
        .number()
        .int()
        .min(1900)
        .max(new Date().getFullYear() + 2),
    })
    .optional(),
  requestedServices: z
    .array(
      z.object({
        shopServiceId: z.number().int().positive().optional(),
        vehicleType: z
          .enum(["Coupe", "Sedan", "SUV", "Truck"])
          .optional()
          .nullable(),
      }),
    )
    .default([]),
});

const DEFAULT_PRIORITY = 8;
const DEFAULT_EXPIRY_HOURS = 2;
const DEFAULT_REVIEW_TIME = "Within 30 minutes";

/**
 * @swagger
 * /api/virtual-shop/emergency-requests:
 *   post:
 *     summary: Submit an emergency service booking request
 *     description: >
 *       Creates an emergency booking request for a virtual shop. Looks up an
 *       existing client by phone number; if not found, creates a new client
 *       (and optionally a vehicle). Returns a request ID and estimated review
 *       time based on urgency level.
 *     tags: [Virtual Shop - Emergency]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shopId
 *               - contactName
 *               - contactEmail
 *               - contactPhone
 *               - urgencyLevel
 *               - reasonCategory
 *               - description
 *             properties:
 *               shopId:
 *                 type: integer
 *                 example: 3
 *                 description: ID of the virtual shop
 *               contactName:
 *                 type: string
 *                 example: John Smith
 *                 description: Full name of the requester
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               contactPhone:
 *                 type: string
 *                 example: "(678) 478-7306"
 *                 description: Phone used to look up or create the client record
 *               urgencyLevel:
 *                 type: string
 *                 enum: [CRITICAL, URGENT, HIGH, NORMAL]
 *                 example: URGENT
 *                 description: >
 *                   CRITICAL = within 15 min review; URGENT = 30 min;
 *                   HIGH = 2 hr; NORMAL = 24 hr
 *               reasonCategory:
 *                 type: string
 *                 enum:
 *                   - ACCIDENT_DAMAGE
 *                   - BREAKDOWN
 *                   - SAFETY_CONCERN
 *                   - PRE_TRAVEL_CHECK
 *                   - WEATHER_DAMAGE
 *                   - TOWING_RELATED
 *                   - SCHEDULED_CONFLICT
 *                   - OTHER
 *                 example: BREAKDOWN
 *               description:
 *                 type: string
 *                 example: Car won't start, need same-day service
 *               requestedDate:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: "2026-05-06"
 *                 description: Customer's preferred service date (YYYY-MM-DD)
 *               requestedTime:
 *                 type: string
 *                 nullable: true
 *                 example: "10:30"
 *                 description: Customer's preferred time (HH:mm)
 *               flexibleTiming:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *                 description: Whether the customer can accept an alternative time
 *               vehicleId:
 *                 type: integer
 *                 nullable: true
 *                 example: 12
 *                 description: Existing vehicle ID (takes priority over vehicleDetails)
 *               vehicleDetails:
 *                 type: object
 *                 nullable: true
 *                 description: >
 *                   Provide when vehicleId is unknown. Server will find or create
 *                   the vehicle record.
 *                 properties:
 *                   make:
 *                     type: string
 *                     example: Toyota
 *                   model:
 *                     type: string
 *                     example: Camry
 *                   year:
 *                     type: integer
 *                     example: 2021
 *               requestedServices:
 *                 type: array
 *                 default: []
 *                 description: List of shop service IDs the customer needs
 *                 items:
 *                   type: object
 *                   properties:
 *                     shopServiceId:
 *                       type: integer
 *                       example: 7
 *                     vehicleType:
 *                       type: string
 *                       nullable: true
 *                       enum: [Coupe, Sedan, SUV, Truck]
 *                       example: SUV
 *     responses:
 *       200:
 *         description: Emergency request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 requestId:
 *                   type: integer
 *                   example: 42
 *                 estimatedReviewTime:
 *                   type: string
 *                   example: "Within 30 minutes"
 *                 message:
 *                   type: string
 *                   example: "Emergency request submitted. Our team will contact you shortly."
 *                 trackingUrl:
 *                   type: string
 *                   example: "/emergency-status/42"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 success: false
 *                 message: Invalid request data
 *                 errorDetails: {}
 *       404:
 *         description: Shop not found or inactive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 error: Shop not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 success: false
 *                 message: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const shop = await db.shop.findUnique({
      where: { id: data.shopId },
      select: {
        id: true,
        companyId: true,
        isActive: true,
        slug: true,
        storeName: true,
      },
    });

    if (!shop || !shop.isActive) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const normalizedPhone = normalizePhoneForStorage(data.contactPhone);
    const phoneLookup = phoneLookupWhereClause(data.contactPhone) ?? [];
    const fallbackLookup = [
      { mobile: data.contactPhone },
      { mobile: normalizedPhone },
    ].filter((e) => Boolean(e.mobile));

    let client = await db.client.findFirst({
      where: {
        companyId: shop.companyId,
        OR: phoneLookup.length > 0 ? phoneLookup : fallbackLookup,
      },
      select: { id: true },
    });

    let leadId = null;

    if (!client) {
      const nameParts = data.contactName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || undefined;

      client = await db.client.create({
        data: {
          firstName,
          lastName,
          email: data.contactEmail,
          mobile: normalizedPhone,
          companyId: shop.companyId,
          isSalesAgent: true,
          fromRequest: true,
        },
        select: { id: true },
      });

      const column = await db.column.findFirst({
        where: { title: "New Leads", companyId: shop.companyId, type: "sales" },
      });

      if (column) {
        const lead = await db.lead.create({
          data: {
            clientName: `${firstName ?? ""} ${lastName ?? ""}`,
            clientEmail: data.contactEmail,
            clientPhone: normalizedPhone,
            vehicleInfo: data.vehicleDetails
              ? `${data.vehicleDetails.year} ${data.vehicleDetails.make} ${data.vehicleDetails.model}`
              : "N/A",
            services: JSON.stringify(data.requestedServices),
            companyId: shop.companyId,
            columnId: column?.id,
            source: "virtual-shop",
          },
        });
        leadId = lead.id;
      }
    }

    let vehicleId = data.vehicleId;
    let vehicleMake: string | undefined;
    let vehicleModel: string | undefined;
    let vehicleYear: number | undefined;

    if (data.vehicleDetails) {
      vehicleMake = data.vehicleDetails.make;
      vehicleModel = data.vehicleDetails.model;
      vehicleYear = data.vehicleDetails.year;

      const existingVehicle = await db.vehicle.findFirst({
        where: {
          clientId: client.id,
          make: vehicleMake,
          model: vehicleModel,
          year: vehicleYear,
          companyId: shop.companyId,
        },
        select: { id: true },
      });

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else {
        const newVehicle = await db.vehicle.create({
          data: {
            make: vehicleMake,
            model: vehicleModel,
            year: vehicleYear,
            clientId: client.id,
            companyId: shop.companyId,
            submodel: "",
            type: "",
            transmission: "",
            engineSize: "",
            license: "",
            vin: "",
            notes: "",
          },
          select: { id: true },
        });
        vehicleId = newVehicle.id;
      }
      if (leadId) {
        await db.lead.update({
          where: {
            id: leadId,
          },
          data: {
            vehicleId: vehicleId,
          },
        });
      }
    }

    const expiresAt = new Date(
      Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    const emergencyRequest = await db.emergencyBookingRequest.create({
      data: {
        shopId: shop.id,
        clientId: client.id,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: normalizedPhone,
        description: data.description,
        requestedDate: data.requestedDate ?? null,
        requestedTime: data.requestedTime ?? null,
        flexibleTiming: data.flexibleTiming,
        vehicleId: vehicleId ?? null,
        vehicleMake: vehicleMake ?? null,
        vehicleModel: vehicleModel ?? null,
        vehicleYear: vehicleYear ?? null,
        requestedServices: data.requestedServices,
        priority: DEFAULT_PRIORITY,
        expiresAt,
      },
      select: { id: true },
    });

    const trackingUrl = `${protocol}://${shop.slug}.${rootDomain}/emergency-status/${emergencyRequest.id}`;

    sendUrgentServiceRequestNotification({
      companyId: shop.companyId,
      shopId: shop.id,
      requestId: emergencyRequest.id,
      clientName: data.contactName,
      description: data.description,
    });

    sendEmergencyClientNotification({
      companyId: shop.companyId,
      clientId: client.id,
      requestId: emergencyRequest.id,
      shopName: shop.storeName,
      trackingUrl,
      contactEmail: data.contactEmail,
      contactName: data.contactName,
    });

    return NextResponse.json({
      success: true,
      requestId: emergencyRequest.id,
      estimatedReviewTime: DEFAULT_REVIEW_TIME,
      message:
        "Emergency request submitted. Our team will contact you shortly.",
      trackingUrl,
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
