import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/estimate/{companyId}/templates/{id}:
 *   get:
 *     summary: Get a single invoice template by ID
 *     description: Returns the full template detail including invoice items (with services, materials, labor, tags), photos, tasks, and inspections. Validates that the template belongs to the given company.
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
 *         description: Template ID (cuid)
 *     responses:
 *       200:
 *         description: Template fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     template:
 *                       type: object
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                     photos:
 *                       type: array
 *                       items:
 *                         type: object
 *                     tasks:
 *                       type: array
 *                       items:
 *                         type: object
 *                     inspections:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid company ID
 *       404:
 *         description: Template not found or does not belong to this company
 *       500:
 *         description: Internal server error
 *
 *   patch:
 *     summary: Update an invoice template
 *     description: Partially updates a template's fields and optionally replaces its items, photos, tasks, and inspections. When items/photos/tasks/inspections are provided in the body they fully replace the existing set.
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
 *         description: Template ID (cuid)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               columnId:
 *                 type: integer
 *                 nullable: true
 *               subtotal:
 *                 type: number
 *               discount:
 *                 type: number
 *               tax:
 *                 type: number
 *               serviceFee:
 *                 type: number
 *               grandTotal:
 *                 type: number
 *               internalNotes:
 *                 type: string
 *               customerNotes:
 *                 type: string
 *                 nullable: true
 *               damageNotes:
 *                 type: string
 *                 nullable: true
 *               items:
 *                 type: array
 *                 description: Full replacement of items. Each item with an `id` is upserted; items without `id` are created; items not in this list are deleted.
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: Existing item ID to update. Omit to create a new item.
 *                     serviceId:
 *                       type: integer
 *                       nullable: true
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
 *                           id:
 *                             type: integer
 *                             description: Existing material ID to update
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
 *                 description: Photos with `id` are kept; photos without `id` are created; existing photos not in this list are deleted.
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     photo:
 *                       type: string
 *               tasks:
 *                 type: array
 *                 description: Tasks with `id` are updated; tasks without `id` are created; existing tasks not in this list are deleted.
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     task:
 *                       type: string
 *                       example: "Inspect brakes: Check all four wheels"
 *               inspections:
 *                 type: array
 *                 description: Fully replaces all existing inspections.
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
 *       200:
 *         description: Template updated successfully
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
 *                   example: Template updated successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid company ID or input
 *       404:
 *         description: Template not found or does not belong to this company
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete an invoice template
 *     description: Permanently deletes an invoice template and all its associated data (items, materials, photos, tasks, inspections) that belongs to the given company.
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
 *         description: Template ID (cuid)
 *     responses:
 *       200:
 *         description: Template deleted successfully
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
 *                   example: Template deleted successfully
 *       400:
 *         description: Invalid company ID
 *       404:
 *         description: Template not found or does not belong to this company
 *       500:
 *         description: Internal server error
 */

export async function GET(
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

    const template = await db.invoiceTemplate.findFirst({
      where: { id, companyId },
      include: {
        column: { select: { id: true, title: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Template not found" },
        { status: 404 },
      );
    }

    // Fetch items with full nested relations
    const rawItems = await db.invoiceItem.findMany({
      where: { invoiceTemplateId: id },
      include: {
        service: true,
        labor: {
          include: { tags: { include: { tag: true } } },
        },
        materials: {
          include: { tags: { include: { tag: true } } },
        },
        tags: { include: { tag: true } },
      },
    });

    // Flatten junction-table tags
    const items = rawItems.map((item: any) => ({
      ...item,
      tags: item.tags.map((t: any) => t.tag),
      materials: item.materials.map((mat: any) => ({
        ...mat,
        tags: mat.tags.map((t: any) => t.tag),
      })),
      labor: item.labor
        ? { ...item.labor, tags: item.labor.tags.map((t: any) => t.tag) }
        : null,
    }));

    // Sort by serviceIndex if present
    const serviceIndex =
      typeof template.serviceIndex === "string"
        ? JSON.parse(template.serviceIndex)
        : (template.serviceIndex ?? []);

    if (Array.isArray(serviceIndex) && serviceIndex.length > 0) {
      items.sort((a: any, b: any) => {
        const ia =
          serviceIndex.indexOf(a.serviceId) !== -1
            ? serviceIndex.indexOf(a.serviceId)
            : Infinity;
        const ib =
          serviceIndex.indexOf(b.serviceId) !== -1
            ? serviceIndex.indexOf(b.serviceId)
            : Infinity;
        return ia - ib;
      });
    }

    const [photos, tasks, inspections] = await Promise.all([
      db.templatePhoto.findMany({ where: { invoiceTemplateId: id } }),
      db.task.findMany({ where: { invoiceTemplateId: id } }),
      db.invoiceInspection.findMany({
        where: { invoiceTemplateId: id },
        select: {
          id: true,
          title: true,
          driver: true,
          passenger: true,
          notes: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        template: {
          ...template,
          tags: template.tags.map((t: any) => t.tag),
        },
        items,
        photos,
        tasks,
        inspections,
      },
    });
  } catch (error) {
    console.error("TEMPLATE GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch template" },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    const existing = await db.invoiceTemplate.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Template not found" },
        { status: 404 },
      );
    }

    const body = await req.json();

    const {
      title,
      columnId,
      subtotal,
      discount,
      tax,
      serviceFee,
      grandTotal,
      internalNotes,
      customerNotes,
      damageNotes,
      items,
      photos,
      tasks,
      inspections,
    } = body;

    // Validate columnId belongs to company if provided
    if (columnId !== undefined && columnId !== null) {
      const col = await db.column.findFirst({
        where: { id: Number(columnId), companyId },
      });
      if (!col) {
        return NextResponse.json(
          { success: false, message: "Column not found for this company" },
          { status: 400 },
        );
      }
    }

    const updated = await db.$transaction(
      async (tx) => {
        // --- Photos ---
        if (Array.isArray(photos)) {
          const keptPhotoIds: number[] = [];
          for (const p of photos as any[]) {
            if (p.id) {
              keptPhotoIds.push(Number(p.id));
            } else if (p.photo) {
              const created = await tx.templatePhoto.create({
                data: { invoiceTemplateId: id, photo: p.photo },
              });
              keptPhotoIds.push(created.id);
            }
          }
          await tx.templatePhoto.deleteMany({
            where: { invoiceTemplateId: id, id: { notIn: keptPhotoIds } },
          });
        }

        // --- Inspections (full replace) ---
        if (Array.isArray(inspections)) {
          await tx.invoiceInspection.deleteMany({
            where: { invoiceTemplateId: id },
          });
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
                invoiceTemplateId: id,
                title: ins.title ?? "",
                driver: ins.driver ?? false,
                passenger: ins.passenger ?? false,
                notes: ins.notes ?? null,
              })),
            });
          }
        }

        // --- Items (upsert + delete removed) ---
        const keptItemIds: number[] = [];
        const serviceIndex: (number | null)[] = [];

        if (Array.isArray(items)) {
          for (const item of items as any[]) {
            serviceIndex.push(item.serviceId ?? null);

            if (item.id && Number(item.id)) {
              // Existing item — update
              const existingItem = await tx.invoiceItem.findFirst({
                where: { id: Number(item.id), invoiceTemplateId: id },
                include: { labor: true },
              });

              if (existingItem) {
                // Labor upsert
                let laborId: number | null = existingItem.laborId ?? null;
                if (item.labor) {
                  if (laborId) {
                    await tx.labor.update({
                      where: { id: laborId },
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
                  } else {
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
                  }
                } else if (item.labor === null && laborId) {
                  // Remove labor
                  await tx.invoiceItem.update({
                    where: { id: existingItem.id },
                    data: { laborId: null },
                  });
                  await tx.labor.delete({ where: { id: laborId } });
                  laborId = null;
                }

                await tx.invoiceItem.update({
                  where: { id: existingItem.id },
                  data: {
                    serviceId: item.serviceId ?? null,
                    laborId: laborId ?? null,
                    serviceDesc: item.serviceDesc ?? undefined,
                  },
                });

                // Materials upsert
                const keptMatIds: number[] = [];
                for (const mat of item.materials ?? []) {
                  if (!mat?.name) continue;
                  if (Number(mat.quantity ?? 0) <= 0) {
                    throw new Error("Material quantity must be greater than 0");
                  }
                  if (mat.id) {
                    const updatedMat = await tx.material.update({
                      where: { id: Number(mat.id) },
                      data: {
                        name: mat.name,
                        vendorId: mat.vendorId ?? undefined,
                        categoryId: mat.categoryId ?? undefined,
                        notes: mat.notes ?? undefined,
                        quantity: Number(mat.quantity),
                        cost: Number(mat.cost ?? 0),
                        sell: Number(mat.sell ?? 0),
                        discount: Number(mat.discount ?? 0),
                        companyId,
                        productId: mat.productId ?? undefined,
                      },
                    });
                    keptMatIds.push(updatedMat.id);
                  } else {
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
                        invoiceTemplateId: id,
                        companyId,
                        invoiceItemId: existingItem.id,
                        productId: mat.productId ?? undefined,
                      },
                    });
                    keptMatIds.push(newMat.id);

                    if ((mat.tagIds ?? []).length > 0) {
                      await tx.materialTag.createMany({
                        data: (mat.tagIds as number[]).map((tagId) => ({
                          materialId: newMat.id,
                          tagId,
                        })),
                      });
                    }
                  }
                }
                await tx.material.deleteMany({
                  where: {
                    invoiceItemId: existingItem.id,
                    invoiceTemplateId: id,
                    id: { notIn: keptMatIds },
                  },
                });

                // Item tags (full replace)
                if (Array.isArray(item.tagIds)) {
                  await tx.itemTag.deleteMany({
                    where: { itemId: existingItem.id },
                  });
                  if (item.tagIds.length > 0) {
                    await tx.itemTag.createMany({
                      data: (item.tagIds as number[]).map((tagId) => ({
                        itemId: existingItem.id,
                        tagId,
                      })),
                    });
                  }
                }

                keptItemIds.push(existingItem.id);
              }
            } else {
              // New item
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
                  invoiceTemplateId: id,
                  serviceId: item.serviceId ?? undefined,
                  laborId,
                  serviceDesc: item.serviceDesc ?? undefined,
                },
              });

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
                    invoiceTemplateId: id,
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

              if ((item.tagIds ?? []).length > 0) {
                await tx.itemTag.createMany({
                  data: (item.tagIds as number[]).map((tagId: number) => ({
                    itemId: invoiceItem.id,
                    tagId,
                  })),
                });
              }

              keptItemIds.push(invoiceItem.id);
            }
          }

          // Delete removed items
          await tx.invoiceItem.deleteMany({
            where: { invoiceTemplateId: id, id: { notIn: keptItemIds } },
          });
        }

        // --- Tasks (upsert + delete removed) ---
        const keptTaskIds: number[] = [];
        if (Array.isArray(tasks)) {
          for (const t of tasks as any[]) {
            if (!t?.task) continue;
            const parts = (t.task as string).split(":");
            const taskTitle = parts[0].trim();
            const taskDesc = parts.length > 1 ? parts[1].trim() : "";

            if (t.id) {
              const updatedTask = await tx.task.update({
                where: { id: Number(t.id) },
                data: { title: taskTitle, description: taskDesc },
              });
              keptTaskIds.push(updatedTask.id);
            } else {
              const newTask = await tx.task.create({
                data: {
                  title: taskTitle,
                  description: taskDesc,
                  invoiceTemplateId: id,
                  companyId,
                  priority: "Medium",
                },
              });
              keptTaskIds.push(newTask.id);
            }
          }
          await tx.task.deleteMany({
            where: { invoiceTemplateId: id, id: { notIn: keptTaskIds } },
          });
        }

        // --- Update template fields ---
        const templateUpdate: Record<string, any> = {};
        if (title !== undefined) templateUpdate.title = title;
        if (columnId !== undefined)
          templateUpdate.columnId = columnId ? Number(columnId) : null;
        if (subtotal !== undefined) templateUpdate.subtotal = Number(subtotal);
        if (discount !== undefined) templateUpdate.discount = Number(discount);
        if (tax !== undefined) templateUpdate.tax = Number(tax);
        if (serviceFee !== undefined)
          templateUpdate.serviceFee = Number(serviceFee);
        if (grandTotal !== undefined)
          templateUpdate.grandTotal = Number(grandTotal);
        if (internalNotes !== undefined)
          templateUpdate.internalNotes = internalNotes;
        if (customerNotes !== undefined)
          templateUpdate.customerNotes = customerNotes;
        if (damageNotes !== undefined) templateUpdate.damageNotes = damageNotes;
        if (Array.isArray(items)) {
          templateUpdate.serviceIndex = JSON.stringify(serviceIndex);
        }

        return tx.invoiceTemplate.update({
          where: { id },
          data: templateUpdate,
        });
      },
      { maxWait: 20000, timeout: 20000 },
    );

    return NextResponse.json({
      success: true,
      message: "Template updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("TEMPLATE UPDATE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update template",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const existing = await db.invoiceTemplate.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Template not found" },
        { status: 404 },
      );
    }

    await db.$transaction(async (tx) => {
      await tx.templatePhoto.deleteMany({ where: { invoiceTemplateId: id } });
      await tx.invoiceInspection.deleteMany({
        where: { invoiceTemplateId: id },
      });
      await tx.invoiceTags.deleteMany({ where: { invoiceTemplateId: id } });
      await tx.task.deleteMany({ where: { invoiceTemplateId: id } });
      await tx.material.deleteMany({ where: { invoiceTemplateId: id } });
      await tx.invoiceItem.deleteMany({ where: { invoiceTemplateId: id } });
      await tx.invoiceTemplate.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("TEMPLATE DELETE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete template" },
      { status: 500 },
    );
  }
}
