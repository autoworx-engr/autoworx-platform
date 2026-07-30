import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import {
  batchUserPermissions,
  hasCollaborationPermission,
} from "@/lib/collaboration/batchUserPermissions";
import { getFilteredConnectedCompanies } from "@/lib/collaboration/getFilteredConnectedCompanies";
import { normalizeCollaborationSearch } from "@/lib/collaboration/normalizeCollaborationSearch";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/collaboration/company/companylist:
 *   get:
 *     summary: Retrieve a list of collaboration companies
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
    const term = normalizeCollaborationSearch(searchParams.get("search") || "");
    const words = term.split(/\s+/).filter(Boolean);
    const skip = (pageNum - 1) * limitNum;
    const authHeader = request.headers.get("authorization") ?? "";

    const userWordCondition = (word: string): Prisma.UserWhereInput => ({
      OR: [
        { firstName: { contains: word, mode: "insensitive" } },
        { lastName: { contains: word, mode: "insensitive" } },
        { email: { contains: word, mode: "insensitive" } },
      ],
    });

    // Match each word independently so a multi-word query like "Auto worx"
    // (name "Auto Worx") or a cross-entity "Acme John" still matches, and so
    // extra/leading/trailing spaces don't break search. Each word must match
    // the company name or one of its admins; different words may match
    // different places.
    const companySearchCondition: Prisma.CompanyWhereInput = words.length
      ? {
          AND: words.map(
            (word): Prisma.CompanyWhereInput => ({
              OR: [
                { name: { contains: word, mode: "insensitive" } },
                {
                  users: {
                    some: {
                      employeeType: "Admin",
                      ...userWordCondition(word),
                    },
                  },
                },
              ],
            }),
          ),
        }
      : {};

    const userSearchCondition: Prisma.UserWhereInput = words.length
      ? {
          AND: words.map(
            (word): Prisma.UserWhereInput => ({
              OR: [
                { firstName: { contains: word, mode: "insensitive" } },
                { lastName: { contains: word, mode: "insensitive" } },
                { email: { contains: word, mode: "insensitive" } },
                { company: { name: { contains: word, mode: "insensitive" } } },
              ],
            }),
          ),
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

    const [finalCompanies, companyWithAdmin, totalRecords] = await Promise.all([
      getFilteredConnectedCompanies(userCompanyId),
      db.company.findMany({
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
            select: { status: true, companyOneId: true, companyTwoId: true },
          },
          companyJoinsAsTwo: {
            where: {
              OR: [
                { companyOneId: userCompanyId },
                { companyTwoId: userCompanyId },
              ],
            },
            select: { status: true, companyOneId: true, companyTwoId: true },
          },
        },
        skip,
        take: limitNum,
      }),
      db.company.count({
        where: {
          NOT: { id: userCompanyId },
          isCollaborators: true,
          ...companySearchCondition,
        },
      }),
    ]);

    const allAdmins = companyWithAdmin.flatMap((c) => c.users);
    const permissionsByUserId = await batchUserPermissions(allAdmins);
    const connectedIds = new Set(finalCompanies.map((c) => c.id));

    const filteredCompanyWithAdmin = companyWithAdmin.flatMap((company) => {
      const matchingJoin =
        company.companyJoinsAsOne.find(
          (j) =>
            (j.companyOneId === company.id &&
              j.companyTwoId === userCompanyId) ||
            (j.companyOneId === userCompanyId && j.companyTwoId === company.id),
        ) ??
        company.companyJoinsAsTwo.find(
          (j) =>
            (j.companyOneId === company.id &&
              j.companyTwoId === userCompanyId) ||
            (j.companyOneId === userCompanyId && j.companyTwoId === company.id),
        );

      const joinStatus = matchingJoin?.status ?? null;

      return company.users
        .filter((u) =>
          hasCollaborationPermission(permissionsByUserId.get(u.id)),
        )
        .map((user) => ({
          ...user,
          companyName: company.name,
          isConnected: connectedIds.has(user.companyId),
          companyStatus: joinStatus?.toLocaleLowerCase(),
        }));
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
