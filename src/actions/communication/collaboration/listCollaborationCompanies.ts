"use server";

import { getCompanyId } from "@/lib/companyId";
import { getFilteredConnectedCompanies } from "@/lib/collaboration/getFilteredConnectedCompanies";
import { normalizeCollaborationSearch } from "@/lib/collaboration/normalizeCollaborationSearch";

export type TListArgs = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function listCollaborationCompanies({
  page = 1,
  limit = 10,
  search = "",
}: TListArgs = {}) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return { data: [], total: 0, page, limit, hasMore: false };
    }

    const pageNum = Math.max(page, 1);
    const limitNum = Math.min(Math.max(limit, 1), 50);
    const term = normalizeCollaborationSearch(search).toLowerCase();

    const all = await getFilteredConnectedCompanies(companyId);
    const filtered = term
      ? all.filter((c) => c.name.toLowerCase().includes(term))
      : all;

    const total = filtered.length;
    const skip = (pageNum - 1) * limitNum;
    const data = filtered.slice(skip, skip + limitNum);

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      hasMore: skip + data.length < total,
    };
  } catch {
    return { data: [], total: 0, page, limit, hasMore: false };
  }
}
