// TODO: Rate limiting — heavily used by both kanban "load more" and list view.

import { updateCommunicationAutomationTrigger } from "@/actions/automation/communication/triggerCommunicationAutomation";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateTagAutomationTrigger } from "@/actions/automation/tag/triggerTagAutomation";
import { initialCreateClientChatTrack } from "@/actions/communication/client/chat-track";
import { companyWithUser } from "@/actions/settings/getCompanyWithUser";
import { db } from "@/lib/db";
import { sendNewLeadNotification } from "@/lib/notification/pipeline-notify";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  extractCompanyId,
  OrderField,
  parseIntParam,
  parseOrderField,
  parseDateParam,
  pipelineError,
  sanitizeSearchTerm,
} from "../_shared";

// ─── Prisma include shape ────────────────────────────────────────────────────

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

// ─── Query builder ───────────────────────────────────────────────────────────

type FilterParams = {
  columnId?: number;
  searchTerm?: string;
  assignedTo?: number;
  source?: string;
  service?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
};

function buildWhere(companyId: number, p: FilterParams): Prisma.LeadWhereInput {
  return {
    companyId,
    ...(p.columnId != null && { columnId: p.columnId }),
    ...(p.searchTerm && {
      OR: [
        { clientName: { contains: p.searchTerm, mode: "insensitive" } },
        { vehicleInfo: { contains: p.searchTerm, mode: "insensitive" } },
        { services: { contains: p.searchTerm, mode: "insensitive" } },
        { source: { contains: p.searchTerm, mode: "insensitive" } },
      ],
    }),
    ...(p.assignedTo != null && { assignedSalesUserId: p.assignedTo }),
    ...(p.source && { source: p.source }),
    ...(p.service && { services: p.service }),
    ...(p.status && { column: { title: p.status } }),
    ...(p.startDate &&
      p.endDate && {
        createdAt: {
          gte: new Date(p.startDate),
          // Include the full end day.
          lte: new Date(new Date(p.endDate).getTime() + 86_400_000 - 1),
        },
      }),
  };
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const companyId = await extractCompanyId(request);
    const sp = request.nextUrl.searchParams;

    // Validated numeric params.
    const columnId = parseIntParam(
      sp.get("columnId"),
      -1,
      1,
      Number.MAX_SAFE_INTEGER,
    );
    const assignedTo = parseIntParam(
      sp.get("assignedTo"),
      -1,
      1,
      Number.MAX_SAFE_INTEGER,
    );
    const take = parseIntParam(sp.get("take"), 10, 1, 100);
    const skip = parseIntParam(sp.get("skip"), 0, 0, Number.MAX_SAFE_INTEGER);

    // Text params.
    const searchTerm = sanitizeSearchTerm(sp.get("searchTerm"));
    const source = sp.get("source")?.trim().slice(0, 100) || undefined;
    const service = sp.get("service")?.trim().slice(0, 100) || undefined;
    const status = sp.get("status")?.trim().slice(0, 100) || undefined;

    // Date params — ignored when invalid.
    const startDate = parseDateParam(sp.get("startDate"));
    const endDate = parseDateParam(sp.get("endDate"));

    // Sort field (createdAt / updatedAt / columnChangedAt).
    const orderByField: OrderField = parseOrderField(sp.get("orderBy"));

    const where = buildWhere(companyId, {
      columnId: columnId > 0 ? columnId : undefined,
      searchTerm,
      assignedTo: assignedTo > 0 ? assignedTo : undefined,
      source,
      service,
      status,
      startDate,
      endDate,
    });

    const pageRaw = sp.get("page");

    // ── Paginated list view (getLeads) — triggered by presence of `page` param ──
    if (pageRaw != null) {
      const page = parseIntParam(pageRaw, 1, 1, 10_000);
      const pageSkip = (page - 1) * take;

      const [total, leadsData] = await Promise.all([
        db.lead.count({ where }),
        db.lead.findMany({
          where,
          take,
          skip: pageSkip,
          orderBy: { [orderByField]: "desc" },
          include: leadInclude,
        }),
      ]);

      const totalPages = Math.ceil(total / take);

      return NextResponse.json({
        success: true,
        data: leadsData.map((l) => mapLead(l, companyId)),
        meta: {
          total,
          page,
          take,
          totalPages,
          hasNextPage: page < totalPages,
        },
      });
    }

    // ── Column "load more" (getColumnLeads) — triggered by `skip` param ──────
    const [leadsData, totalCount] = await Promise.all([
      db.lead.findMany({
        where,
        take,
        skip,
        orderBy: { [orderByField]: "desc" },
        include: leadInclude,
      }),
      db.lead.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: leadsData.map((l) => mapLead(l, companyId)),
      totalCount,
    });
  } catch (error) {
    console.error(
      "[pipeline/sales/leads] error:",
      error instanceof Error ? error.message : error,
    );
    return pipelineError(error, "Failed to fetch leads");
  }
}

// ─── POST /api/pipeline/sales/leads ─────────────────────────────────────────
// Create a new lead from the mobile app. Uses Bearer JWT auth.

export async function POST(request: NextRequest) {
  try {
    const companyId = await extractCompanyId(request);

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const raw = body as Record<string, unknown>;

    // Required fields
    const clientName =
      typeof raw.clientName === "string"
        ? raw.clientName.trim().slice(0, 255)
        : "";
    const vehicleInfo =
      typeof raw.vehicleInfo === "string"
        ? raw.vehicleInfo.trim().slice(0, 500)
        : "";
    const services =
      typeof raw.services === "string" ? raw.services.trim().slice(0, 500) : "";
    const source =
      typeof raw.source === "string" ? raw.source.trim().slice(0, 200) : "";

    if (!clientName) {
      return NextResponse.json(
        { success: false, error: "clientName is required" },
        { status: 400 },
      );
    }
    if (!vehicleInfo) {
      return NextResponse.json(
        { success: false, error: "vehicleInfo is required" },
        { status: 400 },
      );
    }
    if (!services) {
      return NextResponse.json(
        { success: false, error: "services is required" },
        { status: 400 },
      );
    }
    if (!source) {
      return NextResponse.json(
        { success: false, error: "source is required" },
        { status: 400 },
      );
    }

    // Optional fields
    const clientPhone =
      typeof raw.clientPhone === "string" && raw.clientPhone.trim()
        ? raw.clientPhone.trim().slice(0, 30)
        : null;
    const clientEmail =
      typeof raw.clientEmail === "string" && raw.clientEmail.trim()
        ? raw.clientEmail.trim().toLowerCase().slice(0, 255)
        : null;
    const comments =
      typeof raw.comments === "string" && raw.comments.trim()
        ? raw.comments.trim().slice(0, 1000)
        : null;

    // Resolve columnId — verify the column belongs to this company.
    // Fall back to the first ordered column if not provided or not found.
    let resolvedColumnId: number | null = null;
    const rawColumnId = typeof raw.columnId === "number" ? raw.columnId : null;

    if (rawColumnId && rawColumnId > 0) {
      const col = await db.column.findFirst({
        where: { id: rawColumnId, companyId, type: "sales" },
        select: { id: true },
      });
      resolvedColumnId = col?.id ?? null;
    }

    if (!resolvedColumnId) {
      const firstCol = await db.column.findFirst({
        where: { companyId, type: "sales" },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      resolvedColumnId = firstCol?.id ?? null;
    }

    // Create the lead record.
    const newLead = await db.lead.create({
      data: {
        clientName,
        vehicleInfo,
        services,
        source,
        comments,
        clientPhone,
        clientEmail,
        companyId,
        columnId: resolvedColumnId,
      },
    });

    // Create or update the Client record (deduped by phone within the company).
    const nameParts = clientName.split(/\s+/);
    const firstName = nameParts.shift() ?? "";
    const lastName = nameParts.join(" ");

    let client = clientPhone
      ? await db.client.findFirst({
          where: { mobile: clientPhone, companyId },
        })
      : null;

    if (!client) {
      client = await db.client.create({
        data: {
          firstName,
          lastName,
          email: clientEmail,
          mobile: clientPhone,
          companyId,
          leadId: newLead.id,
          isSalesAgent: true,
        },
      });
    } else {
      client = await db.client.update({
        where: { id: client.id, companyId },
        data: { leadId: newLead.id, firstName, lastName },
      });
    }

    await db.lead.update({
      where: { id: newLead.id },
      data: { clientId: client.id },
    });

    // Parse vehicle info into structured fields and create a Vehicle record.
    const vehicleParts = vehicleInfo.split(/\s+/);
    const vehicleYear = parseInt(vehicleParts[0]) || undefined;
    const vehicleMake = vehicleParts[1] ?? vehicleParts[0] ?? "";
    const vehicleModel = vehicleParts.slice(2).join(" ") || "";

    const newVehicle = await db.vehicle.create({
      data: {
        year: vehicleYear,
        make: vehicleMake,
        model: vehicleModel,
        companyId,
        clientId: client.id,
      },
    });

    await db.lead.update({
      where: { id: newLead.id },
      data: { vehicleId: newVehicle.id },
    });

    // Side effects — fire-and-forget so a failure doesn't break the response.
    initialCreateClientChatTrack(client.id).catch((err: unknown) => {
      console.error("[pipeline/sales/leads POST] chat-track error:", err);
    });
    sendNewLeadNotification({
      companyId,
      leadClientName: newLead.clientName,
    }).catch((err: unknown) => {
      console.error("[pipeline/sales/leads POST] notification error:", err);
    });

    companyWithUser({ companyId })
      .then((token) => {
        updatePipelineAutomationTrigger({
          companyId,
          condition: "TIME_DELAY",
          leadId: newLead.id,
          columnId: +(newLead.columnId ?? 0),
        }).catch(() => {});
        updateCommunicationAutomationTrigger({
          companyId,
          leadId: newLead.id,
          columnId: +(newLead.columnId ?? 0),
          generatedToken: token,
        }).catch(() => {});
        updateTagAutomationTrigger({
          columnId: +(newLead.columnId ?? 0),
          companyId,
          pipelineType: "SALES",
          leadId: newLead.id,
          conditionType: "post_tag",
          generatedToken: token,
        });
      })
      .catch(() => {});

    // Return the full lead in the TLeadResponse shape.
    const leadWithRelations = await db.lead.findUnique({
      where: { id: newLead.id },
      include: leadInclude,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Lead created successfully",
        data: mapLead(leadWithRelations!, companyId),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[pipeline/sales/leads POST] error:",
      error instanceof Error ? error.message : error,
    );
    return pipelineError(error, "Failed to create lead");
  }
}
