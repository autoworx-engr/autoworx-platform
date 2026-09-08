import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/internal/group-messages:
 *   get:
 *     summary: Retrieve group messages
 *     tags: [Internal Group Messages]
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: integer
 *         description: ID of the group (required)
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: ID of the company (required)
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
 *         description: Group messages retrieved successfully
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

    const groupId = searchParams.get("groupId");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");

    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");

    const groupIdNum = groupId ? parseInt(groupId) : null;

    if (!groupIdNum) {
      throw new AppError(400, "Group ID is required");
    }

    // Verify caller is a member. Legacy groups can have companyId = null;
    // membership filter enforces tenant isolation.
    const findGroup = await db.group.findFirst({
      where: {
        id: groupIdNum,
        OR: [{ companyId: principal.companyId }, { companyId: null }],
        users: { some: { id: principal.userId } },
      },
      select: { id: true },
    });

    if (!findGroup) {
      throw new AppError(404, "Group not found");
    }

    // Fetch group messages
    const messages = await db.message.findMany({
      where: {
        groupId: groupIdNum,
        section: "internal",
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

    const totalRecords = await db.message.count({
      where: {
        groupId: groupIdNum,
        section: "internal",
      },
    });

    const hasNextPage = pageNum * limitNum < totalRecords;
    const hasPrevPage = pageNum > 1;
    const totalPages = Math.ceil(totalRecords / limitNum);

    const senderIds = Array.from(
      new Set(messages.map((m) => m.from).filter((id): id is number => !!id)),
    );

    const senders = senderIds.length
      ? await db.user.findMany({
          where: { id: { in: senderIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            image: true,
            employeeType: true,
          },
        })
      : [];

    const senderMap = new Map(senders.map((u) => [u.id, u]));

    const transformMessage = messages.map((message) => {
      const { to, from, requestEstimate, requestEstimateId, ...rest } = message;
      return { ...rest, sender: from ? (senderMap.get(from) ?? null) : null };
    });

    return NextResponse.json(
      {
        success: true,
        data: transformMessage,
        message: "Group messages fetched successfully",
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
