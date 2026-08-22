import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConvertedLeadsPerMonth } from "@/actions/dashboard/data/getAdminInfo";
import moment from "moment-timezone";
import { Task } from "@prisma/client";
import { getSalespersonLeads } from "@/actions/dashboard/data/getSalesWinRate";
import { getDateRanges } from "@/actions/dashboard/data/lib";

/**
 * @swagger
 * /api/dashboard/sales/analytics:
 *   get:
 *     summary: Get sales dashboard analytics
 *     tags: [dashboard Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: number
 *         example: 1
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: number
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Get sales dashboard analytics
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
 *                   example: Get sales dashboard analytics
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         example: 11
 *                       firstName:
 *                         type: string
 *                         example: Saidul
 *                       lastName:
 *                         type: string
 *                         example: Islam
 *                       mobile:
 *                         type: string
 *                         example: "09885236058"
 *                       countryCode:
 *                         type: string
 *                         example: US
 *                       email:
 *                         type: string
 *                         example: saidulislam@gmail.com
 *                       isFleet:
 *                         type: boolean
 *                         example: false
 *                       photo:
 *                         type: string
 *                         example: /images/default.png
 *                       isStarred:
 *                         type: boolean
 *                         example: false
 *                       companyId:
 *                         type: number
 *                         example: 1
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-14T05:05:37.239Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-14T05:14:36.974Z"
 *                       conversationsTrack:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                             example: 16
 *                           emailIsRead:
 *                             type: boolean
 *                             example: true
 *                           smsIsRead:
 *                             type: boolean
 *                             example: true
 *                           emailIsUnReadCount:
 *                             type: number
 *                             example: 0
 *                           smsUnReadCount:
 *                             type: number
 *                             example: 0
 *                           emailLastMessage:
 *                             type: string
 *                             example: testing attachment issue
 *                           smsLastMessage:
 *                             type: string
 *                             example: ""
 *                           lastMessageBy:
 *                             type: string
 *                             example: Company
 *                           sendAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-01-14T05:15:14.971Z"
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                       example: 2
 *                     take:
 *                       type: number
 *                       example: 20
 *                     total:
 *                       type: number
 *                       example: 134
 *                     totalPages:
 *                       type: number
 *                       example: 7
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *
 *       400:
 *         description: Bad request
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
 *                   example: Company ID is required
 *
 *       401:
 *         description: Unauthorized
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
 *                   example: Unauthorized access
 *
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
 *                   example: Internal server error
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = parseInt(searchParams.get("companyId") || "0");
    const userId = parseInt(searchParams.get("userId") || "0");

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Company Id is required" },
        { status: 400 },
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User Id is required" },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "The user does not exist!" },
        { status: 400 },
      );
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, message: "The company does not exist!" },
        { status: 400 },
      );
    }

    const timezone =
      company?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const fetchWithAppointment = {
      include: {
        appointmentUsers: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        vehicle: {
          select: {
            year: true,
            make: true,
            model: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    };

    let appointments = [];

    // Start of today in company timezone (converted to UTC for database query)
    const startOfToday = moment.tz(timezone).utc().startOf("day");

    if (
      user.employeeType === "Admin" ||
      user.employeeType === "Manager" ||
      user.employeeType === "Sales"
    ) {
      appointments = await db.appointment.findMany({
        where: {
          companyId: user.companyId,
          date: {
            gte: startOfToday.toDate(),
          },
        },
        orderBy: {
          date: "asc",
        },
        ...fetchWithAppointment,
        take: 20,
      });
    } else {
      // Logic for Technician or Other role
      appointments = await db.appointment.findMany({
        where: {
          companyId: user.companyId,
          date: {
            gte: startOfToday.toDate(),
          },
          OR: [
            {
              appointmentUsers: {
                some: {
                  userId: user.id,
                },
              },
            },
            {
              userId: user.id,
            },
          ],
        },
        orderBy: {
          date: "asc",
        },
        ...fetchWithAppointment,
        take: 20,
      });
    }

    //task list
    let tasks: Task[] = [];
    let totalTasks: number = 0;

    if (!userId) {
      throw new Error("User ID is required to fetch tasks.");
    }

    // Get tasks created by user OR assigned to user
    const whereCondition = {
      companyId,
      OR: [
        { userId: +userId }, // Tasks created by the user
        { taskUser: { some: { userId: +userId } } }, // Tasks assigned to the user
      ],
    };

    tasks = await db.task.findMany({
      where: whereCondition,
      take: 20,
    });

    totalTasks = await db.task.count({
      where: {
        companyId,
        OR: [{ userId: +userId }, { taskUser: { some: { userId: +userId } } }],
      },
    });

    //* sales performance
    const leadsConvertedData = await getConvertedLeadsPerMonth(
      timezone,
      companyId,
    );
    const { currentTotalLeads: salesCurrentTotalLeads, currentConvertedLeads } =
      await getSalespersonLeads(String(userId), companyId);

    // --- Data Processing ---
    const winLossRateRaw =
      salesCurrentTotalLeads > 0
        ? (currentConvertedLeads / salesCurrentTotalLeads) * 100
        : 0;
    const winLossRate = parseFloat(winLossRateRaw.toFixed(2));

    const leadsConvertedRate = parseFloat(
      (leadsConvertedData?.growth?.rate ?? 0).toFixed(2),
    );
    const leadsConvertedIsPositive =
      leadsConvertedData?.growth?.isPositive ?? false;
    // --- End Data Processing ---

    const { currentMonthStart, currentMonthEnd } = getDateRanges(timezone);

    const currentTotalLeads = await db.lead.count({
      where: {
        companyId,
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    const data = {
      appointments,
      taskData: {
        data: tasks,
        totalTask: totalTasks,
      },
      salesPerformance: {
        currentTotalLeads,
        leadsConvertedData,
        leadsConvertedIsPositive,
        leadsConvertedRate,
        winLossRate,
      },
    };

    return NextResponse.json({
      success: true,
      message: "Get sales dashboard analytics",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retrieve clients",
      },
      { status: 500 },
    );
  }
}
