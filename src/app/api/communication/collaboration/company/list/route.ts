import { getUserPermissions } from "@/actions/settings/teamManagement";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { NextRequest, NextResponse } from "next/server";


/**
 * @swagger
 * /api/communication/collaboration/company/list:
 *   get:
 *     summary: Retrieve a list of collaboration companies
 *     description: Fetches a paginated list of companies that are marked as collaborators, excluding the current user's company.
 *     tags:
 *       - Collaboration
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number to retrieve.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: The number of companies to return per page.
 *     responses:
 *       200:
 *         description: A list of collaboration companies with their admin users.
 *       401:
 *         description: Unauthorized - Company ID is required or token is invalid.
 *       500:
 *         description: Internal server error.
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");
    const skip = (pageNum - 1) * limitNum;
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

    const companyWithAdmin = await db.company.findMany({
      where: {
        NOT: { id: userCompanyId },
        isCollaborators: true,
      },
      select: {
        id: true,
        name: true,
        users: {
          where: { employeeType: "Admin" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyId: true,
            email: true,
            role: true,
            image: true,
            employeeType: true,
          },
        },
        isCollaborators: true,
      },
      skip: skip,
      take: limitNum,
    });

    const filteredCompanyWithAdminPromises = companyWithAdmin.map(
      async company => {
        const filteredAdmins = await Promise.all(
          company.users.map(async user => {
            try {
              const permissions = await getUserPermissions(
                user.id,
                user.employeeType,
              );

              const hasCollaboration =
                permissions?.communicationHubCollaboration === true;

              return hasCollaboration
                ? {
                    ...user,
                    companyName: company.name,
                    isConnected: company.isCollaborators,
                  }
                : null;
            } catch (error) {
              console.error(
                `    ERROR checking permissions for admin ${user.id}:`,
                error,
              );
              return null;
            }
          }),
        );
        return filteredAdmins.filter(user => user !== null);
      },
    );

    const filteredCompanyWithAdmin = (
      await Promise.all(filteredCompanyWithAdminPromises)
    ).flat();

    const totalRecords = await db.company.count({
      where: {
        NOT: { id: userCompanyId },
        isCollaborators: true,
      },
    });

    const hasNextPage = pageNum * limitNum < totalRecords;
    const hasPrevPage = pageNum > 1;
    const totalPages = Math.ceil(totalRecords / limitNum);

    return NextResponse.json(
      {
        success: true,
        data: filteredCompanyWithAdmin,
        message: "Collaboration companies fetched successfully",
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
}
