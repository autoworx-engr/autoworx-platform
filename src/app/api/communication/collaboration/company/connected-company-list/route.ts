import { getUserPermissions } from "@/actions/settings/teamManagement";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/collaboration/company/connected-company-list:
 *   get:
 *     summary: Retrieve a list of collaboration connected companies by company
 *     description: Fetches a paginated list of collaboration connected companies, excluding the current user's company.
 *     tags:
 *       - Collaboration
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by company name, user first name, last name, or email.
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
    const search = searchParams.get("search") || "";
    const skip = (pageNum - 1) * limitNum;
    const authHeader = request.headers.get("authorization") ?? "";

    const companySearchCondition: any = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            {
              users: {
                some: {
                  employeeType: "Admin",
                  OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {};

    const userSearchCondition: any = search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { company: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {};
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
            },
          },
        },
      },
    });

    const oppositeCompanies = connectedCompanies.map((join) => {
      if (join.companyOneId === userCompanyId) {
        return join.companyTwo;
      } else {
        return join.companyOne;
      }
    });
    // Filter users in oppositeCompanies based on their collaboration permissions
    const filteredOppositeCompanies = await Promise.all(
      oppositeCompanies.map(async (company) => {
        // Filter users who have collaboration permission
        const filteredUsers = await Promise.all(
          company.users.map(async (user) => {
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

        const filtered = filteredUsers.filter((user) => user !== null);

        return {
          ...company,
          users: filtered,
        };
      }),
    );

    // Remove companies that have no users with collaboration permission
    const finalCompanies = filteredOppositeCompanies.filter(
      (company) => company.users.length > 0,
    );

    const companyWithAdmin = await db.company.findMany({
      where: {
        NOT: { id: userCompanyId },
        isCollaborators: true,
        ...companySearchCondition,
      },
      select: {
        id: true,
        name: true,
        users: {
          where: { employeeType: "Admin", ...userSearchCondition },
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
        companyJoinsAsOne: {
          where: {
            OR: [
              { companyOneId: userCompanyId },
              { companyTwoId: userCompanyId },
            ],
          },
          select: {
            status: true,
            companyOneId: true,
            companyTwoId: true,
          },
        },
        companyJoinsAsTwo: {
          where: {
            OR: [
              { companyOneId: userCompanyId },
              { companyTwoId: userCompanyId },
            ],
          },
          select: {
            status: true,
            companyOneId: true,
            companyTwoId: true,
          },
        },
      },
      skip: skip,
      take: limitNum,
    });

    const filteredCompanyWithAdminPromises = companyWithAdmin.map(
      async (company) => {
        const filteredAdmins = await Promise.all(
          company.users.map(async (user) => {
            // Find the join between YOUR company (userCompanyId = 4) and the current company
            const joinAsOne = company.companyJoinsAsOne.find(
              (j) =>
                (j.companyOneId === company.id &&
                  j.companyTwoId === userCompanyId) ||
                (j.companyOneId === userCompanyId &&
                  j.companyTwoId === company.id),
            );

            const joinAsTwo = company.companyJoinsAsTwo.find(
              (j) =>
                (j.companyOneId === company.id &&
                  j.companyTwoId === userCompanyId) ||
                (j.companyOneId === userCompanyId &&
                  j.companyTwoId === company.id),
            );

            const joinStatus = joinAsOne?.status ?? joinAsTwo?.status ?? null;
            try {
              const permissions = await getUserPermissions(
                user.id,
                user.employeeType,
              );

              const hasCollaboration =
                permissions?.communicationHubCollaboration === true;

              // Fetch last collaboration message for this company
              const lastMessage = await db.collaborationMessage.findFirst({
                where: {
                  OR: [
                    { fromCompanyId: userCompanyId, toCompanyId: company.id },
                    { fromCompanyId: company.id, toCompanyId: userCompanyId },
                  ],
                },
                orderBy: { createdAt: "desc" },
              });

              // Count unread messages
              const unreadCount = await db.companyChatTrack.count({
                where: {
                  receiverCompanyId: userCompanyId,
                  senderCompanyId: company.id,
                  isRead: false,
                },
              });

              return hasCollaboration
                ? {
                    ...user,
                    companyName: company.name,
                    isConnected: finalCompanies.some(
                      (c) => c.id === user.companyId,
                    ),
                    companyStatus: joinStatus?.toLocaleLowerCase(),
                    lastMessage,
                    unreadCount,
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
        return filteredAdmins.filter((user) => user !== null);
      },
    );

    const filteredCompanyWithAdmin = (
      await Promise.all(filteredCompanyWithAdminPromises)
    ).flat();

    const collaborationConnectedCompanies = filteredCompanyWithAdmin.filter(
      (c) => c.isConnected === true,
    );

    const hasNextPage =
      pageNum * limitNum < collaborationConnectedCompanies?.length;
    const hasPrevPage = pageNum > 1;
    const totalPages = Math.ceil(
      collaborationConnectedCompanies?.length ?? 0 / limitNum,
    );

    return NextResponse.json(
      {
        success: true,
        data: collaborationConnectedCompanies,
        message: "Collaboration connected companies fetched successfully",
        meta: {
          totalRecords: collaborationConnectedCompanies.length ?? 0,
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
