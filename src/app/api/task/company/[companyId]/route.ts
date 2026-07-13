import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

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
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           example: "2026-06-01"
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           example: "2026-06-30"
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
    const limitValue = searchParams.get("limit");
    const limit = limitValue ? Number(limitValue) : undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();
    const userId = searchParams.get("userId")
      ? Number(searchParams.get("userId"))
      : undefined;

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
      andConditions.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { client: { firstName: { contains: search, mode: "insensitive" } } },
          { client: { lastName: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    if (startDate && endDate) {
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
