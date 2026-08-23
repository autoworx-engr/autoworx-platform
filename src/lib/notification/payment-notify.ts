import { sendNotification } from "@/actions/notification/sendNotification";
import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import { formatCurrency } from "../../utils/formatCurrency";
import { getCompanyId } from "../companyId";

type TSendPaymentReceivedNotification = {
  companyId: number;
  amount: number;
  clientName: string;
  invoiceId: string;
  sendRoles?: EmployeeType[];
  isDeposit?: boolean;
};

export async function sendPaymentReceivedNotification({
  companyId,
  clientName,
  amount,
  invoiceId,
  sendRoles = ["Admin", "Manager"],
  isDeposit = false,
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

    const description = `${isDeposit ? "Deposit" : "Payment"} of ${formatCurrency(amount)} received from ${clientName} for invoice #${invoiceId}. View in Autoworx.`;

    const title = "Payment Received";
    for (const user of getUsers) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: companyUniqueId,
        iconType: "payment",
        title,
        description,
        type: "PAYMENT_RECEIVED",
        redirectUrl,
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}

type TSendPaymentFailedNotification = {
  companyId: number;
  gateway: string;
  eventId: string;
  error: string;
};

export async function sendPaymentFailedNotification({
  companyId,
  gateway,
  eventId,
  error,
}: TSendPaymentFailedNotification) {
  try {
    const getUsers = await getUsersByRole(companyId, ["Admin", "Manager"], {
      id: true,
    });
    const redirectUrl = "/dashboard/settings/payments/webhook-events";
    const title = "Payment Processing Failed";

    const description = `A ${gateway} payment failed to process (ref: ${eventId}). Check webhook events for details.`;

    for (const user of getUsers) {
      // Bypass notification settings — payment failures are critical alerts
      await sendNotification({
        userId: user.id,
        title,
        description,
        companyId,
        type: "payment",
        redirectUrl,
      });
    }
  } catch (err) {
    console.error("[sendPaymentFailedNotification]", err);
  }
}
