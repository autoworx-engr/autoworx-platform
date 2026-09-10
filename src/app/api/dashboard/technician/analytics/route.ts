import { getCurrentProjects } from "@/actions/dashboard/data/getTechnicianInfo";
import { getDashboardTasks } from "@/actions/dashboard/data/getDashboardTasks";
import { NextRequest, NextResponse } from "next/server";
import { getDashboardAppointments } from "../../_lib/appointments";
import { resolveDashboardContext } from "../../_lib/context";
import { buildMonthlyPayout, buildPerformance } from "./_payload";

/**
 * @swagger
 * /api/dashboard/technician/analytics:
 *   get:
 *     summary: Get technician dashboard analytics
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
 *         description: Get technician dashboard analytics
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
 *                   example: Get technician dashboard analytics
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
    const resolved = await resolveDashboardContext(req);
    if ("error" in resolved) return resolved.error;

    const { user, userId, companyId, timezone } = resolved.context;

    const [appointments, taskList, monthlyPayout, performance, projects] =
      await Promise.all([
        getDashboardAppointments(user, timezone),
        getDashboardTasks({ companyId, userId, timezone }),
        buildMonthlyPayout(timezone, userId, companyId),
        buildPerformance(timezone, userId),
        getCurrentProjects(userId, companyId),
      ]);

    return NextResponse.json({
      success: true,
      message: "Get technician dashboard analytics",
      data: {
        projects,
        performance,
        monthlyPayout,
        appointments,
        taskData: {
          data: taskList.tasks,
          totalTask: taskList.totalTasks,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retrieve technician analytics",
      },
      { status: 500 },
    );
  }
}
