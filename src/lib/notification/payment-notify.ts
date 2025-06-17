import sendNotificationByEmail from "@/actions/notification/sendNotificationByEmail";
import sendNotificationBySms from "@/actions/notification/sendNotificationBySms";
import { EmployeeType } from "@prisma/client";
import { sendUserNotification } from "../sendUserNotification";
import { sendNotification } from "@/actions/notification/sendNotification";
import { getNotificationSetting } from "./getNotificationSetting";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { getCompanyId } from "../companyId";
import { formatCurrency } from "../../utils/formatCurrency";

type TSendPaymentReceivedNotification = {
  companyId: number;
  amount: number;
  clientName: string;
  invoiceId: string;
  sendRoles?: EmployeeType[];
};

export async function sendPaymentReceivedNotification({
  companyId,
  clientName,
  amount,
  invoiceId,
  sendRoles = ["Admin", "Manager"],
}: TSendPaymentReceivedNotification) {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    // update technician status to complete
    // get all company admins and managers
    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
    });
    const redirectUrl = "/dashboard/payments";

    const description = `Payment of ${formatCurrency(amount)} received from ${clientName} for invoice #${invoiceId}. View in Autoworx.`;

    const title = "Payment Received";
    for (const user of getUsers) {
      // call actual send notification utility function
      const setting = await getNotificationSetting({
        userId: user.id,
        notificationType: "PAYMENT_RECEIVED",
      });
      if (setting?.push_enabled) {
        await sendNotification({
          userId: user.id,
          title,
          description,
          companyId: companyUniqueId,
          type: "payment",
          redirectUrl,
        });
        await sendUserNotification({
          userId: user.id,
          title,
          body: description,
          deepLink: redirectUrl,
        });
      }
      // send email notification
      if (setting?.email_enabled && user.email) {
        sendNotificationByEmail({
          companyId: companyUniqueId,
          description,
          userName: user.firstName + " " + user.lastName,
          subject: title,
          userEmail: user.email,
        });
      }

      // send sms notification
      if (setting?.text_enabled && user.phone) {
        sendNotificationBySms({
          userName: user.firstName + " " + user.lastName,
          companyId: companyUniqueId,
          description,
          userPhoneNo: user.phone,
        });
      }
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}
