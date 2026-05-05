import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  normalizePhoneForStorage,
  phoneLookupWhereClause,
} from "@/utils/normalizePhone";
import z from "zod";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

const schema = z.object({
  shopId: z.number().int().positive(),
  contactName: z.string().min(1).max(255),
  contactEmail: z.string().email().max(255),
  contactPhone: z.string().min(1).max(50),
  urgencyLevel: z.enum(["CRITICAL", "URGENT", "HIGH", "NORMAL"]),
  reasonCategory: z.enum([
    "ACCIDENT_DAMAGE",
    "BREAKDOWN",
    "SAFETY_CONCERN",
    "PRE_TRAVEL_CHECK",
    "WEATHER_DAMAGE",
    "TOWING_RELATED",
    "SCHEDULED_CONFLICT",
    "OTHER",
  ]),
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
        shpServiceId: z.number().int().positive().optional(),
        vehicleType: z
          .enum(["Coupe", "Sedan", "SUV", "Truck"])
          .optional()
          .nullable(),
      }),
    )
    .default([]),
});

const PRIORITY_MAP: Record<string, number> = {
  CRITICAL: 10,
  URGENT: 8,
  HIGH: 6,
  NORMAL: 4,
};

const EXPIRY_HOURS_MAP: Record<string, number> = {
  CRITICAL: 0.5,
  URGENT: 2,
  HIGH: 6,
  NORMAL: 24,
};

const REVIEW_TIME_MAP: Record<string, string> = {
  CRITICAL: "Within 15 minutes",
  URGENT: "Within 30 minutes",
  HIGH: "Within 2 hours",
  NORMAL: "Within 24 hours",
};

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
 *                     shpServiceId:
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
      select: { id: true, companyId: true, isActive: true, slug: true },
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
    }

    const priority = PRIORITY_MAP[data.urgencyLevel] ?? 5;
    const expiryHours = EXPIRY_HOURS_MAP[data.urgencyLevel] ?? 24;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const emergencyRequest = await db.emergencyBookingRequest.create({
      data: {
        shopId: shop.id,
        clientId: client.id,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: normalizedPhone,
        urgencyLevel: data.urgencyLevel,
        reasonCategory: data.reasonCategory,
        description: data.description,
        requestedDate: data.requestedDate ?? null,
        requestedTime: data.requestedTime ?? null,
        flexibleTiming: data.flexibleTiming,
        vehicleId: vehicleId ?? null,
        vehicleMake: vehicleMake ?? null,
        vehicleModel: vehicleModel ?? null,
        vehicleYear: vehicleYear ?? null,
        requestedServices: data.requestedServices,
        priority,
        expiresAt,
      },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      requestId: emergencyRequest.id,
      estimatedReviewTime:
        REVIEW_TIME_MAP[data.urgencyLevel] ?? "Within 30 minutes",
      message:
        "Emergency request submitted. Our team will contact you shortly.",
      trackingUrl: `/emergency-status/${emergencyRequest.id}`,
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
