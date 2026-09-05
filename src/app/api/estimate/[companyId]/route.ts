import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { sendEstimateCreateNotification } from "@/lib/notification/invoice-notify";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { InvoiceType, Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";

/**
 * @swagger
 * components:
 *   schemas:
 *     EstimateClient:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         firstName:
 *           type: string
 *           nullable: true
 *         lastName:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           nullable: true
 *         mobile:
 *           type: string
 *           nullable: true
 *
 *     EstimateVehicle:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         make:
 *           type: string
 *           nullable: true
 *         model:
 *           type: string
 *           nullable: true
 *         year:
 *           type: integer
 *           nullable: true
 *
 *     EstimateColumn:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         bgColor:
 *           type: string
 *           nullable: true
 *         textColor:
 *           type: string
 *           nullable: true
 *
 *     EstimateTag:
 *       type: object
 *       properties:
 *         tag:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *
 *     EstimateListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "1234567890"
 *         type:
 *           type: string
 *           enum: [Estimate, Invoice]
 *         companyId:
 *           type: integer
 *         columnId:
 *           type: integer
 *           nullable: true
 *         subtotal:
 *           type: number
 *         discount:
 *           type: number
 *         tax:
 *           type: number
 *         serviceFee:
 *           type: number
 *         grandTotal:
 *           type: number
 *         deposit:
 *           type: number
 *         due:
 *           type: number
 *         profit:
 *           type: integer
 *           nullable: true
 *         internalNotes:
 *           type: string
 *           nullable: true
 *         terms:
 *           type: string
 *           nullable: true
 *         policy:
 *           type: string
 *           nullable: true
 *         customerNotes:
 *           type: string
 *           nullable: true
 *         customerComments:
 *           type: string
 *           nullable: true
 *         damageNotes:
 *           type: string
 *           nullable: true
 *         isWorkOrder:
 *           type: boolean
 *           nullable: true
 *         workOrderCreatedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         convertedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         client:
 *           $ref: '#/components/schemas/EstimateClient'
 *           nullable: true
 *         vehicle:
 *           $ref: '#/components/schemas/EstimateVehicle'
 *           nullable: true
 *         column:
 *           $ref: '#/components/schemas/EstimateColumn'
 *           nullable: true
 *         tags:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EstimateTag'
 *
 *     EstimatePagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         total:
 *           type: integer
 *           example: 42
 *         totalPages:
 *           type: integer
 *           example: 5
 *         hasMore:
 *           type: boolean
 *           example: true
 *
 *     CreateEstimateMaterial:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         vendorId:
 *           type: integer
 *           nullable: true
 *         categoryId:
 *           type: integer
 *           nullable: true
 *         notes:
 *           type: string
 *           nullable: true
 *         quantity:
 *           type: number
 *         cost:
 *           type: number
 *         sell:
 *           type: number
 *         discount:
 *           type: number
 *         productId:
 *           type: integer
 *           nullable: true
 *         tagIds:
 *           type: array
 *           items:
 *             type: integer
 *
 *     CreateEstimateLabor:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         categoryId:
 *           type: integer
 *           nullable: true
 *         notes:
 *           type: string
 *           nullable: true
 *         hours:
 *           type: number
 *         charge:
 *           type: number
 *         discount:
 *           type: number
 *         tagIds:
 *           type: array
 *           items:
 *             type: integer
 *
 *     CreateEstimateItem:
 *       type: object
 *       properties:
 *         serviceId:
 *           type: integer
 *           nullable: true
 *         serviceDesc:
 *           type: string
 *           nullable: true
 *         labor:
 *           $ref: '#/components/schemas/CreateEstimateLabor'
 *         materials:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CreateEstimateMaterial'
 *         tagIds:
 *           type: array
 *           items:
 *             type: integer
 *
 *     CreateEstimateInspection:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         driver:
 *           type: boolean
 *         passenger:
 *           type: boolean
 *         notes:
 *           type: string
 *           nullable: true
 *
 *     CreateEstimateRequest:
 *       type: object
 *       required:
 *         - type
 *       properties:
 *         type:
 *           type: string
 *           enum: [Estimate, Invoice]
 *         clientId:
 *           type: integer
 *           nullable: true
 *         vehicleId:
 *           type: integer
 *           nullable: true
 *         columnId:
 *           type: integer
 *           nullable: true
 *           description: Defaults to the "Pending" (Estimate) or "In Progress" (Invoice) shop column when omitted
 *         subtotal:
 *           type: number
 *           default: 0
 *         discount:
 *           type: number
 *           default: 0
 *         tax:
 *           type: number
 *           default: 0
 *         serviceFee:
 *           type: number
 *           default: 0
 *         vehicleExtraCost:
 *           type: number
 *           default: 0
 *         grandTotal:
 *           type: number
 *           default: 0
 *         deposit:
 *           type: number
 *           default: 0
 *         due:
 *           type: number
 *           default: 0
 *         internalNotes:
 *           type: string
 *           default: ""
 *         terms:
 *           type: string
 *           default: ""
 *         policy:
 *           type: string
 *           default: ""
 *         customerNotes:
 *           type: string
 *           default: ""
 *         customerComments:
 *           type: string
 *           default: ""
 *         damageNotes:
 *           type: string
 *           nullable: true
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CreateEstimateItem'
 *         photos:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *         tasks:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               task:
 *                 type: string
 *                 description: "Format: 'title' or 'title:description'"
 *         inspections:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CreateEstimateInspection'
 *
 *     CreateEstimateResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Estimate created successfully
 *         data:
 *           $ref: '#/components/schemas/EstimateListItem'
 */

/**
 * @swagger
 * /api/estimate/{companyId}:
 *   get:
 *     summary: List estimates/invoices for a company
 *     description: >
 *       Returns a paginated list of estimates/invoices belonging to the given company.
 *       When searchTerm is provided, pagination is bypassed and all matches are returned
 *       as a single page (matched against client name/email/mobile, vehicle make/model/year,
 *       column title, and invoice ID via raw SQL search).
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID (must match the authenticated principal's company)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Estimate, Invoice]
 *         description: Filter by invoice type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (ignored when searchTerm is provided)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Page size (ignored when searchTerm is provided)
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Free-text search across client, vehicle, column and invoice ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by createdAt >= startDate
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by createdAt <= endDate (end of day)
 *       - in: query
 *         name: columnId
 *         schema:
 *           type: integer
 *         description: Filter by pipeline column ID
 *     responses:
 *       200:
 *         description: Estimates fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EstimateListItem'
 *                 pagination:
 *                   $ref: '#/components/schemas/EstimatePagination'
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
 *       403:
 *         description: Forbidden - companyId does not match the authenticated principal
 *       500:
 *         description: Failed to fetch estimates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to fetch estimates
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdParam } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as InvoiceType | null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10")),
    );
    const skip = (page - 1) * limit;
    const searchTerm = searchParams.get("searchTerm")?.trim() || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const columnId = searchParams.get("columnId")
      ? Number(searchParams.get("columnId"))
      : undefined;

    const where: Record<string, any> = { companyId };

    if (type && (type === "Estimate" || type === "Invoice")) {
      where.type = type;
    }

    if (columnId && !isNaN(columnId)) {
      where.columnId = columnId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (searchTerm) {
      // Resolve matching invoice IDs across client, vehicle and column fields
      // via raw SQL (mirrors src/lib/fetchAndTransformData.ts), since Prisma
      // can't search the Int year column or concatenated vehicle strings.
      const searchPattern = `%${searchTerm.trim().replace(/\s+/g, " ")}%`;
      // Match each typed word against first/last name independently (in either
      // field, any order) so "ade ekram", "ekram", or extra whitespace in the
      // stored name all still match "Ekram Ade" - not just an exact,
      // contiguous "first_name last_name" substring.
      const nameWords = searchTerm.trim().split(/\s+/).filter(Boolean);
      const nameCondition =
        nameWords.length > 0
          ? Prisma.sql`(${Prisma.join(
              nameWords.map(
                (word) =>
                  Prisma.sql`(c."first_name" ILIKE ${`%${word}%`} OR c."last_name" ILIKE ${`%${word}%`})`,
              ),
              " AND ",
            )})`
          : Prisma.sql`FALSE`;
      const matches = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT i.id
        FROM "Invoice" i
        LEFT JOIN "Client" c ON i."customer_id" = c.id
        LEFT JOIN "Vehicle" v ON i."vehicle_id" = v.id
        LEFT JOIN "Column" col ON i."column_id" = col.id
        WHERE i."company_id" = ${companyId}
          AND (
            i.id::text ILIKE ${searchPattern}
            OR ${nameCondition}
            OR c.email ILIKE ${searchPattern}
            OR c.mobile ILIKE ${searchPattern}
            OR v.make ILIKE ${searchPattern}
            OR v.model ILIKE ${searchPattern}
            OR CAST(v.year AS TEXT) ILIKE ${searchPattern}
            OR col.title ILIKE ${searchPattern}
            OR CONCAT(CAST(v.year AS TEXT), ' ', v.make, ' ', v.model) ILIKE ${searchPattern}
            OR CONCAT(v.make, ' ', CAST(v.year AS TEXT), ' ', v.model) ILIKE ${searchPattern}
            OR CONCAT(v.model, ' ', CAST(v.year AS TEXT), ' ', v.make) ILIKE ${searchPattern}
          )
      `);
      where.id = { in: matches.map((m) => m.id) };
    }

    const [estimates, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        ...(searchTerm ? {} : { skip, take: limit }),
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobile: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
            },
          },
          column: {
            select: { id: true, title: true, bgColor: true, textColor: true },
          },
          tags: {
            include: { tag: true },
          },
        },
      }),
      db.invoice.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: estimates,
      pagination: searchTerm
        ? {
            page: 1,
            limit: total,
            total,
            totalPages: 1,
            hasMore: false,
          }
        : {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: skip + estimates.length < total,
          },
    });
  } catch (error) {
    console.error("ESTIMATE LIST ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch estimates" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/estimate/{companyId}:
 *   post:
 *     summary: Create an estimate/invoice
 *     description: >
 *       Creates a new estimate or invoice for the given company, along with its items
 *       (labor, materials, tags), photos, tasks and inspections in a single transaction.
 *       If columnId is omitted, defaults to the company's "Pending" (Estimate) or
 *       "In Progress" (Invoice) shop column.
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID (must match the authenticated principal's company)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEstimateRequest'
 *     responses:
 *       201:
 *         description: Estimate/invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateEstimateResponse'
 *       400:
 *         description: >
 *           Invalid input - missing/invalid type, or a material with quantity <= 0
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
 *       403:
 *         description: Forbidden - companyId does not match the authenticated principal
 *       404:
 *         description: Company not found
 *       500:
 *         description: Failed to create estimate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to create estimate
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdParam } = await params;
    const principal = await getAuthPrincipal(req);
    const jwtCompanyId = principal?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;
    const actingUserId = principal?.userId ?? null;

    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json(
        { success: false, message: "Company not found" },
        { status: 404 },
      );
    }

    const body = await req.json();

    const {
      type,
      clientId,
      vehicleId,
      columnId,
      subtotal = 0,
      discount = 0,
      tax = 0,
      serviceFee = 0,
      vehicleExtraCost = 0,
      grandTotal = 0,
      deposit = 0,
      due = 0,
      internalNotes = "",
      terms = "",
      policy = "",
      customerNotes = "",
      customerComments = "",
      damageNotes = null,
      items = [],
      photos = [],
      tasks = [],
      inspections = [],
      id,
    } = body;

    if (!type || !["Estimate", "Invoice"].includes(type)) {
      return NextResponse.json(
        { success: false, message: "type must be 'Estimate' or 'Invoice'" },
        { status: 400 },
      );
    }

    // Resolve column
    let finalColumnId = columnId;
    if (!finalColumnId) {
      const defaultTitle = type === "Estimate" ? "Pending" : "In Progress";
      const defaultColumn = await db.column.findFirst({
        where: { companyId, title: defaultTitle, type: "shop" },
        select: { id: true },
      });
      if (!defaultColumn) {
        return NextResponse.json(
          {
            success: false,
            message: `Default column "${defaultTitle}" not found`,
          },
          { status: 400 },
        );
      }
      finalColumnId = defaultColumn.id;
    }

    // Calculate profit from items
    const totalCost = items.reduce((acc: number, item: any) => {
      const materialCost = (item.materials || []).reduce(
        (m: number, mat: any) =>
          m + Number(mat?.cost || 0) * Number(mat?.quantity || 0),
        0,
      );
      const laborCost =
        Number(item.labor?.charge || 0) * Number(item.labor?.hours || 0);
      return acc + materialCost + laborCost;
    }, 0);

    const invoice = await db.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          id: customAlphabet("1234567890", 10)(),
          type: type as InvoiceType,
          clientId: clientId ? Number(clientId) : undefined,
          vehicleId: vehicleId ? Number(vehicleId) : undefined,
          companyId,
          columnId: finalColumnId,
          subtotal,
          discount,
          tax,
          serviceFee,
          grandTotal,
          deposit,
          due,
          profit: grandTotal - totalCost,
          internalNotes,
          terms,
          policy,
          customerNotes,
          customerComments,
          damageNotes,
          isWorkOrder: type === "Invoice",
          workOrderCreatedAt: type === "Invoice" ? new Date() : null,
          convertedAt: new Date(),
        },
      });

      // Mark lead as estimate created
      if (type === "Estimate" && clientId) {
        const theClient = await tx.client.findFirst({
          where: { id: Number(clientId) },
          select: { leadId: true },
        });
        if (theClient?.leadId) {
          await tx.lead.update({
            where: { id: theClient.leadId },
            data: { isEstimateCreated: true },
          });
        }
      }

      // Photos
      if (photos.length > 0) {
        await tx.invoicePhoto.createMany({
          data: photos.map((p: any) => ({
            invoiceId: newInvoice.id,
            photo: p.photo ?? "",
          })),
        });
      }

      // Inspections
      const validInspections = (inspections as any[]).filter(
        (ins) =>
          ins.title?.toString().trim() ||
          ins.driver ||
          ins.passenger ||
          ins.notes?.toString().trim(),
      );
      if (validInspections.length > 0) {
        await tx.invoiceInspection.createMany({
          data: validInspections.map((ins: any) => ({
            invoiceId: newInvoice.id,
            title: ins.title,
            driver: ins.driver ?? false,
            passenger: ins.passenger ?? false,
            notes: ins.notes,
          })),
        });
      }

      // Items (service + labor + materials + tags)
      const serviceIndex: (number | null)[] = [];
      for (const item of items as any[]) {
        serviceIndex.push(item.serviceId ?? null);

        let laborId: number | undefined;
        if (item.labor) {
          const newLabor = await tx.labor.create({
            data: {
              name: item.labor.name ?? "",
              categoryId: item.labor.categoryId ?? undefined,
              notes: item.labor.notes ?? undefined,
              hours: Number(item.labor.hours ?? 0),
              charge: Number(item.labor.charge ?? 0),
              discount: Number(item.labor.discount ?? 0),
              companyId,
            },
          });
          laborId = newLabor.id;
          if ((item.labor.tagIds ?? []).length > 0) {
            await tx.laborTag.createMany({
              data: (item.labor.tagIds as number[]).map((tagId) => ({
                laborId: newLabor.id,
                tagId,
              })),
            });
          }
        }

        const invoiceItem = await tx.invoiceItem.create({
          data: {
            invoiceId: newInvoice.id,
            serviceId: item.serviceId ?? undefined,
            laborId,
            serviceDesc: item.serviceDesc ?? undefined,
          },
        });

        // Materials
        for (const mat of item.materials ?? []) {
          if (!mat?.name) continue;
          if (Number(mat.quantity ?? 0) <= 0) {
            throw new Error("Material quantity must be greater than 0");
          }
          const newMat = await tx.material.create({
            data: {
              name: mat.name,
              vendorId: mat.vendorId ?? undefined,
              categoryId: mat.categoryId ?? undefined,
              notes: mat.notes ?? undefined,
              quantity: Number(mat.quantity),
              cost: Number(mat.cost ?? 0),
              sell: Number(mat.sell ?? 0),
              discount: Number(mat.discount ?? 0),
              invoiceId: newInvoice.id,
              companyId,
              invoiceItemId: invoiceItem.id,
              productId: mat.productId ?? undefined,
            },
          });
          if ((mat.tagIds ?? []).length > 0) {
            await tx.materialTag.createMany({
              data: (mat.tagIds as number[]).map((tagId) => ({
                materialId: newMat.id,
                tagId,
              })),
            });
          }
        }

        // Item tags
        if ((item.tagIds ?? []).length > 0) {
          await tx.itemTag.createMany({
            data: (item.tagIds as number[]).map((tagId: number) => ({
              itemId: invoiceItem.id,
              tagId,
            })),
          });
        }
      }

      // Tasks
      //
      // `userId`/`createdBy` mirror the web create action (actions/estimate/
      // invoice/create.ts). Task & Activity scopes to creator-or-assignee, so a
      // task written without an owner is invisible in every task list.
      for (const t of tasks as any[]) {
        if (!t?.task) continue;
        const parts = t.task.split(":");
        await tx.task.create({
          data: {
            title: parts[0].trim(),
            description: parts.length > 1 ? parts[1].trim() : "",
            invoiceId: newInvoice.id,
            companyId,
            clientId: clientId ? Number(clientId) : undefined,
            priority: "Medium",
            userId: actingUserId,
            createdBy: "user",
          },
        });
      }

      await tx.invoice.update({
        where: { id: newInvoice.id },
        data: { serviceIndex: JSON.stringify(serviceIndex) },
      });

      return newInvoice;
    });

    const notifyClient = invoice.clientId
      ? await db.client.findUnique({
          where: { id: invoice.clientId },
          select: { firstName: true, lastName: true },
        })
      : null;

    sendEstimateCreateNotification({
      companyId,
      invoiceId: invoice.id,
      invoiceType: invoice.type,
      clientName: notifyClient
        ? `${notifyClient.firstName} ${notifyClient.lastName ?? ""}`.trim()
        : undefined,
    }).catch((err) =>
      console.error("sendEstimateCreateNotification failed", err),
    );

    return NextResponse.json(
      {
        success: true,
        message: `${type} created successfully`,
        data: invoice,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("ESTIMATE CREATE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create estimate",
      },
      { status: 500 },
    );
  }
}
