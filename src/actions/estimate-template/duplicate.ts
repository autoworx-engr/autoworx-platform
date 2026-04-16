"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { customAlphabet } from "nanoid";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

type TDuplicateEstimateTemplateProps = {
  templateId: string;
};

async function generateDuplicateTitle(
  companyId: number,
  originalTitle: string,
) {
  const existing = await db.invoiceTemplate.findMany({
    where: {
      companyId,
      title: {
        startsWith: originalTitle,
      },
    },
    select: { title: true },
  });

  const numbers = existing
    .map((t) => {
      const match = t.title.match(/\((\d+)\)$/);
      return match ? Number(match[1]) : null;
    })
    .filter(Boolean) as number[];

  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `${originalTitle} (${next})`;
}

export async function duplicateEstimateTemplate({
  templateId,
}: TDuplicateEstimateTemplateProps): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Unauthorized");
    }

    // 1️⃣ Load full template
    const template = await db.invoiceTemplate.findUnique({
      where: { id: templateId },
      include: {
        templatePhotos: true,
        Inspections: true,
        invoiceItems: {
          include: {
            labor: { include: { tags: true } },
            materials: { include: { tags: true } },
            tags: true,
            service: true,
          },
        },
        tasks: true,
      },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    // 2️⃣ Generate new ID & title
    const newTemplateId = customAlphabet("1234567890", 10)();
    const newTitle = await generateDuplicateTitle(companyId, template.title);

    // 3️⃣ Transaction
    const newTemplate = await db.$transaction(async (db) => {
      const createdTemplate = await db.invoiceTemplate.create({
        data: {
          id: newTemplateId,
          title: newTitle,
          subtotal: template.subtotal,
          discount: template.discount,
          tax: template.tax,
          serviceFee: template.serviceFee,
          grandTotal: template.grandTotal,
          internalNotes: template.internalNotes,
          damageNotes: template.damageNotes,
          customerNotes: template.customerNotes,
          companyId,
          columnId: template.columnId,
        },
      });

      // 4️⃣ Duplicate inspections
      await Promise.all(
        template.Inspections.map((i) =>
          db.invoiceInspection.create({
            data: {
              invoiceTemplateId: createdTemplate.id,
              title: i.title,
              driver: i.driver,
              passenger: i.passenger,
              notes: i.notes,
            },
          }),
        ),
      );

      // 5️⃣ Duplicate photos
      await Promise.all(
        template.templatePhotos.map((p) =>
          db.templatePhoto.create({
            data: {
              invoiceTemplateId: createdTemplate.id,
              photo: p.photo,
            },
          }),
        ),
      );

      // 6️⃣ Duplicate items
      const serviceIndex: number[] = [];

      for (const item of template.invoiceItems) {
        let laborId: number | undefined;

        if (item.labor) {
          const newLabor = await db.labor.create({
            data: {
              name: item.labor.name,
              categoryId: item.labor.categoryId,
              notes: item.labor.notes,
              hours: item.labor.hours, // ⬅️ চাইলে +1 করতে পারো
              charge: item.labor.charge,
              discount: item.labor.discount,
              companyId,
            },
          });

          await Promise.all(
            item.labor.tags.map((t) =>
              db.laborTag.create({
                data: {
                  laborId: newLabor.id,
                  tagId: t.tagId,
                },
              }),
            ),
          );

          laborId = newLabor.id;
        }

        const invoiceItem = await db.invoiceItem.create({
          data: {
            invoiceTemplateId: createdTemplate.id,
            serviceId: item.serviceId,
            laborId,
            serviceDesc: item.serviceDesc,
          },
        });

        serviceIndex.push(item.serviceId ?? 0);

        // Materials
        await Promise.all(
          item.materials.map((m) =>
            db.material.create({
              data: {
                name: m.name,
                vendorId: m.vendorId,
                categoryId: m.categoryId,
                notes: m.notes,
                quantity: m.quantity, // 🔥 quantity increment
                cost: m.cost,
                sell: m.sell,
                discount: m.discount,
                invoiceTemplateId: createdTemplate.id,
                invoiceItemId: invoiceItem.id,
                companyId,
                productId: m.productId,
              },
            }),
          ),
        );

        // Item tags
        await Promise.all(
          item.tags.map((t) =>
            db.itemTag.create({
              data: {
                itemId: invoiceItem.id,
                tagId: t.tagId,
              },
            }),
          ),
        );
      }

      await db.invoiceTemplate.update({
        where: { id: createdTemplate.id },
        data: {
          serviceIndex: JSON.stringify(serviceIndex),
        },
      });

      return createdTemplate;
    });

    revalidatePath("/estimate/templates");

    return {
      type: "success",
      data: newTemplate,
    };
  } catch (err) {
    return errorHandler(err);
  }
}
