import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/clone-playbooks:
 *   post:
 *     summary: Clone all service playbooks from one company to another
 *     tags:
 *       - Service Playbooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sourceCompanyId:
 *                 type: number
 *                 example: 4
 *               targetCompanyId:
 *                 type: number
 *                 example: 10
 *     responses:
 *       200:
 *         description: Playbooks cloned successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { sourceCompanyId, targetCompanyId } = body;

    if (!sourceCompanyId || !targetCompanyId) {
      return NextResponse.json(
        { success: false, message: "Source & Target company required" },
        { status: 400 },
      );
    }

    const [playbooks, existing] = await Promise.all([
      db.servicePlaybook.findMany({
        where: { companyId: Number(sourceCompanyId) },
        include: { pricingRules: true, faqs: true },
      }),
      db.servicePlaybook.findMany({
        where: { companyId: Number(targetCompanyId) },
        select: { serviceName: true },
      }),
    ]);

    const existingNames = new Set(existing.map((pb) => pb.serviceName));
    const toClone = playbooks.filter(
      (pb) => !existingNames.has(pb.serviceName),
    );

    const cloned = await Promise.all(
      toClone.map((pb) =>
        db.servicePlaybook.create({
          data: {
            serviceName: pb.serviceName,
            categoryId: pb.categoryId,
            companyId: Number(targetCompanyId),
            overview: pb.overview,
            timeEstimate: pb.timeEstimate,
            schedulingNotes: pb.schedulingNotes,
            warrantyPolicy: pb.warrantyPolicy,
            isActive: pb.isActive,
            doSay: pb.doSay ?? [],
            dontSay: pb.dontSay ?? [],
            pricingRules: {
              create: pb.pricingRules.map((rule) => ({
                description: rule.description,
                minPrice: rule.minPrice,
                maxPrice: rule.maxPrice,
              })),
            },
            faqs: {
              create: pb.faqs.map((faq) => ({
                question: faq.question,
                answer: faq.answer,
              })),
            },
          },
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      message: "Playbooks cloned successfully",
      data: {
        created: cloned.length,
        skipped: playbooks.length - toClone.length,
        playbooks: cloned,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
