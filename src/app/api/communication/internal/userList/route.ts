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
    const search = (searchParams.get("search") || "").trim();
    const pageNum = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limitNum = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const excludeGroupIdRaw = searchParams.get("excludeGroupId");
    const excludeGroupId = excludeGroupIdRaw
      ? parseInt(excludeGroupIdRaw, 10)
      : null;

    const userIdNum = principal.userId;
    const skip = (pageNum - 1) * limitNum;

    const searchTerm = search.trim();
    const searchWords = searchTerm ? searchTerm.split(/\s+/) : [];
    const buildSearchWhere = (): Prisma.UserWhereInput => {
      if (!searchTerm) return {};
      const conditions: Prisma.UserWhereInput[] = [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ];
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
      return { OR: conditions };
    };

    const excludeMembersWhere: Prisma.UserWhereInput =
      excludeGroupId != null && !Number.isNaN(excludeGroupId)
        ? { groups: { none: { id: excludeGroupId } } }
        : {};

    const where: Prisma.UserWhereInput = {
      companyId: principal.companyId,
      NOT: { id: userIdNum },
      ...excludeMembersWhere,
      ...buildSearchWhere(),
    };

    const userSelect = {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      image: true,
      employeeType: true,
    } as const;

    const trackWhere = {
      section: "internal" as const,
      OR: [{ senderId: userIdNum }, { receiverId: userIdNum }],
    };

    const [chattedTotal, totalRecords] = await Promise.all([
      db.chatTrack.count({ where: trackWhere }),
      db.user.count({ where }),
    ]);

    type ChattedUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;
    type ChatTrackRow = Prisma.ChatTrackGetPayload<{}>;

    const pageUsers: ChattedUser[] = [];
    const chatTrackByCounterpart = new Map<number, ChatTrackRow>();

    // ---- Chatted half: DB-paginated chatTrack page ----
    if (skip < chattedTotal && limitNum > 0) {
      const chattedTake = Math.min(limitNum, chattedTotal - skip);
      const tracks = await db.chatTrack.findMany({
        where: trackWhere,
        orderBy: { updatedAt: "desc" },
        skip,
        take: chattedTake,
      });

      const orderedCounterpartIds = tracks
        .map((t) => (t.senderId === userIdNum ? t.receiverId : t.senderId))
        .filter((id): id is number => id != null && id !== userIdNum);

      for (const t of tracks) {
        const otherId = t.senderId === userIdNum ? t.receiverId : t.senderId;
        if (otherId != null) chatTrackByCounterpart.set(otherId, t);
      }

      if (orderedCounterpartIds.length > 0) {
        // Validate counterparts against the search/company `where` so search
        // filtering applies to chatted rows too.
        const chattedMatching = await db.user.findMany({
          where: { ...where, id: { in: orderedCounterpartIds } },
          select: userSelect,
        });
        const byId = new Map(chattedMatching.map((u) => [u.id, u]));
        for (const id of orderedCounterpartIds) {
          const u = byId.get(id);
          if (u) pageUsers.push(u);
        }
      }
    }

    // ---- Never-chatted half: DB-paginated user.findMany ----
    const remaining = limitNum - pageUsers.length;
    if (remaining > 0) {
      // Full chatted-id set is only needed here, for the NOT IN exclusion.
      // Pages that stay entirely inside chatted territory never run this.
      const allTracks = await db.chatTrack.findMany({
        where: trackWhere,
        select: { senderId: true, receiverId: true },
      });
      const chattedIdSet = new Set<number>();
      for (const t of allTracks) {
        const otherId = t.senderId === userIdNum ? t.receiverId : t.senderId;
        if (otherId != null && otherId !== userIdNum) chattedIdSet.add(otherId);
      }

      const neverChattedSkip = Math.max(0, skip - chattedTotal);
      const neverChattedUsers = await db.user.findMany({
        where: {
          ...where,
          ...(chattedIdSet.size > 0
            ? { NOT: [{ id: userIdNum }, { id: { in: [...chattedIdSet] } }] }
            : {}),
        },
        orderBy: { id: "asc" },
        skip: neverChattedSkip,
        take: remaining,
        select: userSelect,
      });
      pageUsers.push(...neverChattedUsers);
    }

    const paginatedUsers = pageUsers.map((u) => ({
      ...u,
      chatTrack: chatTrackByCounterpart.get(u.id) ?? null,
    }));

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
