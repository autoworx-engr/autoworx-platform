import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getFilteredConnectedCompanies } from "@/lib/collaboration/getFilteredConnectedCompanies";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/collaboration/company/userlist:
 *   get:
 *     summary: Retrieve collaborating companies and their users
 *     description: Fetches a paginated list of companies that have an active collaboration status with the authenticated user's company.
 *     tags:
 *       - Collaboration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of collaborating companies.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal Server Error.
 */

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");
    const authHeader = request.headers.get("authorization") ?? "";

    const accessToken = authHeader.startsWith("Bearer")
      ? authHeader.split(" ")[1]
      : authHeader;

    const verifyToken = await jwtVerifyToken(accessToken);
    const userCompanyId = verifyToken?.payload?.companyId;

    if (!userCompanyId) {
      throw new AppError(
        401,
        "Company ID is required to fetch collaboration companies.",
      );
    }

    const finalCompanies = await getFilteredConnectedCompanies(
      userCompanyId as number,
    );
    const total = finalCompanies.length;

    return NextResponse.json(
      {
        success: true,
        data: finalCompanies,
        message: "Collaboration companies fetched successfully",
        meta: {
          totalRecords: total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          hasNextPage: pageNum * limitNum < total,
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
