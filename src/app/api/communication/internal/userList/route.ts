import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/internal/userList:
 *   get:
 *     summary: Retrieve a list of users for a specific company
 *     tags: [Internal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the company
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [firstName, lastName, email, createdAt, updatedAt]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Order of sorting
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by first name, last name, or email
 *
 *     responses:
 *       200:
 *         description: Successfully retrieved user list
 *       400:
 *         description: Company ID is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Company not found
 */

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const authHeader = request.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer")
      ? authHeader.split(" ")[1]
      : authHeader;

    const verifyToken = await jwtVerifyToken(accessToken);

    const userId = verifyToken?.payload?.id ?? "";

    const companyId = searchParams.get("companyId");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");

    const companyIdNum = companyId ? parseInt(companyId) : null;

    if (!companyIdNum) {
      throw new AppError(400, "Company ID is required");
    }

    const findCompany = await db.company.findUnique({
      where: { id: companyIdNum },
    });

    if (!findCompany) {
      throw new AppError(404, "Company not found");
    }

    const where: any = {
      NOT: {
        id: userId ? parseInt(userId as string, 10) : undefined,
      },
      companyId: companyIdNum,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const usersData = await db.user.findMany({
      where,
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        image: true,
        employeeType: true,
        id: true,
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder === "desc" ? "desc" : "asc" },
    });

    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }

    const usersWithChatTrack = await Promise.all(
      usersData.map(async (user) => {
        const { id, ...restUser } = user;
        const userChatTrack = await db.chatTrack.findMany({
          where: {
            OR: [{ senderId: id as number }, { receiverId: id as number }],
            section: "internal",
          },
          orderBy: { createdAt: "desc" },
        });
        return {
          ...restUser,
          id,
          chatTrack: userChatTrack?.[0] ?? null,
        };
      }),
    );

    const totalRecords = await db.user.count({
      where,
    });

    const hasNextPage = pageNum * limitNum < totalRecords;
    const hasPrevPage = pageNum > 1;
    const totalPages = Math.ceil(totalRecords / limitNum);

    return NextResponse.json(
      {
        success: true,
        data: usersWithChatTrack,
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
};
