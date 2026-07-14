"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import {
  batchUserPermissions,
  hasCollaborationPermission,
} from "@/lib/collaboration/batchUserPermissions";
import { getFilteredConnectedCompanies } from "@/lib/collaboration/getFilteredConnectedCompanies";
import { normalizeCollaborationSearch } from "@/lib/collaboration/normalizeCollaborationSearch";
import { Prisma } from "@prisma/client";

export type TSearchArgs = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function searchCollaborators({
  page = 1,
  limit = 10,
  search = "",
}: TSearchArgs = {}) {
  try {
    const userCompanyId = await getCompanyId();
    if (!userCompanyId) {
      return { data: [], total: 0, page, limit, hasMore: false };
    }

    const pageNum = Math.max(page, 1);
    const limitNum = Math.min(Math.max(limit, 1), 50);
    const term = normalizeCollaborationSearch(search);
    const skip = (pageNum - 1) * limitNum;

    const companySearchCondition: Prisma.CompanyWhereInput = term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            {
              users: {
                some: {
                  employeeType: "Admin",
                  OR: [
                    { firstName: { contains: term, mode: "insensitive" } },
                    { lastName: { contains: term, mode: "insensitive" } },
                    { email: { contains: term, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {};

    const userSearchCondition: Prisma.UserWhereInput = term
      ? {
          OR: [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
            { company: { name: { contains: term, mode: "insensitive" } } },
          ],
        }
      : {};

    const [finalCompanies, companyWithAdmin, total] = await Promise.all([
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
              phone: true,
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

    const permissionsByUserId = await batchUserPermissions(
      companyWithAdmin.flatMap((c) => c.users),
    );
    const connectedIds = new Set(finalCompanies.map((c) => c.id));

    const data = companyWithAdmin.flatMap((company) => {
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
          companyStatus: joinStatus?.toLocaleLowerCase() ?? null,
        }));
    });

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      hasMore: skip + companyWithAdmin.length < total,
    };
  } catch {
    return { data: [], total: 0, page, limit, hasMore: false };
  }
}
