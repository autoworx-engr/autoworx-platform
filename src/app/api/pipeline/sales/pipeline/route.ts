// TODO: Rate limiting — called on every mobile screen mount. Add Upstash Redis
// or similar before production at high traffic volumes.

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  extractCompanyId,
  parseOrderField,
  pipelineError,
  sanitizeSearchTerm,
} from "../_shared";

// ─── Prisma include shape ────────────────────────────────────────────────────
// Only fetches the exact fields the mobile TLead type requires.

const leadInclude = {
  salesUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      employeeType: true,
    },
  },
  leadTags: {
    select: {
      id: true,
      leadId: true,
      tagId: true,
      tag: {
        select: {
          id: true,
          name: true,
          bgColor: true,
          textColor: true,
          type: true,
          companyId: true,
        },
      },
    },
  },
  Client: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      mobile: true,
      countryCode: true,
      email: true,
      companyId: true,
      leadId: true,
    },
  },
} satisfies Prisma.LeadInclude;

type LeadRow = Prisma.LeadGetPayload<{ include: typeof leadInclude }>;

// Renames salesUser → assignedSalesUser and selects the single Client record
// that belongs to this company and lead pairing.
function mapLead(lead: LeadRow, companyId: number) {
  const client =
    lead.Client.find(
      (c) => c.companyId === companyId && c.leadId === lead.id,
    ) ?? null;

  const { salesUser, Client, ...rest } = lead;
  return {
    ...rest,
    assignedSalesUser: salesUser ?? null,
    client: client
      ? {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          mobile: client.mobile,
          countryCode: client.countryCode,
          email: client.email,
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const companyId = await extractCompanyId(request);
    const sp = request.nextUrl.searchParams;

    const searchTerm = sanitizeSearchTerm(sp.get("searchTerm"));
    const orderByField = parseOrderField(sp.get("orderBy"));

    const columns = await db.column.findMany({
      where: { type: "sales", companyId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        order: true,
        bgColor: true,
        textColor: true,
        companyId: true,
      },
    });

    const searchWhere = searchTerm
      ? {
          OR: [
            {
              clientName: {
                contains: searchTerm,
                mode: "insensitive" as const,
              },
            },
            {
              vehicleInfo: {
                contains: searchTerm,
                mode: "insensitive" as const,
              },
            },
            {
              services: { contains: searchTerm, mode: "insensitive" as const },
            },
            { source: { contains: searchTerm, mode: "insensitive" as const } },
          ],
        }
      : {};

    const data = await Promise.all(
      columns.map(async (column) => {
        const where: Prisma.LeadWhereInput = {
          columnId: column.id,
          companyId,
          ...searchWhere,
        };

        const [leads, totalCount] = await Promise.all([
          db.lead.findMany({
            where,
            take: 10,
            orderBy: { [orderByField]: "desc" },
            include: leadInclude,
          }),
          db.lead.count({ where }),
        ]);

        return {
          ...column,
          lead: leads.map((l) => mapLead(l, companyId)),
          _count: { lead: totalCount },
        };
      }),
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(
      "[pipeline/sales/pipeline] error:",
      error instanceof Error ? error.message : error,
    );
    return pipelineError(error, "Failed to fetch sales pipeline");
  }
}
