import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
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
    const searchParams = request.nextUrl.searchParams;

    const toIdRaw = searchParams.get("toId");
    const fromIdRaw = searchParams.get("fromId");
    const companyId = searchParams.get("companyId");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");

    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");

    const toId = toIdRaw ? parseInt(toIdRaw) : null;
    const fromId = fromIdRaw ? parseInt(fromIdRaw) : null;
    const companyIdNum = companyId ? parseInt(companyId) : null;

    // Determine current user for perspective (sender/recipient)
    // Preference: 1. fromId, 2. toId
    const currentUserId = fromId || toId;

    // Validation
    if (!companyIdNum || isNaN(companyIdNum)) {
      throw new AppError(400, "Valid Company ID is required");
    }

    // At least one of 'fromId' or 'toId' must be provided
    if ((!toId || isNaN(toId)) && (!fromId || isNaN(fromId))) {
      throw new AppError(
        400,
        "At least one valid user ID ('fromId' or 'toId') is required",
      );
    }

    if (toId && fromId && toId === fromId) {
      throw new AppError(400, "Cannot send message to oneself");
    }

    // Verify company exists
    const findExistingCompany = await db.company.findUnique({
      where: { id: companyIdNum },
    });

    if (!findExistingCompany) {
      throw new AppError(404, "Company not found");
    }

    // Verify user(s) exist in the company
    const userIdsToCheck = [];
    if (toId) userIdsToCheck.push(toId);
    if (fromId) userIdsToCheck.push(fromId);

    const findUsers = await db.user.findMany({
      where: {
        id: { in: userIdsToCheck },
        companyId: companyIdNum,
      },
    });

    if (findUsers.length !== userIdsToCheck.length) {
      throw new AppError(404, "One or more users not found in this company");
    }

    // Build WHERE clause based on provided parameters
    const where: any = {
      groupId: null,
      section: "internal",
    };

    if (toId && fromId) {
      // Both provided: messages between two specific users (bidirectional)
      where.OR = [
        { from: fromId, to: toId },
        { from: toId, to: fromId },
      ];
    } else if (fromId) {
      // Only fromId provided: all messages involving this user
      where.OR = [{ from: fromId }, { to: fromId }];
    } else if (toId) {
      // Only toId provided: all messages involving this user
      where.OR = [{ from: toId }, { to: toId }];
    }

    // Fetch messages
    const messages = await db.message.findMany({
      where,
      include: {
        attachment: true,
        requestEstimate: true,
      },
      orderBy: {
        [sortBy ?? "createdAt"]: (sortOrder as any) ?? "desc",
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    // Transform messages to add userType (sender or recipient)
    const transformedMessages = messages.map((message: any) => ({
      ...message,
      userType: currentUserId === message.from ? "sender" : "recipient",
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
