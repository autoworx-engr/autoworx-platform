import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { Prisma } from "@prisma/client";
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
    const principal = await getAuthPrincipal(request);
    if (!principal) throw new AppError(401, "Unauthorized");

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const pageNum = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limitNum = Math.max(1, parseInt(searchParams.get("limit") || "20"));

    const userIdNum = principal.userId;
    const where: Prisma.UserWhereInput = {
      NOT: { id: userIdNum },
      companyId: principal.companyId,
    };

    if (search) {
      const searchWords = search.trim().split(/\s+/);
      const conditions: Prisma.UserWhereInput[] = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];

      if (searchWords.length > 1) {
        for (let i = 1; i < searchWords.length; i++) {
          const firstPart = searchWords.slice(0, i).join(" ");
          const lastPart = searchWords.slice(i).join(" ");
          conditions.push({
            AND: [
              { firstName: { contains: firstPart, mode: "insensitive" } },
              { lastName: { contains: lastPart, mode: "insensitive" } },
            ],
          });
        }
      }

      where.OR = conditions;
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

    // Batch fetch only this viewer's chatTracks with these users
    const userIds = allUsers.map((u) => u.id);
    const chatTracks = await db.chatTrack.findMany({
      where: {
        section: "internal",
        OR: [
          { senderId: userIdNum, receiverId: { in: userIds } },
          { receiverId: userIdNum, senderId: { in: userIds } },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    // Map latest chatTrack per other-party user (first hit wins, list is desc)
    const latestChatTrackMap = new Map<number, (typeof chatTracks)[0]>();
    for (const track of chatTracks) {
      const otherId =
        track.senderId === userIdNum ? track.receiverId : track.senderId;
      if (otherId && !latestChatTrackMap.has(otherId)) {
        latestChatTrackMap.set(otherId, track);
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
