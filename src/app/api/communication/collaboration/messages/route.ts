import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { Message, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/collaboration/messages:
 *   get:
 *     summary: Retrieve collaboration messages
 *     tags: [Collaboration]
 *     parameters:
 *       - in: query
 *         name: to
 *         schema:
 *           type: integer
 *         description: ID of the recipient user
 *       - in: query
 *         name: from
 *         schema:
 *           type: integer
 *         description: ID of the sender user
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: ID of the company
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination (default is 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records per page (default is 20)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by (default is createdAt)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *         description: Sort order, either asc or desc (default is desc)
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
    if (!principal) {
      throw new AppError(401, "Unauthorized");
    }
    const callerUserId = principal.userId;

    const searchParams = request.nextUrl.searchParams;

    // 2. Extract specific values using .get()
    const to = searchParams.get("to");
    const from = searchParams.get("from");
    const companyId = searchParams.get("companyId");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");

    // 3. Handle numbers (params are always strings by default)
    // If 'page' is null, default to 1.
    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");

    // Placeholder for actual message retrieval logic

    const toId = to ? parseInt(to) : null;
    const fromId = from ? parseInt(from) : null;
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

    if (!toId && !fromId) {
      throw new AppError(400, "'to' and 'from' fields are required");
    }

    let messages: Message[] = [];
    let totalRecords = 0;
    if (toId && fromId) {
      if (toId === fromId) {
        throw new AppError(400, "Cannot send message to oneself");
      }

      // Caller must be a participant in this conversation
      if (callerUserId !== toId && callerUserId !== fromId) {
        throw new AppError(403, "You can only read your own conversations.");
      }

      const participants = await db.user.findMany({
        where: { id: { in: [toId, fromId] } },
        select: { id: true, companyId: true },
      });

      if (
        participants.length !== 2 ||
        !participants.some((u) => u.companyId === findExistingCompany.id)
      ) {
        throw new AppError(404, "User not found");
      }

      const conversationWhere: Prisma.MessageWhereInput = {
        section: "collaboration",
        OR: [
          { from: fromId, to: toId },
          { from: toId, to: fromId },
        ],
      };

      [messages, totalRecords] = await Promise.all([
        db.message.findMany({
          where: conversationWhere,
          include: { attachment: true, requestEstimate: true },
          orderBy: { [sortBy ?? "createdAt"]: sortOrder ?? "desc" },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        db.message.count({ where: conversationWhere }),
      ]);
    }

    const hasNextPage = pageNum * limitNum < totalRecords;
    const hasPrevPage = pageNum > 1;
    const totalPages = Math.ceil(totalRecords / limitNum);

    return NextResponse.json(
      {
        success: true,
        data: messages,
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
