import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { updateTask } from "@/actions/task/updateTask";
import { writeAuditLog } from "@/lib/copilot/audit";
import { Priority } from "@prisma/client";

/**
 * @swagger
 * /api/task/company/{companyId}/{id}:
 *   put:
 *     summary: Update a task belonging to the specified company
 *     tags: [Task]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer, example: 4 }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, example: 12 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: integer }
 *               title: { type: string }
 *               description: { type: string, nullable: true }
 *               priority: { type: string, enum: [LOW, MEDIUM, HIGH] }
 *               date: { type: string, nullable: true }
 *               startTime: { type: string, nullable: true }
 *               endTime: { type: string, nullable: true }
 *               clientId: { type: integer, nullable: true }
 *               assignedUsers: { type: array, items: { type: integer } }
 *     responses:
 *       200: { description: Task updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       500: { description: Internal server error }
 */

const UpdateTaskBodySchema = z.object({
  userId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.nativeEnum(Priority).optional(),
  date: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  assignedUsers: z.array(z.number().int().positive()).optional(),
});

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ companyId: string; id: string }> },
): Promise<NextResponse> {
  const startTime = Date.now();
  const { companyId: companyIdParam, id: idParam } = await context.params;

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

  const taskId = parseInt(idParam, 10);
  if (isNaN(taskId)) {
    return NextResponse.json(
      { success: false, message: "Invalid task id" },
      { status: 400 },
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

  const parsed = UpdateTaskBodySchema.safeParse(rawBody);
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

  const { userId, ...updateFields } = parsed.data;

  try {
    const result = await updateTask(
      { taskId, ...updateFields },
      { forceCompanyId: companyId, forceUserId: userId },
    );

    if (result.type === "error") {
      await writeAuditLog({
        actor: "api",
        action: "task.update",
        userId,
        companyId,
        resourceType: "Task",
        resourceId: String(taskId),
        input: updateFields,
        success: false,
        errorMessage: result.message,
        latencyMs: Date.now() - startTime,
      });
      return NextResponse.json(
        { success: false, message: result.message ?? "Failed to update task" },
        { status: 400 },
      );
    }

    await writeAuditLog({
      actor: "api",
      action: "task.update",
      userId,
      companyId,
      resourceType: "Task",
      resourceId: String(taskId),
      input: updateFields,
      success: true,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: "Task updated successfully",
      data: { taskId },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update task";
    await writeAuditLog({
      actor: "api",
      action: "task.update",
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
