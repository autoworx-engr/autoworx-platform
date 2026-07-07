import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { InvoiceType, Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";

/**
 * @swagger
 * /api/estimate/{companyId}:
 *   get:
 *     summary: List estimates/invoices for a company
 *     description: Returns paginated estimates or invoices scoped to the given company, with optional filters
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Estimate, Invoice]
 *           example: Estimate
 *         description: Filter by record type (defaults to both if omitted)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Records per page (default 10)
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *           example: "John"
 *         description: Search by client name or invoice ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           example: "2025-01-01"
 *         description: Filter from this date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           example: "2025-12-31"
 *         description: Filter up to this date (ISO format)
 *       - in: query
 *         name: columnId
 *         schema:
 *           type: integer
 *           example: 3
 *         description: Filter by pipeline column/status ID
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
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       400:
 *         description: Invalid company ID
 *       500:
 *         description: Internal server error
 *
 *   post:
 *     summary: Create a new estimate or invoice
 *     description: Creates an estimate or invoice with items (services, materials, labor) for the given company
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - subtotal
 *               - grandTotal
 *               - due
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [Estimate, Invoice]
 *                 example: Estimate
 *               clientId:
 *                 type: integer
 *                 nullable: true
 *                 example: 12
 *               vehicleId:
 *                 type: integer
 *                 nullable: true
 *                 example: 5
 *               columnId:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *               subtotal:
 *                 type: number
 *                 example: 150.00
 *               discount:
 *                 type: number
 *                 example: 10.00
 *               tax:
 *                 type: number
 *                 example: 12.50
 *               serviceFee:
 *                 type: number
 *                 example: 5.00
 *               grandTotal:
 *                 type: number
 *                 example: 157.50
 *               deposit:
 *                 type: number
 *                 example: 50.00
 *               due:
 *                 type: number
 *                 example: 107.50
 *               internalNotes:
 *                 type: string
 *                 example: "Check engine light issue"
 *               terms:
 *                 type: string
 *                 example: "Payment due on delivery"
 *               policy:
 *                 type: string
 *               customerNotes:
 *                 type: string
 *               customerComments:
 *                 type: string
 *               damageNotes:
 *                 type: string
 *                 nullable: true
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     serviceId:
 *                       type: integer
 *                       nullable: true
 *                       example: 3
 *                     serviceDesc:
 *                       type: string
 *                     labor:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         name:
 *                           type: string
 *                         hours:
 *                           type: number
 *                         charge:
 *                           type: number
 *                         discount:
 *                           type: number
 *                         categoryId:
 *                           type: integer
 *                         notes:
 *                           type: string
 *                     materials:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           quantity:
 *                             type: number
 *                           cost:
 *                             type: number
 *                           sell:
 *                             type: number
 *                           discount:
 *                             type: number
 *                           vendorId:
 *                             type: integer
 *                           categoryId:
 *                             type: integer
 *                           productId:
 *                             type: integer
 *                           notes:
 *                             type: string
 *                     tagIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *               photos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     photo:
 *                       type: string
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     task:
 *                       type: string
 *               inspections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     driver:
 *                       type: boolean
 *                     passenger:
 *                       type: boolean
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Estimate/invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Estimate created successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid input or company ID
 *       500:
 *         description: Internal server error
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
    const searchTerm = searchParams.get("searchTerm") || undefined;
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
      const matches = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT i.id
        FROM "Invoice" i
        LEFT JOIN "Client" c ON i."customer_id" = c.id
        LEFT JOIN "Vehicle" v ON i."vehicle_id" = v.id
        LEFT JOIN "Column" col ON i."column_id" = col.id
        WHERE i."company_id" = ${companyId}
          AND (
            i.id::text ILIKE ${searchPattern}
            OR LOWER(CONCAT(c."first_name", ' ', c."last_name")) ILIKE LOWER(${searchPattern})
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

export async function POST(
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
          },
        });
      }

      await tx.invoice.update({
        where: { id: newInvoice.id },
        data: { serviceIndex: JSON.stringify(serviceIndex) },
      });

      return newInvoice;
    });

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
