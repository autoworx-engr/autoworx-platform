// app/api/template/[id]/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/template/{id}:
 *   get:
 *     summary: Get invoice template by ID
 *     tags: [Template]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice template with items
 *       404:
 *         description: Template not found
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    // Fetch main template
    const estimateTemplate = await db.invoiceTemplate.findUnique({
      where: { id },
      include: { column: true },
    });

    if (!estimateTemplate) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 },
      );
    }

    // Fetch items with full relations
    let items = await db.invoiceItem.findMany({
      where: { invoiceTemplateId: estimateTemplate.id },
      include: {
        service: {
          include: {
            Technician: true,
          },
        },
        materials: {
          include: {
            tags: {
              include: { tag: true },
            },
          },
        },
        labor: {
          include: {
            tags: {
              include: { tag: true },
            },
          },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    const completedServices: string[] = [];
    const incompleteServices: string[] = [];

    // Process items (convert tags + check completed services)
    items = items.map((item: any) => {
      // Normalize tags
      item.tags = item.tags?.map((t: any) => t.tag);

      // Normalize material tags
      item.materials = item.materials?.map((material: any) => {
        material.tags = material.tags?.map((t: any) => t.tag);
        return material;
      });

      // Normalize labor tags
      item.labor = item.labor
        ? {
            ...item.labor,
            tags: item.labor.tags?.map((t: any) => t.tag),
          }
        : null;

      // Technician status checking
      const technicians =
        item.service?.Technician?.filter(
          (tech: any) => tech.invoiceId === estimateTemplate.id,
        ) || [];

      if (technicians.length) {
        const statuses = technicians.map((t: any) =>
          t.status?.toLowerCase().trim(),
        );

        const isServiceComplete = statuses.every(
          (s: string) => s === "complete",
        );

        if (isServiceComplete) {
          completedServices.push(item.service?.name ?? "");
        } else {
          incompleteServices.push(item.service?.name ?? "");
        }
      }

      return item;
    });

    // Sort by serviceIndex
    const serviceIndex =
      typeof estimateTemplate.serviceIndex === "string"
        ? JSON.parse(estimateTemplate.serviceIndex)
        : (estimateTemplate.serviceIndex ?? []);

    if (Array.isArray(serviceIndex) && serviceIndex.length > 0) {
      items.sort((a: any, b: any) => {
        const indexA = serviceIndex.indexOf(a.service?.id) ?? Infinity;
        const indexB = serviceIndex.indexOf(b.service?.id) ?? Infinity;
        return indexA - indexB;
      });
    }

    // Fetch photos
    const photos = await db.templatePhoto.findMany({
      where: { invoiceTemplateId: estimateTemplate.id },
    });

    // Fetch tasks
    const tasks = await db.task.findMany({
      where: { invoiceTemplateId: estimateTemplate.id },
    });

    // Fetch inspections
    const inspections = await db.invoiceInspection.findMany({
      where: { invoiceTemplateId: estimateTemplate.id },
      select: {
        title: true,
        driver: true,
        passenger: true,
        notes: true,
      },
    });

    // Final Response
    return NextResponse.json({
      template: estimateTemplate,
      items,
      photos,
      tasks,
      inspections,
      completedServices,
      incompleteServices,
    });
  } catch (error: any) {
    console.error("[TEMPLATE_API_ERROR]", error);
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 },
    );
  }
}
