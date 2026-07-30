import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import moment from "moment-timezone";
import {
  buildUpcomingAppointmentFilter,
  upcomingAppointmentOrderBy,
} from "@/actions/pipelines/_upcomingAppointmentFilter";

/**
 * @swagger
 * /api/client/client-details/{id}/appointments:
 *   get:
 *     summary: Get client's appointments (paginated)
 *     description: Retrieve paginated appointment list for a specific client.
 *     tags:
 *       - Clients
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Client ID
 *         schema:
 *           type: integer
 *           example: 15
 *       - in: query
 *         name: page
 *         required: false
 *         description: Page number
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of items per page
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Client appointments fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     hasMore:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid client ID
 *       500:
 *         description: Failed to fetch client appointments
 */

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const clientId = parseInt(params.id);
    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "Invalid client ID" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "10") || 10,
      100,
    );
    const skip = (page - 1) * limit;

    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { company: { select: { timezone: true } } },
    });
    const timezone = client?.company?.timezone ?? moment.tz.guess();

    const where: Prisma.AppointmentWhereInput = {
      clientId,
      ...buildUpcomingAppointmentFilter(timezone),
    };

    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        orderBy: upcomingAppointmentOrderBy,
        skip,
        take: limit,
      }),
      db.appointment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + appointments.length < total,
      },
    });
  } catch (error) {
    console.error("CLIENT APPOINTMENT FETCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch client appointments" },
      { status: 500 },
    );
  }
}
