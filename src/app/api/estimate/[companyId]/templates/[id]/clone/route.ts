import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/estimate/{companyId}/templates/{id}/clone:
 *   post:
 *     summary: Clone an invoice template
 *     description: Creates a full copy of an existing template including all invoice items (services, materials, labor, item/material/labor tags), photos, tasks, and inspections. The cloned template's title is prefixed with "Copy of". Validates that the source template belongs to the given company.
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
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "clxyz123abc"
 *         description: Source template ID to clone (cuid)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "My Custom Clone Name"
 *                 description: Optional custom title for the cloned template. Defaults to "Copy of {original title}".
 *     responses:
 *       201:
 *         description: Template cloned successfully
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
 *                   example: Template cloned successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID of the newly created clone
 *                     title:
 *                       type: string
 *                     companyId:
 *                       type: integer
 *                     columnId:
 *                       type: integer
 *                       nullable: true
 *                     subtotal:
 *                       type: number
 *                     discount:
 *                       type: number
 *                     tax:
 *                       type: number
 *                     serviceFee:
 *                       type: number
 *                     grandTotal:
 *                       type: number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid company ID
 *       404:
 *         description: Source template not found or does not belong to this company
 *       500:
 *         description: Internal server error
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId: companyIdParam, id } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

    // Load source template with all relations
    const source = await db.invoiceTemplate.findFirst({
      where: { id, companyId },
      include: {
        invoiceItems: {
          include: {
            labor: {
              include: { tags: { include: { tag: true } } },
            },
            materials: {
              include: { tags: { include: { tag: true } } },
            },
            tags: { include: { tag: true } },
          },
        },
        templatePhotos: true,
        tasks: true,
        Inspections: true,
      },
    });

    if (!source) {
      return NextResponse.json(
        { success: false, message: "Template not found" },
        { status: 404 },
      );
    }

    // Optional custom title from body (non-blocking if body absent)
    let customTitle: string | undefined;
    try {
      const body = await req.json();
      if (body?.title && typeof body.title === "string" && body.title.trim()) {
        customTitle = body.title.trim();
      }
    } catch {
      // no body provided — use default title
    }

    const cloneTitle = customTitle ?? `Copy of ${source.title}`;

    const clone = await db.$transaction(
      async (tx) => {
        // Create the cloned template
        const newTemplate = await tx.invoiceTemplate.create({
          data: {
            title: cloneTitle,
            companyId,
            columnId: source.columnId,
            subtotal: source.subtotal ?? 0,
            discount: source.discount ?? 0,
            tax: source.tax ?? 0,
            serviceFee: source.serviceFee ?? 0,
            grandTotal: source.grandTotal ?? 0,
            internalNotes: source.internalNotes ?? "",
            customerNotes: source.customerNotes ?? null,
            damageNotes: source.damageNotes ?? null,
          },
        });

        // Clone photos
        if (source.templatePhotos.length > 0) {
          await tx.templatePhoto.createMany({
            data: source.templatePhotos.map((p) => ({
              invoiceTemplateId: newTemplate.id,
              photo: p.photo,
            })),
          });
        }

        // Clone inspections
        const validInspections = source.Inspections.filter(
          (ins) =>
            ins.title?.toString().trim() ||
            ins.driver ||
            ins.passenger ||
            ins.notes?.toString().trim(),
        );
        if (validInspections.length > 0) {
          await tx.invoiceInspection.createMany({
            data: validInspections.map((ins) => ({
              invoiceTemplateId: newTemplate.id,
              title: ins.title ?? "",
              driver: ins.driver ?? false,
              passenger: ins.passenger ?? false,
              notes: ins.notes ?? null,
            })),
          });
        }

        // Clone task blueprints (template DATA — never real tasks)
        if (source.tasks.length > 0) {
          await tx.invoiceTemplateTask.createMany({
            data: source.tasks.map((t) => ({
              title: t.title,
              description: t.description ?? "",
              invoiceTemplateId: newTemplate.id,
              companyId,
              priority: t.priority ?? "Medium",
            })),
          });
        }

        // Clone items with labor, materials, and tags
        const serviceIndex: (number | null)[] = [];

        for (const item of source.invoiceItems) {
          serviceIndex.push(item.serviceId ?? null);

          // Clone labor
          let newLaborId: number | undefined;
          if (item.labor) {
            const newLabor = await tx.labor.create({
              data: {
                name: item.labor.name,
                categoryId: item.labor.categoryId ?? undefined,
                notes: item.labor.notes ?? undefined,
                hours: item.labor.hours,
                charge: item.labor.charge,
                discount: item.labor.discount,
                companyId,
              },
            });

            // Clone labor tags
            const laborTagIds = item.labor.tags
              .map((t: any) =>
                typeof t === "object" && "tagId" in t ? t.tagId : t?.tag?.id,
              )
              .filter(Boolean);

            if (laborTagIds.length > 0) {
              await tx.laborTag.createMany({
                data: laborTagIds.map((tagId: number) => ({
                  laborId: newLabor.id,
                  tagId,
                })),
              });
            }

            newLaborId = newLabor.id;
          }

          // Clone invoice item
          const newItem = await tx.invoiceItem.create({
            data: {
              invoiceTemplateId: newTemplate.id,
              serviceId: item.serviceId ?? undefined,
              laborId: newLaborId,
              serviceDesc: item.serviceDesc ?? undefined,
            },
          });

          // Clone materials
          for (const mat of item.materials) {
            const newMat = await tx.material.create({
              data: {
                name: mat.name,
                vendorId: mat.vendorId ?? undefined,
                categoryId: mat.categoryId ?? undefined,
                notes: mat.notes ?? undefined,
                quantity: mat.quantity,
                cost: mat.cost,
                sell: mat.sell,
                discount: mat.discount,
                invoiceTemplateId: newTemplate.id,
                companyId,
                invoiceItemId: newItem.id,
                productId: mat.productId ?? undefined,
              },
            });

            // Clone material tags
            const matTagIds = mat.tags
              .map((t: any) =>
                typeof t === "object" && "tagId" in t ? t.tagId : t?.tag?.id,
              )
              .filter(Boolean);

            if (matTagIds.length > 0) {
              await tx.materialTag.createMany({
                data: matTagIds.map((tagId: number) => ({
                  materialId: newMat.id,
                  tagId,
                })),
              });
            }
          }

          // Clone item tags
          const itemTagIds = item.tags
            .map((t: any) =>
              typeof t === "object" && "tagId" in t ? t.tagId : t?.tag?.id,
            )
            .filter(Boolean);

          if (itemTagIds.length > 0) {
            await tx.itemTag.createMany({
              data: itemTagIds.map((tagId: number) => ({
                itemId: newItem.id,
                tagId,
              })),
            });
          }
        }

        // Store service order index
        await tx.invoiceTemplate.update({
          where: { id: newTemplate.id },
          data: { serviceIndex: JSON.stringify(serviceIndex) },
        });

        return newTemplate;
      },
      { maxWait: 20000, timeout: 20000 },
    );

    return NextResponse.json(
      {
        success: true,
        message: "Template cloned successfully",
        data: clone,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("TEMPLATE CLONE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to clone template",
      },
      { status: 500 },
    );
  }
}
