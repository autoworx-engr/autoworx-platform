import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getFilteredConnectedCompanies } from "@/lib/collaboration/getFilteredConnectedCompanies";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/collaboration/company/userlist:
 *   get:
 *     summary: Retrieve collaborating companies (paginated)
 *     tags:
 *       - Collaboration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *     responses:
 *       200: { description: Success }
 *       401: { description: Unauthorized }
 *       500: { description: Internal Server Error }
 */
export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageNum = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limitNum = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20"), 1),
      50,
    );
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const authHeader = request.headers.get("authorization") ?? "";

    const accessToken = authHeader.startsWith("Bearer")
      ? authHeader.split(" ")[1]
      : authHeader;

    const verifyToken = await jwtVerifyToken(accessToken);
    const userCompanyId = verifyToken?.payload?.companyId as number | undefined;

    if (!userCompanyId) {
      throw new AppError(
        401,
        "Company ID is required to fetch collaboration companies.",
      );
    }

    // `getFilteredConnectedCompanies` filters by permission post-fetch, so
    // pagination has to happen in memory after that filter is applied.
    const all = await getFilteredConnectedCompanies(userCompanyId);

    const filtered = search
      ? all.filter((c) => c.name.toLowerCase().includes(search))
      : all;

    const total = filtered.length;
    const skip = (pageNum - 1) * limitNum;
    const paged = filtered.slice(skip, skip + limitNum);

    return NextResponse.json(
      {
        success: true,
        data: paged,
        message: "Collaboration companies fetched successfully",
        meta: {
          totalRecords: total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          hasNextPage: skip + paged.length < total,
          hasPrevPage: pageNum > 1,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const errors = errorHandler(error);
    return NextResponse.json(
      { success: false, error: errors?.message || "Internal Server Error" },
      { status: errors?.statusCode || 500 },
    );
  }
};
