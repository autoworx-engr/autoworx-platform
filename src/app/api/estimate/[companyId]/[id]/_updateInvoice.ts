import { db } from "@/lib/db";
import { InvoiceType } from "@prisma/client";

export async function fullUpdateInvoice(
  id: string,
  companyId: number,
  body: any,
  actingUserId: number | null = null,
): Promise<{ success: boolean; message: string; data?: any; status: number }> {
  const {
    clientId,
    vehicleId,
    columnId,
    type: bodyType,
    subtotal = 0,
    discount = 0,
    tax = 0,
    serviceFee = 0,
    vehicleExtraCost = 0,
    grandTotal = 0,
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
  } = body;

  const [invoice, column] = await Promise.all([
    db.invoice.findFirst({
      where: { id, companyId },
      include: { column: { select: { title: true } } },
    }),
    columnId
      ? db.column.findFirst({ where: { id: Number(columnId), companyId } })
      : Promise.resolve(null),
  ]);

  if (!invoice) {
    return { success: false, message: "Estimate not found", status: 404 };
  }
  if (columnId && !column) {
    return {
      success: false,
      message: "Column not found for this company",
      status: 400,
    };
  }

  let resolvedType: InvoiceType = (bodyType ?? invoice.type) as InvoiceType;
  let isWorkOrder = invoice.isWorkOrder;
  let deliveredAt = invoice.deliveredAt;
  let completedAt = invoice.completedAt;

  if (column) {
    if (column.title === "In Progress") {
      resolvedType = "Invoice";
      isWorkOrder = true;
      deliveredAt = null;
    } else if (column.title === "Delivered" && !deliveredAt) {
      deliveredAt = new Date();
    } else if (column.title === "Completed" && !completedAt) {
      completedAt = new Date();
    }
  }

  const totalCost = (items as any[]).reduce((acc: number, item: any) => {
    const matCost = (item.materials ?? []).reduce(
      (m: number, mat: any) =>
        m + Number(mat?.cost ?? 0) * Number(mat?.quantity ?? 0),
      0,
    );
    return (
      acc +
      matCost +
      Number(item.labor?.charge ?? 0) * Number(item.labor?.hours ?? 0)
    );
  }, 0);

  const updated = await db.$transaction(
    async (tx) => {
      // Photos: upsert by id, delete removed
      const keptPhotoIds: number[] = [];
      for (const p of photos as any[]) {
        if (p.id) {
          keptPhotoIds.push(Number(p.id));
        } else if (p.photo) {
          const created = await tx.invoicePhoto.create({
            data: { invoiceId: id, photo: p.photo },
          });
          keptPhotoIds.push(created.id);
        }
      }
      await tx.invoicePhoto.deleteMany({
        where: { invoiceId: id, id: { notIn: keptPhotoIds } },
      });

      // Inspections: full replace
      await tx.invoiceInspection.deleteMany({ where: { invoiceId: id } });
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
            invoiceId: id,
            title: ins.title ?? "",
            driver: ins.driver ?? false,
            passenger: ins.passenger ?? false,
            notes: ins.notes ?? null,
          })),
        });
      }

      // Items: upsert by id
      const keptItemIds: number[] = [];
      const serviceIndex: (number | null)[] = [];

      for (const item of items as any[]) {
        serviceIndex.push(item.serviceId ?? null);

        if (item.id && Number(item.id)) {
          const existingItem = await tx.invoiceItem.findFirst({
            where: { id: Number(item.id), invoiceId: id },
            include: { labor: true },
          });

          if (existingItem) {
            let laborId: number | null = existingItem.laborId ?? null;
            if (item.labor) {
              const laborData = {
                name: item.labor.name ?? "",
                categoryId: item.labor.categoryId ?? undefined,
                notes: item.labor.notes ?? undefined,
                hours: Number(item.labor.hours ?? 0),
                charge: Number(item.labor.charge ?? 0),
                discount: Number(item.labor.discount ?? 0),
                companyId,
              };
              if (laborId) {
                await tx.labor.update({
                  where: { id: laborId },
                  data: laborData,
                });
              } else {
                const newLabor = await tx.labor.create({ data: laborData });
                laborId = newLabor.id;
              }
            } else if (item.labor === null && laborId) {
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
                laborId,
                serviceDesc: item.serviceDesc ?? undefined,
              },
            });

            // Materials upsert
            const keptMatIds: number[] = [];
            for (const mat of item.materials ?? []) {
              if (!mat?.name) continue;
              if (Number(mat.quantity ?? 0) <= 0)
                throw new Error("Material quantity must be greater than 0");
              const matData = {
                name: mat.name,
                vendorId: mat.vendorId ?? undefined,
                categoryId: mat.categoryId ?? undefined,
                notes: mat.notes ?? undefined,
                quantity: Number(mat.quantity),
                cost: Number(mat.cost ?? 0),
                sell: Number(mat.sell ?? 0),
                discount: Number(mat.discount ?? 0),
                invoiceId: id,
                companyId,
                invoiceItemId: existingItem.id,
                productId: mat.productId ?? undefined,
              };
              if (mat.id) {
                const existingMat = await tx.material.findFirst({
                  where: { id: Number(mat.id), invoiceItemId: existingItem.id },
                });
                if (existingMat) {
                  await tx.material.update({
                    where: { id: existingMat.id },
                    data: matData,
                  });
                  keptMatIds.push(existingMat.id);
                  // Sync material tags
                  await tx.materialTag.deleteMany({
                    where: { materialId: existingMat.id },
                  });
                  if ((mat.tagIds ?? []).length > 0) {
                    await tx.materialTag.createMany({
                      data: (mat.tagIds as number[]).map((tagId) => ({
                        materialId: existingMat.id,
                        tagId,
                      })),
                    });
                  }
                } else {
                  const newMat = await tx.material.create({ data: matData });
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
              } else {
                const newMat = await tx.material.create({ data: matData });
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
                id: { notIn: keptMatIds },
              },
            });

            // Sync item tags
            const tagIds = (item.tagIds ?? []) as number[];
            if (tagIds.length > 0) {
              await tx.itemTag.createMany({
                data: tagIds.map((tagId) => ({
                  itemId: existingItem.id,
                  tagId,
                })),
                skipDuplicates: true,
              });
            }
            await tx.itemTag.deleteMany({
              where: { itemId: existingItem.id, tagId: { notIn: tagIds } },
            });

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

          const newItem = await tx.invoiceItem.create({
            data: {
              invoiceId: id,
              serviceId: item.serviceId ?? undefined,
              laborId,
              serviceDesc: item.serviceDesc ?? undefined,
            },
          });

          for (const mat of item.materials ?? []) {
            if (!mat?.name) continue;
            if (Number(mat.quantity ?? 0) <= 0)
              throw new Error("Material quantity must be greater than 0");
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
                invoiceId: id,
                companyId,
                invoiceItemId: newItem.id,
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
                itemId: newItem.id,
                tagId,
              })),
            });
          }

          keptItemIds.push(newItem.id);
        }
      }

      // Delete removed items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id, id: { notIn: keptItemIds } },
      });

      return tx.invoice.update({
        where: { id },
        data: {
          clientId:
            clientId !== undefined
              ? clientId
                ? Number(clientId)
                : null
              : undefined,
          vehicleId:
            vehicleId !== undefined
              ? vehicleId
                ? Number(vehicleId)
                : null
              : undefined,
          columnId:
            columnId !== undefined
              ? columnId
                ? Number(columnId)
                : null
              : undefined,
          subtotal: Number(subtotal),
          discount: Number(discount),
          tax: Number(tax),
          serviceFee: Number(serviceFee),
          vehicleExtraCost: Number(vehicleExtraCost),
          grandTotal: Number(grandTotal),
          due: Number(due),
          internalNotes,
          terms,
          policy,
          customerNotes,
          customerComments,
          damageNotes,
          type: resolvedType,
          isWorkOrder,
          workOrderCreatedAt:
            (invoice.workOrderCreatedAt ?? isWorkOrder) ? new Date() : null,
          convertedAt: new Date(),
          deliveredAt,
          completedAt,
          isViewed: false,
          profit: Number(grandTotal) - totalCost,
          serviceIndex: JSON.stringify(serviceIndex),
        },
      });
    },
    { maxWait: 20000, timeout: 20000 },
  );

  // Tasks outside transaction (same as updateInvoice action)
  const keptTaskIds: number[] = [];
  for (const t of tasks as any[]) {
    if (!t?.task) continue;
    const parts = (t.task as string).split(":");
    const title = parts[0].trim();
    const description = parts.length > 1 ? parts[1].trim() : "";
    if (t.id) {
      const upd = await db.task.update({
        where: { id: Number(t.id) },
        data: { title, description },
      });
      keptTaskIds.push(upd.id);
    } else {
      // `userId`/`createdBy` mirror the web update action. Task & Activity
      // scopes to creator-or-assignee, so an ownerless task never shows up.
      const created = await db.task.create({
        data: {
          title,
          description,
          invoiceId: id,
          companyId,
          clientId: clientId ? Number(clientId) : undefined,
          priority: "Medium",
          userId: actingUserId,
          createdBy: "user",
        },
      });
      keptTaskIds.push(created.id);
    }
  }
  await db.task.deleteMany({
    where: { invoiceId: id, id: { notIn: keptTaskIds } },
  });

  return {
    success: true,
    message: "Estimate updated successfully",
    data: updated,
    status: 200,
  };
}
