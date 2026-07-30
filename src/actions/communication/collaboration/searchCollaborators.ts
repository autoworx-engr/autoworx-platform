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
    const words = term.split(/\s+/).filter(Boolean);
    const skip = (pageNum - 1) * limitNum;

    const userWordCondition = (word: string): Prisma.UserWhereInput => ({
      OR: [
        { firstName: { contains: word, mode: "insensitive" } },
        { lastName: { contains: word, mode: "insensitive" } },
        { email: { contains: word, mode: "insensitive" } },
      ],
    });

    // Each word must match SOMETHING about the company — its name, or any one
    // of its admins — but different words are allowed to match different
    // places. This lets a cross-entity query like "Acme John" (company name
    // "Acme Corp" + admin firstName "John") match, which a strict "all words
    // in the name" OR "all words on one admin" check would miss entirely.
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
