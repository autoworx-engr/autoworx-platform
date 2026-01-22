import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const authHeader = request.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    const verifyToken = await jwtVerifyToken(accessToken);

    const userId = verifyToken?.payload?.userId ?? "";

    console.log("Verified User ID:", userId);

    const companyId = searchParams.get("companyId");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");

    // 3. Handle numbers (params are always strings by default)
    // If 'page' is null, default to 1.
    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");

    // Placeholder for actual message retrieval logic
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

    const usersData = await db.user.findMany({
      where: {
        NOT: {
          id: userId ? parseInt(userId as string, 10) : undefined,
        },
        companyId: companyIdNum,
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: sortBy
        ? { [sortBy]: sortOrder === "desc" ? "desc" : "asc" }
        : { createdAt: "asc" },
    });

    const userChatTrack = await db.chatTrack.findMany({
      where: {
        OR: [{ senderId: userId as number }, { receiverId: userId as number }],
      },
      include: {
        message: true,
      },
    });

    // Calculate simple unread indicator per user (0 or 1)
    const usersWithUnreadCounts = usersData.map(user => {
      const hasUnreadMessage = userChatTrack.some(
        chat =>
          chat.receiverId === parseInt(userId as string) &&
          chat.senderId === user.id &&
          !chat.isRead,
      );

      return {
        ...user,
        unreadCount: hasUnreadMessage ? 1 : 0,
      };
    });

    const totalRecords = await db.user.count({
      where: { companyId: companyIdNum },
    });

    const hasNextPage = pageNum * limitNum < totalRecords;
    const hasPrevPage = pageNum > 1;
    const totalPages = Math.ceil(totalRecords / limitNum);

    return NextResponse.json(
      {
        success: true,
        data: usersWithUnreadCounts,
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
