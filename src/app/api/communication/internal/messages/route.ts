import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { Message } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/internal/messages:
 *   get:
 *     summary: Retrieve internal messages
 *     tags: [Internal]
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
 *         name: groupId
 *         schema:
 *           type: integer
 *         description: ID of the group
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
    let totalRecords = 0;
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
      totalRecords = await db.message.count({
        where: {
          AND: [{ AND: [{ from: fromId }, { to: toId }] }, { groupId: null }],
          section: "internal",
        },
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
      totalRecords = await db.message.count({
        where: {
          groupId: groupIdNum,
        },
      });
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
