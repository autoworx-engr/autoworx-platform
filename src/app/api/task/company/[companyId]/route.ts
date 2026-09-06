import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

/**
 * @swagger
 * components:
 *   schemas:
 *     TaskAssignedUser:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         appointmentId:
 *           type: integer
 *           nullable: true
 *         taskId:
 *           type: integer
 *         userId:
 *           type: integer
 *         eventId:
 *           type: string
 *           nullable: true
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             firstName:
 *               type: string
 *               nullable: true
 *             lastName:
 *               type: string
 *               nullable: true
 *             employeeType:
 *               type: string
 *               nullable: true
 *
 *     TaskListItem:
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
 *           enum: [Low, Medium, High]
 *         status:
 *           type: string
 *           enum: [pending, completed]
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         userId:
 *           type: integer
 *           nullable: true
 *         companyId:
 *           type: integer
 *         invoiceId:
 *           type: string
 *           nullable: true
 *         clientId:
 *           type: integer
 *           nullable: true
 *         leadId:
 *           type: integer
 *           nullable: true
 *         googleEventId:
 *           type: string
 *           nullable: true
 *         createdBy:
 *           type: string
 *           enum: [user, sales_agent]
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         taskUser:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TaskAssignedUser'
 *         client:
 *           type: object
 *           nullable: true
 *         lead:
 *           type: object
 *           nullable: true
 *
 *     TaskCompanyPagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 80
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalPages:
 *           type: integer
 *           example: 8
 */

/**
 * @swagger
 * /api/task/company/{companyId}:
 *   get:
 *     summary: List pending tasks for a company
 *     description: >
 *       Returns a paginated list of pending tasks belonging to the given company, scoped to
 *       the authenticated user (tasks they created OR are assigned to). Supports filtering by
 *       title search, an explicit date range, or an "upcoming" window relative to a given day/time.
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Company ID (must match the authenticated principal's company)
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           example: 1
 *         description: Page number (1-indexed)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Page size. When omitted, all matching tasks are returned as a single page.
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Case-insensitive search against task title
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           example: "2026-06-01"
 *         description: Filter by date >= startDate (ignored when upcoming=true). Requires endDate.
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           example: "2026-06-30"
 *         description: Filter by date <= endDate (ignored when upcoming=true). Requires startDate.
 *       - in: query
 *         name: upcoming
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: >
 *           When "true" (with today/currentTime), returns tasks due later today (at/after
 *           currentTime) plus all tasks on future dates, instead of using startDate/endDate.
 *       - in: query
 *         name: today
 *         required: false
 *         schema:
 *           type: string
 *           example: "2026-06-15"
 *         description: Reference date (UTC, YYYY-MM-DD) for the upcoming window. Required when upcoming=true.
 *       - in: query
 *         name: currentTime
 *         required: false
 *         schema:
 *           type: string
 *           example: "14:30"
 *         description: Reference time used to include only later-today tasks when upcoming=true.
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
 *                   $ref: '#/components/schemas/TaskCompanyPagination'
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TaskListItem'
 *       400:
 *         description: Invalid companyId
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
 *       403:
 *         description: Forbidden - companyId does not match the authenticated principal
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ companyId: string }> },
) {
  const params = await props.params;
  try {
    const companyId = Number(params.companyId);

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid companyId" },
        { status: 400 },
      );
    }

    const principal = await getAuthPrincipal(req);
    if (!principal) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (companyId !== principal.companyId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);

    // Parse numeric params defensively — a non-numeric value (e.g. ?page=abc)
    // must not leak NaN into Prisma skip/take and crash the query.
    const toPositiveInt = (raw: string | null): number | undefined => {
      if (raw == null) return undefined;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
    };

    const page = toPositiveInt(searchParams.get("page")) ?? 1;
    const limit = toPositiveInt(searchParams.get("limit"));
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();
    const userId = principal.userId;
    const upcoming = searchParams.get("upcoming") === "true";
    const today = searchParams.get("today");
    const currentTime = searchParams.get("currentTime") ?? "";

    const skip = limit ? (page - 1) * limit : undefined;

    const where: Prisma.TaskWhereInput = { companyId, status: "pending" };

    const andConditions: Prisma.TaskWhereInput[] = [];

    // Scope tasks to the acting user (creator OR assignee), mirroring the web
    // getTasks server action. Applies to all roles.
    if (userId) {
      andConditions.push({
        OR: [{ userId }, { taskUser: { some: { userId } } }],
      });
    }

    if (search) {
      // Web task search matches title only (useTaskSearchQuery), so keep parity.
      andConditions.push({ title: { contains: search, mode: "insensitive" } });
    }

    const todayStart =
      upcoming && today ? new Date(`${today}T00:00:00.000Z`) : null;
    if (todayStart && !isNaN(todayStart.getTime())) {
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
      andConditions.push({
        OR: [
          { date: { gte: tomorrowStart } },
          {
            AND: [
              { date: { gte: todayStart } },
              { date: { lt: tomorrowStart } },
              {
                OR: [
                  { startTime: null },
                  { startTime: "" },
                  { startTime: { gte: currentTime } },
                ],
              },
            ],
          },
        ],
      });
    } else if (startDate && endDate) {
      andConditions.push({
        OR: [
          { date: null },
          {
            date: {
              gte: new Date(`${startDate}T00:00:00.000Z`),
              lte: new Date(`${endDate}T23:59:59.999Z`),
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
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
        ...(skip !== undefined ? { skip } : {}),
        ...(limit !== undefined ? { take: limit } : {}),
        orderBy: { createdAt: "desc" },
      }),
      db.task.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      pagination: {
        total,
        page,
        limit: limit ?? total,
        totalPages: limit ? Math.ceil(total / limit) : 1,
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
