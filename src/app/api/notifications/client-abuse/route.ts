import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/notifications/client-abuse:
 *   post:
 *     summary: Send abusive client message notification to admins, managers and sales agents
 *     tags:
 *       - Notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *               - companyId
 *               - message
 *             properties:
 *               clientId:
 *                 type: integer
 *                 example: 12
 *                 description: Client ID (required)
 *               companyId:
 *                 type: integer
 *                 example: 4
 *                 description: Company ID (required)
 *               message:
 *                 type: string
 *                 example: "Bad language used by client"
 *                 description: Client message content (required)
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Client not found
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, companyId, message } = body;

    // Validation
    if (!clientId || !companyId || !message) {
      return NextResponse.json(
        {
          success: false,
          message: "clientId, companyId and message are required",
        },
        { status: 400 },
      );
    }

    // Find client info
    const client = await db.client.findFirst({
      where: {
        id: Number(clientId),
        companyId: Number(companyId),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mobile: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          message: "Client not found",
        },
        { status: 404 },
      );
    }

    // Get users (Admin, Manager, Sales)
    const users = await getUsersByRole(
      companyId,
      ["Admin", "Manager", "Sales"],
      {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    );

    const redirectUrl = `/dashboard/communication/client/${clientId}`;

    // Dynamic title & description based on client info + abusive message
    const clientName =
      `${client.firstName || ""} ${client.lastName || ""}`.trim();
    const title = `Client Needs Human Assistance`;
    const description = `Client (${clientName} - ${client.mobile}) needs human support. Last message: "${message}"`;

    // Send notification to all relevant users
    for (const user of users) {
      await sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: Number(companyId),
        title,
        iconType: "message",
        description,
        type: "CLIENT_MESSAGE_ALERT",
        redirectUrl,
      });
    }

    revalidatePath("/dashboard");

    return NextResponse.json(
      {
        success: true,
        message: "Abusive client message notification sent successfully",
        data: {
          clientId: client.id,
          clientName: client.firstName + client.lastName,
          clientPhone: client.mobile,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Failed to send abusive message notification",
      },
      { status: 500 },
    );
  }
}
