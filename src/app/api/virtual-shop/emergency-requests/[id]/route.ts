import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getToken } from "next-auth/jwt";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { EmergencyRequestStatus } from "@prisma/client";
import z from "zod";

async function resolveCompanyId(req: NextRequest): Promise<number> {
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
      /* fall through to session */
    }
  }

  if (!companyId) {
    const sessionToken = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    companyId = sessionToken?.companyId as number | undefined;
  }

  if (!companyId) throw new AppError(401, "Unauthorized");
  return companyId;
}

async function resolveUserId(req: NextRequest): Promise<number | undefined> {
  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  if (accessToken) {
    try {
      const verifyToken = await jwtVerifyToken(accessToken);
      return verifyToken?.payload?.id as number | undefined;
    } catch {
      /* fall through */
    }
  }

  const sessionToken = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  return sessionToken?.id as number | undefined;
}

/**
 * @swagger
 * /api/virtual-shop/emergency-requests/{id}:
 *   get:
 *     summary: Get emergency request details
 *     description: Fetch full details for a specific emergency booking request.
 *     tags: [Virtual Shop - Emergency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the emergency request
 *     responses:
 *       200:
 *         description: Successfully retrieved request details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/EmergencyBookingRequest'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Request not found.
 *       500:
 *         description: Internal server error.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await resolveCompanyId(req);
    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (!Number.isFinite(requestId)) throw new AppError(400, "Invalid ID");

    const request = await db.emergencyBookingRequest.findFirst({
      where: { id: requestId, shop: { companyId } },
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
        vehicle: { select: { id: true, make: true, model: true, year: true } },
        shop: { select: { id: true, storeName: true, slug: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!request) throw new AppError(404, "Request not found");

    return NextResponse.json({ success: true, data: request });
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

const updateSchema = z.object({
  status: z.nativeEnum(EmergencyRequestStatus).optional(),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  proposedDate: z.string().optional().nullable(),
  proposedTime: z.string().optional().nullable(),
  alternativeNotes: z.string().optional().nullable(),
});

/**
 * @swagger
 * /api/virtual-shop/emergency-requests/{id}:
 *   patch:
 *     summary: Update emergency request status/notes
 *     description: Update the status, admin notes, or propose an alternative time for an emergency request.
 *     tags: [Virtual Shop - Emergency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the emergency request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, UNDER_REVIEW, APPROVED, ALTERNATIVE_PROPOSED, CLIENT_CONFIRMED, REJECTED, EXPIRED, CANCELLED]
 *               adminNotes:
 *                 type: string
 *               rejectionReason:
 *                 type: string
 *               proposedDate:
 *                 type: string
 *                 format: date
 *               proposedTime:
 *                 type: string
 *               alternativeNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully updated emergency request.
 *       400:
 *         description: Invalid request data.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Request not found.
 *       500:
 *         description: Internal server error.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await resolveCompanyId(req);
    const userId = await resolveUserId(req);
    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (!Number.isFinite(requestId)) throw new AppError(400, "Invalid ID");

    const body = await req.json();
    const data = updateSchema.parse(body);

    const existing = await db.emergencyBookingRequest.findFirst({
      where: { id: requestId, shop: { companyId } },
      select: { id: true },
    });

    if (!existing) throw new AppError(404, "Request not found");

    const updated = await db.emergencyBookingRequest.update({
      where: { id: requestId },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.adminNotes !== undefined && { adminNotes: data.adminNotes }),
        ...(data.rejectionReason !== undefined && {
          rejectionReason: data.rejectionReason,
        }),
        ...(data.proposedDate !== undefined && {
          proposedDate: data.proposedDate,
        }),
        ...(data.proposedTime !== undefined && {
          proposedTime: data.proposedTime,
        }),
        ...(data.alternativeNotes !== undefined && {
          alternativeNotes: data.alternativeNotes,
        }),
        ...(data.status &&
          data.status !== "PENDING" && {
            reviewedAt: new Date(),
            reviewedBy: userId,
          }),
      },
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
        vehicle: { select: { id: true, make: true, model: true, year: true } },
        shop: { select: { id: true, storeName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
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
