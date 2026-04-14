import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/internal/userList:
 *   get:
 *     summary: Retrieve a list of users for a specific company, sorted by latest message
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by first name, last name, or email
 *
 *     responses:
 *       200:
 *         description: Successfully retrieved user list sorted by latest message
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

    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }

    const companyId = searchParams.get("companyId");
    const search = searchParams.get("search") || "";
    const pageNum = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limitNum = Math.max(1, parseInt(searchParams.get("limit") || "20"));

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

    const userIdNum = parseInt(userId as string, 10);
    const where: any = {
      NOT: { id: userIdNum },
      companyId: companyIdNum,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch all users matching filter (optimize if dataset is very large)
    const allUsers = await db.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        image: true,
        employeeType: true,
      },
    });

    // Batch fetch all chatTracks for these users in a single query
    const userIds = allUsers.map((u) => u.id);
    const chatTracks = await db.chatTrack.findMany({
      where: {
        OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }],
        section: "internal",
      },
    });

    // Map latest chatTrack per user
    const userIdSet = new Set(userIds);
    const latestChatTrackMap = new Map<number, (typeof chatTracks)[0]>();

    for (const track of chatTracks) {
      if (track.senderId && userIdSet.has(track.senderId)) {
        const existing = latestChatTrackMap.get(track.senderId);
        if (!existing || track.updatedAt > existing.updatedAt) {
          latestChatTrackMap.set(track.senderId, track);
        }
      }
      if (track.receiverId && userIdSet.has(track.receiverId)) {
        const existing = latestChatTrackMap.get(track.receiverId);
        if (!existing || track.updatedAt > existing.updatedAt) {
          latestChatTrackMap.set(track.receiverId, track);
        }
      }
    }

    // Combine and sort by latest chatTrack date
    const usersWithChatTrack = allUsers
      .map((user) => ({
        ...user,
        chatTrack: latestChatTrackMap.get(user.id) ?? null,
      }))
      .sort((a, b) => {
        const aDate = a.chatTrack?.updatedAt ?? new Date(0);
        const bDate = b.chatTrack?.updatedAt ?? new Date(0);
        return bDate.getTime() - aDate.getTime(); // Latest first
      });

    // Apply pagination after sorting
    const totalRecords = usersWithChatTrack.length;
    const paginatedUsers = usersWithChatTrack.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum,
    );

    const hasNextPage = pageNum * limitNum < totalRecords;
    const hasPrevPage = pageNum > 1;
    const totalPages = Math.ceil(totalRecords / limitNum);

    return NextResponse.json(
      {
        success: true,
        data: paginatedUsers,
        message: "Messages fetched successfully",
        meta: {
          totalRecords,
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
