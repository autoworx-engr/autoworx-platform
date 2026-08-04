import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/ai-train/service-playbooks:
 *   get:
 *     summary: Get all service playbooks by company
 *     tags: [Service Playbooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: number
 *         example: 1
 *         description: Company ID to scope playbooks
 *     responses:
 *       200:
 *         description: Service playbooks retrieved successfully
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
 *                   example: Service playbooks retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Company ID is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = Number(searchParams.get("companyId"));
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId");
    const isActive = searchParams.get("isActive");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Company ID is required" },
        { status: 400 },
      );
    }

    const where: any = { companyId };

    if (search) {
      where.OR = [
        { serviceName: { contains: search, mode: "insensitive" } },
        { overview: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = Number(categoryId);
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const [data, total] = await Promise.all([
      db.servicePlaybook.findMany({
        where,
        include: {
          category: true,
          pricingRules: true,
          faqs: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.servicePlaybook.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Service playbooks retrieved successfully",
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching playbooks:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/ai-train/service-playbooks:
 *   post:
 *     summary: Create a new service playbook
 *     tags: [Service Playbooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - serviceName
 *             properties:
 *               companyId:
 *                 type: integer
 *                 example: 1
 *                 description: Company ID (foreign key)
 *               serviceName:
 *                 type: string
 *                 example: Full Vehicle Wrap
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
 *                 example: High quality full vehicle branding service
 *               timeEstimate:
 *                 type: string
 *                 nullable: true
 *                 example: 3-5 days
 *               schedulingNotes:
 *                 type: string
 *                 nullable: true
 *                 example: Appointment required before service
 *               warrantyPolicy:
 *                 type: string
 *                 nullable: true
 *                 example: 3 years warranty on materials
 *               doSay:
 *                 type: array
 *                 description: Allowed phrases AI can say
 *                 items:
 *                   type: string
 *                 example:
 *                   - Premium vinyl material
 *                   - Professional installation
 *               dontSay:
 *                 type: array
 *                 description: Restricted phrases AI must avoid
 *                 items:
 *                   type: string
 *                 example:
 *                   - Cheap quality
 *                   - No warranty
 *               pricingRules:
 *                 type: array
 *                 description: Pricing rules for the service
 *                 items:
 *                   type: object
 *                   required:
 *                     - description
 *                     - minPrice
 *                     - maxPrice
 *                   properties:
 *                     description:
 *                       type: string
 *                       example: Base pricing for sedan
 *                     minPrice:
 *                       type: number
 *                       format: float
 *                       example: 500
 *                     maxPrice:
 *                       type: number
 *                       format: float
 *                       example: 1500
 *               faqs:
 *                 type: array
 *                 description: Frequently asked questions
 *                 items:
 *                   type: object
 *                   required:
 *                     - question
 *                     - answer
 *                   properties:
 *                     question:
 *                       type: string
 *                       example: How long does the wrap last?
 *                     answer:
 *                       type: string
 *                       example: It lasts up to 3 years with proper care
 *     responses:
 *       201:
 *         description: Service playbook created successfully
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
 *                   example: Service playbook created successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.companyId || !body.serviceName) {
      return NextResponse.json(
        { success: false, message: "Company ID and Service Name are required" },
        { status: 400 },
      );
    }

    const playbook = await db.servicePlaybook.create({
      data: {
        companyId: Number(body.companyId),
        serviceName: body.serviceName,
        categoryId: body.categoryId ? Number(body.categoryId) : null,
        overview: body.overview,
        timeEstimate: body.timeEstimate,
        schedulingNotes: body.schedulingNotes,
        warrantyPolicy: body.warrantyPolicy,
        isActive: body.isActive ?? true,
        doSay: body.doSay ?? [],
        dontSay: body.dontSay ?? [],
        pricingRules: { create: body.pricingRules ?? [] },
        faqs: { create: body.faqs ?? [] },
      },
      include: {
        category: true,
        pricingRules: true,
        faqs: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Service playbook created successfully",
      data: playbook,
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
