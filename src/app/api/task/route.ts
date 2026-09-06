import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { validateTaskRelations } from "./_authorizeTask";
import {
  sendNewTaskAssignNotification,
  sendNewTaskNotification,
} from "@/lib/notification/task-and-appointment-notify";
import { Priority, TaskAndAppointmentCreatedByEnum } from "@prisma/client";
import { getGoogleCalendarToken } from "@/actions/calendar-settings/getGoogleCalendarAuth";
import createGoogleCalendarEvent from "@/actions/task/google-calendar/createGoogleCalendarEvent";
import { revalidatePath } from "next/cache";

// only for human

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateTaskRequest:
 *       type: object
 *       required:
 *         - title
 *         - priority
 *         - assignedUsers
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 100
 *           example: Follow up with client
 *         description:
 *           type: string
 *           nullable: true
 *           example: Call client regarding invoice
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *           example: HIGH
 *         assignedUsers:
 *           type: array
 *           items:
 *             type: integer
 *           example: [1, 2]
 *         userId:
 *           type: integer
 *           description: >-
 *             Optional task owner (maps to Task.userId). Must belong to the
 *             authenticated user's company; defaults to the authenticated user.
 *           example: 12
 *         date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         startTime:
 *           type: string
 *           nullable: true
 *           example: "10:00"
 *         endTime:
 *           type: string
 *           nullable: true
 *           example: "11:00"
 *         clientId:
 *           type: integer
 *           nullable: true
 *         leadId:
 *           type: integer
 *           nullable: true
 *         invoiceId:
 *           type: string
 *           nullable: true
 *         createdBy:
 *           type: string
 *           enum: [user, sales_agent]
 *           default: user
 *
 *     TaskResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         startTime:
 *           type: string
 *           nullable: true
 *         endTime:
 *           type: string
 *           nullable: true
 *         priority:
 *           type: string
 *         userId:
 *           type: integer
 *         companyId:
 *           type: integer
 *         googleEventId:
 *           type: string
 *           nullable: true
 *         leadId:
 *           type: integer
 *           nullable: true
 *         clientId:
 *           type: integer
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/task:
 *   post:
 *     summary: Create Task
 *     description: >-
 *       Create a new task and assign multiple users. Requires an authenticated
 *       principal; companyId is taken from the caller, never the body. Machine
 *       callers use /api/sales-agent/task instead.
 *     tags:
 *       - Task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       200:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskResponse'
 *       400:
 *         description: Validation error, or client/lead/assigned user outside the caller's company
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      title,
      description,
      date,
      startTime,
      endTime,
      priority,
      assignedUsers,
      invoiceId,
      clientId,
      leadId,
      createdBy,
      userId,
    } = body;

    const principal = await getAuthPrincipal(req);
    if (!principal) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const companyId = principal.companyId;

    // Manual validation based on Prisma schema
    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "title are required",
        },
        { status: 400 },
      );
    }

    const relationError = await validateTaskRelations(
      { clientId, leadId, assignedUsers },
      companyId,
    );
    if (relationError) return relationError;

    const ownerId = Number(userId);
    if (userId !== undefined && userId !== null && Number.isFinite(ownerId)) {
      const owner = await db.user.findFirst({
        where: { id: ownerId, companyId },
        select: { id: true },
      });
      if (!owner) {
        return NextResponse.json(
          { success: false, message: "Invalid task owner" },
          { status: 400 },
        );
      }
    }

    const priorityEnum = priority as Priority;

    // Create Task (matches your Prisma model)
    let newTask = await db.task.create({
      data: {
        title,
        description: description ?? null,
        date: date ? new Date(date) : null,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
        priority: priorityEnum ?? "High",
        userId: Number.isFinite(ownerId) ? ownerId : principal.userId,
        companyId,
        invoiceId: invoiceId ?? null,
        clientId: clientId ?? null,
        leadId: leadId ?? null,
        createdBy: (createdBy as TaskAndAppointmentCreatedByEnum) ?? "user",
      },
      include: {
        client: true,
      },
    });

    // Create TaskUser (relation table)
    if (assignedUsers?.length > 0) {
      const assignedUserList = await db.user.findMany({
        where: { id: { in: assignedUsers as number[] }, companyId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyId: true,
          phone: true,
        },
      });
      const userMap = new Map(assignedUserList.map((u) => [u.id, u]));

      await db.taskUser.createMany({
        data: (assignedUsers as number[]).map((userId) => ({
          taskId: newTask.id,
          userId,
          eventId: null,
        })),
      });

      for (const userId of assignedUsers as number[]) {
        const assignedUser = userMap.get(userId);
        if (assignedUser) {
          await sendNewTaskAssignNotification({
            taskTitle: title,
            taskDate: date,
            assignTaskUser: assignedUser,
          });
        }
      }
    }
    await sendNewTaskNotification({
      companyId,
      clientName: newTask?.client
        ? `${newTask?.client?.firstName} ${newTask?.client?.lastName}`
        : "",
      title: title,
      appointmentDate: newTask?.date,
      startTime: newTask?.startTime || "",
    });
    // Google Calendar integration (optional)
    try {
      const googleToken = (await getGoogleCalendarToken())?.googleCalendarToken;

      if (googleToken && startTime && endTime && date) {
        const event = await createGoogleCalendarEvent(body);

        if (event?.id) {
          newTask = await db.task.update({
            where: { id: newTask.id },
            data: {
              googleEventId: event.id,
            },
            include: {
              client: true,
            },
          });
        }
      }
    } catch (calendarError) {
      console.error("Calendar Sync Error:", calendarError);
    }
    revalidatePath("/dashboard/task");
    return NextResponse.json(
      {
        success: true,
        message: "Task created successfully",
        data: newTask,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}

/**
 * @swagger
 * /api/task:
 *   get:
 *     summary: Get all tasks
 *     description: Returns pending tasks for the authenticated user's company.
 *     tags:
 *       - Task
 *     responses:
 *       200:
 *         description: List of tasks
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
 */
export async function GET(req: NextRequest) {
  try {
    const principal = await getAuthPrincipal(req);
    if (!principal) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const tasks = await db.task.findMany({
      where: { status: "pending", companyId: principal.companyId },
      include: {
        taskUser: true,
        client: true,
        lead: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
