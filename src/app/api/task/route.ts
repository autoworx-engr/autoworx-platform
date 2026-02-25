import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { sendNewTaskAssignNotification } from "@/lib/notification/task-and-appointment-notify";
import { Priority, TaskAndAppointmentCreatedByEnum } from "@prisma/client";
import { getGoogleCalendarToken } from "@/actions/calendar-settings/getGoogleCalendarAuth";
import createGoogleCalendarEvent from "@/actions/task/google-calendar/createGoogleCalendarEvent";

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
 *         - userId
 *         - companyId
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
 *           description: Creator user ID (maps to Task.userId)
 *           example: 12
 *         companyId:
 *           type: integer
 *           description: Company ID (maps to Task.companyId)
 *           example: 5
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
 *         invoiceTemplateId:
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
 *     description: Create a new task and assign multiple users based on Prisma Task schema
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
 *         description: Validation error
 *       401:
 *         description: Unauthorized (No session)
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
      invoiceTemplateId,
      clientId,
      leadId,
      createdBy,
      userId,
      companyId,
    } = body;

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

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "CompanyId are required",
        },
        { status: 400 },
      );
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
        userId: userId,
        companyId: companyId,
        invoiceId: invoiceId ?? null,
        invoiceTemplateId: invoiceTemplateId ?? null,
        clientId: clientId ?? null,
        leadId: leadId ?? null,
        createdBy:
          (createdBy as TaskAndAppointmentCreatedByEnum) ?? "sales_agent",
      },
    });

    // Create TaskUser (relation table)
    if (assignedUsers?.length > 0) {
      for (const userId of assignedUsers as number[]) {
        const assignedUser = await db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyId: true,
            phone: true,
          },
        });

        if (assignedUser) {
          await sendNewTaskAssignNotification({
            taskTitle: title,
            taskDate: date,
            assignTaskUser: assignedUser,
          });
        }

        await db.taskUser.create({
          data: {
            taskId: newTask.id,
            userId,
            eventId: null,
          },
        });
      }
    }

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
          });
        }
      }
    } catch (calendarError) {
      console.error("Calendar Sync Error:", calendarError);
    }

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
