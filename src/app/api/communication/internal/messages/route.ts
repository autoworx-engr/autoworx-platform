import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { Message } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/internal/messages:
 *   get:
 *     summary: Get internal messages
 *     tags: [Communication Internal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: integer
 *         description: Recipient user ID
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: integer
 *         description: Sender user ID
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *       - in: query
 *         name: groupId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Group ID
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *         description: Sort field (default: createdAt)
 *       - in: query
 *         name: sortOrder
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (default: desc)
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number (default: 1)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of messages per page (default: 20)
 *     responses:
 *       200:
 *         description: Messages fetched successfully
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
 *                     $ref: '#/components/schemas/Message'
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - missing or invalid parameters
 *       404:
 *         description: Company, user, or group not found
 *       500:
 *         description: Internal server error
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // 2. Extract specific values using .get()
    const to = searchParams.get("to");
    const from = searchParams.get("from");
    const companyId = searchParams.get("companyId");
    const groupId = searchParams.get("groupId");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");

    // 3. Handle numbers (params are always strings by default)
    // If 'page' is null, default to 1.
    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");

    // Placeholder for actual message retrieval logic

    const toId = to ? parseInt(to) : null;
    const fromId = from ? parseInt(from) : null;
    const groupIdNum = groupId ? parseInt(groupId) : null;
    const companyIdNum = companyId ? parseInt(companyId) : null;

    if (!companyIdNum) {
      throw new AppError(400, "Company ID is required");
    }

    const findExistingCompany = await db.company.findUnique({
      where: { id: companyIdNum },
    });

    if (!findExistingCompany) {
      throw new AppError(404, "Company not found");
    }

    if (!toId && !fromId && !groupIdNum) {
      throw new AppError(
        400,
        "'to' and 'from' or 'groupId' fields are required",
      );
    }

    if (toId && fromId && groupIdNum) {
      throw new AppError(
        400,
        "Provide either 'to' and 'from' or 'groupId', not both",
      );
    }

    let messages: Message[] = [];
    if (toId && fromId) {
      if (toId === fromId) {
        throw new AppError(400, "Cannot send message to oneself");
      }

      const findToFromUser = await db.user.findFirst({
        where: {
          OR: [{ id: toId }, { id: fromId }],
          companyId: findExistingCompany?.id,
        },
      });

      if (!findToFromUser) {
        throw new AppError(404, "User not found");
      }

      console.log("Fetching messages between:", fromId, "and", toId);
      messages = await db.message.findMany({
        where: {
          AND: [{ AND: [{ from: fromId }, { to: toId }] }, { groupId: null }],
          section: "internal",
        },
        include: {
          attachment: true,
          requestEstimate: true,
        },
        orderBy: {
          [sortBy ?? "createdAt"]: sortOrder ?? "desc",
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      });
    } else if (groupIdNum) {
      const findGroup = await db.group.findUnique({
        where: { id: groupIdNum },
      });

      if (!findGroup) {
        throw new AppError(404, "Group not found");
      }
      messages = await db.message.findMany({
        where: {
          groupId: groupIdNum,
        },
        include: {
          attachment: true,
          requestEstimate: true,
          group: true,
        },
        orderBy: {
          [sortBy ?? "createdAt"]: sortOrder ?? "desc",
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: messages,
        message: "Messages fetched successfully",
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
