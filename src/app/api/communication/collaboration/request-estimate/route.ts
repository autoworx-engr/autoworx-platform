import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { InvoiceType, Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/collaboration/request-estimate:
 *   post:
 *     summary: Request an estimate from another company
 *     tags: [Collaboration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model
 *               - year
 *               - make
 *               - serviceRequest
 *               - dueDate
 *               - receiverId
 *               - receiverCompanyId
 *               - senderId
 *               - senderCompanyId
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     photo:
 *                       type: string
 *                 description: Optional photo URLs (already uploaded via /api/upload) to attach
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               make:
 *                 type: string
 *               serviceRequest:
 *                 type: string
 *               dueDate:
 *                 type: string
 *               notes:
 *                 type: string
 *               messageText:
 *                 type: string
 *               receiverId:
 *                 type: integer
 *               receiverCompanyId:
 *                 type: integer
 *               senderId:
 *                 type: integer
 *               senderCompanyId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Estimate requested successfully
 *       400:
 *         description: Bad request – missing or invalid fields
 *       404:
 *         description: Default column not found
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const principal = await getAuthPrincipal(request);
    if (!principal) {
      throw new AppError(401, "Unauthorized");
    }
    const { companyId: callerCompanyId, userId: callerUserId } = principal;

    const body = await request.json();

    const {
      model,
      make,
      serviceRequest,
      dueDate,
      notes = "",
      messageText,
      year: yearRaw,
      receiverId: receiverIdRaw,
      receiverCompanyId: receiverCompanyIdRaw,
      senderId: senderIdRaw,
      senderCompanyId: senderCompanyIdRaw,
      photos = [],
    } = body;

    if (
      !model ||
      !make ||
      !serviceRequest ||
      !dueDate ||
      !yearRaw ||
      !receiverIdRaw ||
      !receiverCompanyIdRaw ||
      !senderIdRaw ||
      !senderCompanyIdRaw
    ) {
      throw new AppError(
        400,
        "Missing required fields: model, make, serviceRequest, dueDate, year, receiverId, receiverCompanyId, senderId, senderCompanyId",
      );
    }

    const year = parseInt(yearRaw as string);
    const receiverId = parseInt(receiverIdRaw as string);
    const receiverCompanyId = parseInt(receiverCompanyIdRaw as string);
    const senderId = parseInt(senderIdRaw as string);
    const senderCompanyId = parseInt(senderCompanyIdRaw as string);

    if (
      isNaN(year) ||
      isNaN(receiverId) ||
      isNaN(receiverCompanyId) ||
      isNaN(senderId) ||
      isNaN(senderCompanyId)
    ) {
      throw new AppError(
        400,
        "year, receiverId, receiverCompanyId, senderId and senderCompanyId must be valid integers",
      );
    }

    if (senderCompanyId !== callerCompanyId || senderId !== callerUserId) {
      throw new AppError(
        403,
        "You can only request estimates from your own company.",
      );
    }

    const { requestEstimateFromDB } = await db.$transaction(async (prisma) => {
      const receiverCompanyDataFromDB = await prisma.company.findUnique({
        where: { id: receiverCompanyId },
        select: { name: true },
      });

      if (!receiverCompanyDataFromDB) {
        throw new AppError(404, "Receiver company not found");
      }

      const senderCompanyDataFromDB = await prisma.company.findUnique({
        where: { id: senderCompanyId },
        select: { name: true, email: true, phone: true },
      });

      if (!senderCompanyDataFromDB) {
        throw new AppError(404, "Sender company not found");
      }

      let client = await prisma.client.findFirst({
        where: { fromRequestedCompanyId: senderCompanyId },
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            companyId: receiverCompanyId,
            firstName: senderCompanyDataFromDB.name,
            lastName: "",
            fromRequest: true,
            fromRequestedCompanyId: senderCompanyId,
            email: senderCompanyDataFromDB.email,
            mobile: senderCompanyDataFromDB.phone,
            isSalesAgent: true,
          },
        });
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          model,
          make,
          year,
          companyId: receiverCompanyId,
          clientId: client.id,
          fromRequest: true,
          fromRequestedCompanyId: senderCompanyId,
        },
      });

      const defaultColumn = await prisma.column.findFirst({
        where: {
          title: "Pending",
          type: "shop",
          companyId: receiverCompanyId,
        },
        select: { id: true },
      });

      if (!defaultColumn) {
        throw new AppError(404, "Default 'Pending' column not found");
      }

      const estimate = await prisma.invoice.create({
        data: {
          id: customAlphabet("1234567890", 10)(),
          vehicleId: vehicle.id,
          userId: receiverId,
          companyId: receiverCompanyId,
          internalNotes: notes,
          type: InvoiceType.Estimate,
          fromRequest: true,
          fromRequestedCompanyId: senderCompanyId,
          clientId: client.id,
          columnId: defaultColumn.id,
        },
      });

      const service = await prisma.service.create({
        data: {
          name: serviceRequest,
          companyId: receiverCompanyId,
          fromRequest: true,
          fromRequestedCompanyId: senderCompanyId,
        },
      });

      await prisma.invoiceItem.create({
        data: {
          invoiceId: estimate.id,
          serviceId: service.id,
        },
      });

      const requestEstimateFromDB = await prisma.requestEstimate.create({
        data: {
          invoiceId: estimate.id,
          senderId,
          senderCompanyId,
          receiverId,
          receiverCompanyId,
          serviceId: service.id,
          vehicleId: vehicle.id,
        },
      });

      await prisma.invoice.update({
        where: { id: estimate.id },
        data: { requestEstimateId: requestEstimateFromDB.id },
      });

      if (photos.length > 0) {
        await prisma.invoicePhoto.createMany({
          data: (photos as any[]).map((p) => ({
            invoiceId: estimate.id,
            photo: p.photo ?? "",
          })),
        });
      }

      return { requestEstimateFromDB };
    });

    return NextResponse.json(
      {
        success: true,
        data: { requestEstimate: requestEstimateFromDB },
        message: "Estimate requested successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return NextResponse.json(
        { success: false, error: "Something went wrong with the database" },
        { status: 500 },
      );
    }
    const errors = errorHandler(error);
    return NextResponse.json(
      { success: false, error: errors?.message || "Internal Server Error" },
      { status: errors?.statusCode || 500 },
    );
  }
}
