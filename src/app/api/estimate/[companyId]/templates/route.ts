import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customAlphabet } from "nanoid";
import { buildWordSearchAnd } from "@/lib/wordSearch";

/**
 * @swagger
 * /api/estimate/{companyId}/templates:
 *   get:
 *     summary: List invoice templates for a company
 *     description: Returns paginated invoice templates scoped to the given company, with optional filters by search term, date range, and pipeline column.
 *     tags:
 *       - Templates
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
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
 *         description: Records per page (default 10, max 100)
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *           example: "Oil Change"
 *         description: Search by template title or template ID (case-insensitive)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           example: "2025-01-01"
 *         description: Filter templates created from this date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           example: "2025-12-31"
 *         description: Filter templates created up to this date (ISO format)
 *       - in: query
 *         name: columnId
 *         schema:
 *           type: integer
 *           example: 3
 *         description: Filter by pipeline column ID
 *     responses:
 *       200:
 *         description: Templates fetched successfully
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
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       subtotal:
 *                         type: number
 *                       discount:
 *                         type: number
 *                       tax:
 *                         type: number
 *                       serviceFee:
 *                         type: number
 *                       grandTotal:
 *                         type: number
 *                       internalNotes:
 *                         type: string
 *                         nullable: true
 *                       customerNotes:
 *                         type: string
 *                         nullable: true
 *                       damageNotes:
 *                         type: string
 *                         nullable: true
 *                       columnId:
 *                         type: integer
 *                         nullable: true
 *                       column:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
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
 *     summary: Create a new invoice template
 *     description: Creates an invoice template with items (services, materials, labor), photos, tasks, and inspections for the given company.
 *     tags:
 *       - Templates
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
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Full Service Package"
 *               columnId:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *                 description: Pipeline column ID. Defaults to the "Pending" column if omitted.
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
 *               internalNotes:
 *                 type: string
 *                 example: "Internal note for staff"
 *               customerNotes:
 *                 type: string
 *                 example: "Thank you for your business"
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
 *                           nullable: true
 *                         notes:
 *                           type: string
 *                           nullable: true
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
 *                             nullable: true
 *                           categoryId:
 *                             type: integer
 *                             nullable: true
 *                           productId:
 *                             type: integer
 *                             nullable: true
 *                           notes:
 *                             type: string
 *                             nullable: true
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
 *                       example: "https://example.com/photo.jpg"
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     task:
 *                       type: string
 *                       example: "Inspect brakes: Check all four wheels"
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
 *                       nullable: true
 *     responses:
 *       201:
 *         description: Template created successfully
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
 *                   example: Template created successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid company ID or missing required fields
 *       404:
 *         description: Company not found
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

    const searchAnd = buildWordSearchAnd(searchTerm, ["title", "id"]);
    if (searchAnd) {
      where.AND = searchAnd;
    }

    const [templates, total] = await Promise.all([
      db.invoiceTemplate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(searchTerm ? {} : { skip, take: limit }),
        select: {
          id: true,
          title: true,
          subtotal: true,
          discount: true,
          tax: true,
          serviceFee: true,
          grandTotal: true,
          internalNotes: true,
          customerNotes: true,
          damageNotes: true,
          columnId: true,
          column: {
            select: { id: true, title: true, bgColor: true, textColor: true },
          },
          tags: {
            include: { tag: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.invoiceTemplate.count({ where }),
    ]);

    // Flatten tags
    const data = templates.map((t) => ({
      ...t,
      tags: t.tags.map((tt: any) => tt.tag),
    }));

    return NextResponse.json({
      success: true,
      data,
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
            hasMore: skip + templates.length < total,
          },
    });
  } catch (error) {
    console.error("TEMPLATE LIST ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch templates" },
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
      title,
      columnId,
      subtotal = 0,
      discount = 0,
      tax = 0,
      serviceFee = 0,
      grandTotal = 0,
      internalNotes = "",
      customerNotes = null,
      damageNotes = null,
      items = [],
      photos = [],
      tasks = [],
      inspections = [],
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "title is required" },
        { status: 400 },
      );
    }

    // Resolve column
    let finalColumnId = columnId ? Number(columnId) : undefined;
    if (!finalColumnId) {
      const defaultColumn = await db.column.findFirst({
        where: { companyId, title: "Pending", type: "shop" },
        select: { id: true },
      });
      if (defaultColumn) {
        finalColumnId = defaultColumn.id;
      }
    }

    const template = await db.$transaction(async (tx) => {
      const newTemplate = await tx.invoiceTemplate.create({
        data: {
          id: customAlphabet("1234567890", 10)(),
          title: title.trim(),
          companyId,
          columnId: finalColumnId ?? null,
          subtotal,
          discount,
          tax,
          serviceFee,
          grandTotal,
          internalNotes,
          customerNotes,
          damageNotes,
        },
      });

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
            invoiceTemplateId: newTemplate.id,
            title: ins.title ?? "",
            driver: ins.driver ?? false,
            passenger: ins.passenger ?? false,
            notes: ins.notes ?? null,
          })),
        });
      }

      // Photos
      if (photos.length > 0) {
        await tx.templatePhoto.createMany({
          data: (photos as any[]).map((p: any) => ({
            invoiceTemplateId: newTemplate.id,
            photo: p.photo ?? "",
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

          // Labor tags
          if ((item.labor.tagIds ?? []).length > 0) {
            await tx.laborTag.createMany({
              data: (item.labor.tagIds as number[]).map((tagId) => ({
                laborId: newLabor.id,
                tagId,
              })),
            });
          }

          laborId = newLabor.id;
        }

        const invoiceItem = await tx.invoiceItem.create({
          data: {
            invoiceTemplateId: newTemplate.id,
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
              invoiceTemplateId: newTemplate.id,
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

      for (const t of tasks as any[]) {
        if (!t?.task) continue;
        const parts = (t.task as string).split(":");
        await tx.invoiceTemplateTask.create({
          data: {
            title: parts[0].trim(),
            description: parts.length > 1 ? parts[1].trim() : "",
            invoiceTemplateId: newTemplate.id,
            companyId,
          },
        });
      }

      // Store service order index
      await tx.invoiceTemplate.update({
        where: { id: newTemplate.id },
        data: { serviceIndex: JSON.stringify(serviceIndex) },
      });

      return newTemplate;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Template created successfully",
        data: template,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("TEMPLATE CREATE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create template",
      },
      { status: 500 },
    );
  }
}
