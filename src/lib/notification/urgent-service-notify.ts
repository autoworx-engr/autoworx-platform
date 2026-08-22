import { sendNotification } from "@/actions/notification/sendNotification";
import sendNotificationByEmail from "@/actions/notification/sendNotificationByEmail";
import { sendPushNotification } from "@/actions/notification/sendPushNotification";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import { db } from "../db";

type TUrgentServiceRequestNotification = {
  companyId: number;
  shopId: number;
  requestId: number;
  clientName: string;
  description?: string;
  sendRoles?: EmployeeType[];
};

export const sendUrgentServiceRequestNotification = async ({
  companyId,
  shopId,
  requestId,
  clientName,
  description,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TUrgentServiceRequestNotification) => {
  try {
    const shop = await db.shop.findUnique({
      where: { id: shopId },
      select: { urgentBookingNotificationsEnabled: true, storeName: true },
    });

    if (!shop?.urgentBookingNotificationsEnabled) return;

    const users = await getUsersByRole(companyId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    const redirectUrl = `/dashboard/virtual-shop/admin/${shopId}/urgent-requests/${requestId}`;
    const title = "Urgent Service Request";
    const preview =
      description && description.length > 100
        ? description.slice(0, 100) + "..."
        : description;
    const notificationDescription = preview
      ? `"${clientName}" submitted an urgent request: "${preview}"`
      : `"${clientName}" submitted an urgent service request on ${shop.storeName}.`;

    for (const user of users) {
      await sendNotification({
        userId: user.id,
        title,
        description: notificationDescription,
        companyId,
        type: "virtualShop",
        redirectUrl,
      });

      await sendPushNotification({
        userId: user.id,
        title,
        body: notificationDescription,
        deepLink: redirectUrl,
      });

      await sendNotificationByEmail({
        companyId,
        description: notificationDescription,
        userName: `${user.firstName ?? ""} ${user.lastName ?? ""}`,
        subject: title,
        userEmail: user.email!,
      });
    }
  } catch (err) {
    console.error("urgent service request notification error", err);
    throw err;
  }
};
