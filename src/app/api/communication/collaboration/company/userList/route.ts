import { getUserPermissions } from "@/actions/settings/teamManagement";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
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
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: The page number to retrieve.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: The number of items to return per page.
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of collaborating companies.
 *       401:
 *         description: Unauthorized. Authentication token is missing, invalid, or does not contain a valid Company ID.
 *       500:
 *         description: Internal Server Error.
 */

export const GET = async (request: NextRequest) => {
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

    // Fetch connected companies with pagination
    const connectedCompanies = await db.companyJoin.findMany({
      where: {
        OR: [
          {
            companyOneId: userCompanyId,
            companyTwo: {
              isCollaborators: true,
            },
          },
          {
            companyTwoId: userCompanyId,
            companyOne: {
              isCollaborators: true,
            },
          },
        ],
        status: "ACCEPTED",
      },
      include: {
        companyOne: {
          include: {
            users: {
              where: {
                employeeType: {
                  in: ["Admin", "Manager", "Sales"],
                },
              },
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
          },
        },
        companyTwo: {
          include: {
            users: {
              where: {
                employeeType: {
                  in: ["Admin", "Manager", "Sales"],
                },
              },
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
          },
        },
      },
      skip: skip,
      take: limitNum,
    });

    const totalRecords = await db.companyJoin.count({
      where: {
        OR: [
          {
            companyOneId: userCompanyId,
            companyTwo: {
              isCollaborators: true,
            },
          },
          {
            companyTwoId: userCompanyId,
            companyOne: {
              isCollaborators: true,
            },
          },
        ],
        status: "ACCEPTED",
      },
    });

    const oppositeCompanies = connectedCompanies.map(join => {
      if (join.companyOneId === userCompanyId) {
        return join.companyTwo;
      } else {
        return join.companyOne;
      }
    });

    // Filter users in oppositeCompanies based on their collaboration permissions
    const filteredOppositeCompanies = await Promise.all(
      oppositeCompanies.map(async company => {
        // Filter users who have collaboration permission
        const filteredUsers = await Promise.all(
          company.users.map(async user => {
            try {
              const permissions = await getUserPermissions(
                user.id,
                user.employeeType,
              );

              // Check communicationHubCollaboration permission
              const hasCollaboration =
                permissions?.communicationHubCollaboration === true;

              return hasCollaboration ? user : null;
            } catch (error) {
              console.error(`  ERROR for user ${user.firstName}:`, error);
              return null;
            }
          }),
        );

        const filtered = filteredUsers.filter(user => user !== null);

        return {
          ...company,
          users: filtered,
        };
      }),
    );

    // Remove companies that have no users with collaboration permission
    const finalCompanies = filteredOppositeCompanies.filter(
      company => company.users.length > 0,
    );

    const hasNextPage = pageNum * limitNum < totalRecords;
    const hasPrevPage = pageNum > 1;
    const totalPages = Math.ceil(totalRecords / limitNum);

    return NextResponse.json(
      {
        success: true,
        data: finalCompanies,
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
};
