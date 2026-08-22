import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/internal/messages:
 *   get:
 *     summary: Retrieve direct/private messages. Can filter by specific conversation or all messages involving a user.
 *     tags: [Internal Messages]
 *     parameters:
 *       - in: query
 *         name: toId
 *         required: false
 *         schema:
 *           type: integer
 *         description: ID of the recipient user (required if 'fromId' is not provided)
 *       - in: query
 *         name: fromId
 *         required: false
 *         schema:
 *           type: integer
 *         description: ID of the sender user (required if 'toId' is not provided)
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the company
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
 *           default: 20
 *         description: Number of records per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Not found
 */

export async function GET(request: NextRequest) {
  try {
    const principal = await getAuthPrincipal(request);
    if (!principal) throw new AppError(401, "Unauthorized");

    const searchParams = request.nextUrl.searchParams;

    const toIdRaw = searchParams.get("toId");
    const fromIdRaw = searchParams.get("fromId");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");

    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");

    const toId = toIdRaw ? parseInt(toIdRaw) : null;
    const fromId = fromIdRaw ? parseInt(fromIdRaw) : null;

    if ((!toId || isNaN(toId)) && (!fromId || isNaN(fromId))) {
      throw new AppError(
        400,
        "At least one valid user ID ('fromId' or 'toId') is required",
      );
    }

    if (toId && fromId && toId === fromId) {
      throw new AppError(400, "Cannot send message to oneself");
    }

    // Caller must be one of the conversation parties.
    if (
      (toId && toId !== principal.userId && fromId !== principal.userId) ||
      (fromId && fromId !== principal.userId && toId !== principal.userId)
    ) {
      throw new AppError(403, "Forbidden");
    }

    // Verify the other party is in the same company.
    const otherId = toId === principal.userId ? fromId : toId;
    if (otherId) {
      const otherUser = await db.user.findFirst({
        where: { id: otherId, companyId: principal.companyId },
        select: { id: true },
      });
      if (!otherUser) {
        throw new AppError(404, "User not found in this company");
      }
    }

    const where: Prisma.MessageWhereInput = {
      groupId: null,
      section: "internal",
    };

    if (toId && fromId) {
      where.OR = [
        { from: fromId, to: toId },
        { from: toId, to: fromId },
      ];
    } else if (fromId) {
      where.OR = [{ from: fromId }, { to: fromId }];
    } else if (toId) {
      where.OR = [{ from: toId }, { to: toId }];
    }

    const sortField = sortBy === "updatedAt" ? "updatedAt" : "createdAt";

    const messages = await db.message.findMany({
      where,
      include: {
        attachment: true,
        requestEstimate: true,
      },
      orderBy: {
        [sortField]: sortOrder === "asc" ? "asc" : "desc",
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    const transformedMessages = messages.map((message) => ({
      ...message,
      userType: principal.userId === message.from ? "sender" : "recipient",
    }));

    const totalRecords = await db.message.count({ where });

    const hasNextPage = pageNum * limitNum < totalRecords;
    const hasPrevPage = pageNum > 1;
    const totalPages = Math.ceil(totalRecords / limitNum);

    return NextResponse.json(
      {
        success: true,
        data: transformedMessages,
        message: "Messages fetched successfully",
        meta: {
          totalRecords: totalRecords,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const errors = errorHandler(error);
    const message = errors?.message || "Internal Server Error";
    const status = errors?.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
