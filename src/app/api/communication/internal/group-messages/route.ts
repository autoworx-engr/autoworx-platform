import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
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
    const searchParams = request.nextUrl.searchParams;

    const groupId = searchParams.get("groupId");
    const companyId = searchParams.get("companyId");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");

    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");

    const groupIdNum = groupId ? parseInt(groupId) : null;
    const companyIdNum = companyId ? parseInt(companyId) : null;

    // Validation
    if (!companyIdNum) {
      throw new AppError(400, "Company ID is required");
    }

    if (!groupIdNum) {
      throw new AppError(400, "Group ID is required");
    }

    // Verify company exists
    const findExistingCompany = await db.company.findUnique({
      where: { id: companyIdNum },
    });

    if (!findExistingCompany) {
      throw new AppError(404, "Company not found");
    }

    // Verify group exists and belongs to the company
    const findGroup = await db.group.findUnique({
      where: { id: groupIdNum },
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

    return NextResponse.json(
      {
        success: true,
        data: messages,
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
