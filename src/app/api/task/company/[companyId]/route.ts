import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { writeAuditLog } from "@/lib/copilot/audit";
import { Priority } from "@prisma/client";

/**
 * @swagger
 * /api/task/company/{companyId}:
 *   get:
 *     summary: Get tasks by companyId
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Paginated tasks list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 80
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 8
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ companyId: string }> },
) {
  const params = await props.params;
  try {
    const companyId = Number(params.companyId);

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    const skip = (page - 1) * limit;

    const where = { companyId };

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          taskUser: true,
          client: true,
          lead: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.task.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: tasks,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

const CreateTaskBodySchema = z.object({
  userId: z.number().int().positive(),
  title: z.string().min(1, "title is required"),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority).default("Medium"),
  date: z.string().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  assignedUsers: z.array(z.number().int().positive()).default([]),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ companyId: string }> },
): Promise<NextResponse> {
  const startTime = Date.now();
  const { companyId: companyIdParam } = await context.params;

  const jwtCompanyId = await getCompanyIdFromBearer(req);
  if (jwtCompanyId === null) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const urlCompanyId = parseInt(companyIdParam, 10);
  if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  const companyId = jwtCompanyId;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = CreateTaskBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Validation error",
        field: parsed.error.errors[0]?.path.join(".") ?? null,
      },
      { status: 400 },
    );
  }

  const { userId, assignedUsers, date, ...taskFields } = parsed.data;

  try {
    const task = await db.task.create({
      data: {
        ...taskFields,
        companyId,
        userId,
        createdBy: "sales_agent",
        date: date ? new Date(date) : undefined,
      },
    });

    if (assignedUsers.length > 0) {
      await db.taskUser.createMany({
        data: assignedUsers.map((uid) => ({
          taskId: task.id,
          userId: uid,
          eventId: null,
        })),
      });
    }

    await writeAuditLog({
      actor: "api",
      action: "task.create",
      userId,
      companyId,
      resourceType: "Task",
      resourceId: String(task.id),
      output: { taskId: task.id },
      success: true,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Task created successfully",
        data: { taskId: task.id },
      },
      { status: 201 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create task";
    await writeAuditLog({
      actor: "api",
      action: "task.create",
      userId,
      companyId,
      success: false,
      errorMessage,
      latencyMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 },
    );
  }
}
