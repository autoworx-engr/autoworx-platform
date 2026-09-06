import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getCompletedJobs,
  getConversionRateWithGrowth,
  getConvertedLeadsPerMonth,
  getEmployeePayout,
  getExpectedRevenue,
  getInventory,
  getOngoingJobs,
  getRevenue,
  getTotalJobs,
  getTotalLeadsPerMonth,
} from "@/actions/dashboard/data/getAdminInfo";
import moment from "moment-timezone";
import { getDashboardTasks } from "@/actions/dashboard/data/getDashboardTasks";

/**
 * @swagger
 * /api/dashboard/admin/analytics:
 *   get:
 *     summary: Get admin dashboard analytics
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
 *         description: Get admin dashboard analytics
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
 *                   example: Get admin dashboard analytics
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

    //sales pipeline

    const totalLeadsPerMonthPromise = getTotalLeadsPerMonth(
      timezone,
      companyId,
    );
    const leadsConvertedDataPromise = getConvertedLeadsPerMonth(
      timezone,
      companyId,
    );
    const conversionRateDataPromise = getConversionRateWithGrowth(
      timezone,
      companyId,
    );

    const [totalLeadsPerMonth, leadsConvertedData, conversionRateData] =
      await Promise.all([
        totalLeadsPerMonthPromise,
        leadsConvertedDataPromise,
        conversionRateDataPromise,
      ]);

    const currentTotalLeads = totalLeadsPerMonth?.current ?? 0;

    const currentConversionRate = conversionRateData.currentConversionRate;
    const conversionRateGrowth = conversionRateData.conversionRateGrowth;

    //shop pipeline
    const completedJobsPromise = getCompletedJobs(timezone, companyId);
    const totalJobsPromise = getTotalJobs(companyId);
    const ongoingJobsPromise = getOngoingJobs(companyId);

    const [completedJobsData, totalJobsData, ongoingJobsData] =
      await Promise.all([
        completedJobsPromise,
        totalJobsPromise,
        ongoingJobsPromise,
      ]);

    // Clean data extraction and formatting
    const totalJobs = totalJobsData?.jobs || 0;
    const ongoingJobs = ongoingJobsData?.ongoingJobs || 0;
    const completedJobs = completedJobsData?.completedJobs || 0;
    const completedJobsGrowthRate = parseFloat(
      (completedJobsData?.growth?.rate ?? 0).toFixed(2),
    );
    const isCompletedJobsPositive =
      completedJobsData?.growth?.isPositive ?? false;

    //revenue
    const revenue = await getRevenue(timezone, companyId);
    const expectedRevenue = await getExpectedRevenue(companyId);

    //inventory
    const inventory = await getInventory(timezone, companyId);

    // Clean data extraction and parsing
    const totalValue = inventory?.totalValue || 0;
    const currentMonthTotal = inventory?.currentMonthTotal || 0;
    const inventoryGrowthRate = parseFloat(
      (inventory?.growth?.rate ?? 0).toFixed(2),
    );
    const isInventoryPositive = inventory?.growth?.isPositive ?? false;

    //employee box
    const employeePayout = await getEmployeePayout(timezone, companyId);

    // Data Extraction and Formatting
    const currentMonthTotalPayout = employeePayout?.currentMonthTotal || 0;

    // Payout is a cost, so a higher rate/growth is typically seen as 'Negative' financially.
    // We'll calculate the rate cleanly and determine if the growth is positive or negative for the indicator.
    const payoutGrowthRate = parseFloat(
      (employeePayout?.growth?.rate ?? 0).toFixed(2),
    );

    // For Payout, growth (isPositive = true) indicates a higher cost, which is usually negative for a dashboard.
    // We flip the indicator color if the rate is positive (cost increased).
    const isPayoutGrowthPositive = employeePayout?.growth?.isPositive ?? false;

    // IMPORTANT: For the performance indicator, we often show positive financial flow (Revenue Up) as Green.
    // For costs (Payout), we often show cost increase (isPositive=true) as Red.
    // However, we'll keep the `isPositive` prop as the raw data indicator, and rely on the viewer to understand context.
    // If you wanted to FLIP the color indicator: `!isPayoutGrowthPositive`

    //appointment box

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
    const { tasks, totalTasks } = await getDashboardTasks({
      companyId,
      userId,
      timezone,
    });

    const data = {
      user,
      leadsConvertedData,
      currentTotalLeads,
      currentConversionRate,
      conversionRateGrowth,
      totalJobs,
      ongoingJobs,
      completedJobs,
      completedJobsGrowthRate,
      isCompletedJobsPositive,
      revenue,
      expectedRevenue,
      totalValue,
      currentMonthTotal,
      inventoryGrowthRate,
      isInventoryPositive,
      currentMonthTotalPayout,
      payoutGrowthRate,
      isPayoutGrowthPositive,
      appointments,
      taskData: {
        tasks,
        totalTask: totalTasks,
      },
    };

    return NextResponse.json({
      success: true,
      message: "Get admin dashboard analytics",
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
