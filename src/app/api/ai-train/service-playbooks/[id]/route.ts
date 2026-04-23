import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/ai-train/service-playbooks/{id}:
 *   get:
 *     summary: Get service playbook by ID
 *     tags: [Service Playbooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service playbook retrieved successfully
 *       404:
 *         description: Service playbook not found
 *       500:
 *         description: Internal server error
 */

export async function GET(
  _: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const playbook = await db.servicePlaybook.findUnique({
      where: { id: Number(params.id) },
      include: { pricingRules: true, faqs: true },
    });

    if (!playbook) {
      return NextResponse.json(
        { success: false, message: "Service playbook not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Service playbook retrieved successfully",
      data: playbook,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/ai-train/service-playbooks/{id}:
 *   patch:
 *     summary: Update a service playbook
 *     tags: [Service Playbooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 10
 *         description: Service playbook ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceName:
 *                 type: string
 *                 example: Full Vehicle Wrap (Premium)
 *               categoryId:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               overview:
 *                 type: string
 *                 nullable: true
 *                 example: Updated overview for premium wrap service
 *               timeEstimate:
 *                 type: string
 *                 nullable: true
 *                 example: 4-6 days
 *               schedulingNotes:
 *                 type: string
 *                 nullable: true
 *                 example: Booking required 7 days in advance
 *               warrantyPolicy:
 *                 type: string
 *                 nullable: true
 *                 example: 5 years extended warranty
 *               doSay:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - Premium vinyl with UV protection
 *               dontSay:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - No guarantee
 *               pricingRules:
 *                 type: array
 *                 description: Replaces existing pricing rules
 *                 items:
 *                   type: object
 *                   required:
 *                     - description
 *                     - minPrice
 *                     - maxPrice
 *                   properties:
 *                     description:
 *                       type: string
 *                       example: Premium pricing for SUV
 *                     minPrice:
 *                       type: number
 *                       format: float
 *                       example: 1200
 *                     maxPrice:
 *                       type: number
 *                       format: float
 *                       example: 2500
 *               faqs:
 *                 type: array
 *                 description: Replaces existing FAQs
 *                 items:
 *                   type: object
 *                   required:
 *                     - question
 *                     - answer
 *                   properties:
 *                     question:
 *                       type: string
 *                       example: Does it damage paint?
 *                     answer:
 *                       type: string
 *                       example: No, it protects the paint underneath
 *     responses:
 *       200:
 *         description: Service playbook updated successfully
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
 *                   example: Service playbook updated successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       404:
 *         description: Service playbook not found
 *       500:
 *         description: Internal server error
 */

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const body = await req.json();

    if (body.pricingRules !== undefined) {
      await db.pricingRule.deleteMany({
        where: { playbookId: Number(params.id) },
      });
    }

    await db.fAQ.deleteMany({
      where: { playbookId: Number(params.id) },
    });

    const updated = await db.servicePlaybook.update({
      where: { id: Number(params.id) },
      data: {
        serviceName: body.serviceName,
        categoryId: body.categoryId,
        overview: body.overview,
        timeEstimate: body.timeEstimate,
        schedulingNotes: body.schedulingNotes,
        warrantyPolicy: body.warrantyPolicy,
        isActive: body.isActive,
        doSay: body.doSay ?? [],
        dontSay: body.dontSay ?? [],
        ...(body.pricingRules !== undefined && {
          pricingRules: { create: body.pricingRules },
        }),
        faqs: { create: body.faqs ?? [] },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Service playbook updated successfully",
      data: updated,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/ai-train/service-playbooks/{id}:
 *   delete:
 *     summary: Delete a service playbook
 *     tags: [Service Playbooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service playbook deleted successfully
 *       404:
 *         description: Service playbook not found
 *       500:
 *         description: Internal server error
 */

export async function DELETE(
  _: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    await db.servicePlaybook.delete({
      where: { id: Number(params.id) },
    });

    return NextResponse.json({
      success: true,
      message: "Service playbook deleted successfully",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
