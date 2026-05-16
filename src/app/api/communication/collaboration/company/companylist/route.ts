import { getUserPermissions } from "@/actions/settings/teamManagement";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getFilteredConnectedCompanies } from "@/lib/collaboration/getFilteredConnectedCompanies";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/collaboration/company/companylist:
 *   get:
 *     summary: Retrieve a list of collaboration companies
 *     description: Fetches a paginated list of companies that are marked as collaborators, excluding the current user's company.
 *     tags:
 *       - Collaboration
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: A list of collaboration companies with their admin users.
 *       401:
 *         description: Unauthorized
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

    const companySearchCondition: Prisma.CompanyWhereInput = search
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

    const userSearchCondition: Prisma.UserWhereInput = search
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
    const userCompanyId = verifyToken?.payload?.companyId as number | undefined;

    if (!userCompanyId) {
      throw new AppError(
        401,
        "Company ID is required to fetch collaboration companies.",
      );
    }

    const finalCompanies = await getFilteredConnectedCompanies(userCompanyId);

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
      skip,
      take: limitNum,
    });

    const filteredCompanyWithAdmin = (
      await Promise.all(
        companyWithAdmin.map(async (company) => {
          const filteredAdmins = await Promise.all(
            company.users.map(async (user) => {
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

                return hasCollaboration
                  ? {
                      ...user,
                      companyName: company.name,
                      isConnected: finalCompanies.some(
                        (c) => c.id === user.companyId,
                      ),
                      companyStatus: joinStatus?.toLocaleLowerCase(),
                    }
                  : null;
              } catch {
                return null;
              }
            }),
          );
          return filteredAdmins.filter((u) => u !== null);
        }),
      )
    ).flat();

    const totalRecords = await db.company.count({
      where: {
        NOT: { id: userCompanyId },
        isCollaborators: true,
        ...companySearchCondition,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: filteredCompanyWithAdmin,
        message: "Collaboration companies fetched successfully",
        meta: {
          totalRecords,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalRecords / limitNum),
          hasNextPage: pageNum * limitNum < totalRecords,
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
}
