import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Priority } from "@prisma/client";

/**
 * @swagger
 * /api/task/{id}:
 *   get:
 *     summary: Get single task
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task found
 *       404:
 *         description: Task not found
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const taskId = Number(params.id);

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        taskUser: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeType: true,
              },
            },
          },
        },
        client: true,
        lead: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, message: "Task not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Retrieved task successfully!",
      data: task,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/task/{id}:
 *   patch:
 *     summary: Update task
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       200:
 *         description: Task updated
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const taskId = Number(params.id);
    const body = await req.json();

    const {
      title,
      description,
      date,
      startTime,
      endTime,
      priority,
      clientId,
      leadId,
      assignedUsers,
      status,
    } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (date !== undefined) data.date = date ? new Date(date) : null;
    if (startTime !== undefined) data.startTime = startTime;
    if (endTime !== undefined) data.endTime = endTime;
    if (priority !== undefined) data.priority = priority as Priority;
    if (clientId !== undefined) data.clientId = clientId;
    if (leadId !== undefined) data.leadId = leadId;
    if (status !== undefined) {
      data.status = status;
      data.completedAt = status === "completed" ? new Date() : null;
    }

    const updatedTask = await db.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: taskId },
        data,
        include: {
          taskUser: true,
          client: true,
          lead: true,
        },
      });

      if (assignedUsers) {
        await tx.taskUser.deleteMany({ where: { taskId } });
        await tx.taskUser.createMany({
          data: assignedUsers.map((userId: number) => ({
            taskId,
            userId,
            eventId: null,
          })),
        });
      }

      return task;
    });

    return NextResponse.json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/task/{id}:
 *   delete:
 *     summary: Delete task
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task deleted
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const taskId = Number(params.id);

    await db.taskUser.deleteMany({
      where: { taskId },
    });

    await db.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
