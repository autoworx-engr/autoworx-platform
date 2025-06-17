import { sendNotification } from "@/actions/notification/sendNotification";
import sendNotificationByEmail from "@/actions/notification/sendNotificationByEmail";
import sendNotificationBySms from "@/actions/notification/sendNotificationBySms";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import { getCompanyId } from "../companyId";
import { sendUserNotification } from "../sendUserNotification";
import { getNotificationSetting } from "./getNotificationSetting";

// send notification for when invoice is converted
type TInvoiceConvertedNotification = {
  clientName: string;
  companyId?: number;
  invoiceId: string;
  invoiceType: "Estimate" | "Invoice";
  sendRoles?: EmployeeType[];
};

export const sendInvoiceConvertedNotification = async ({
  clientName,
  companyId,
  invoiceId,
  invoiceType,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TInvoiceConvertedNotification) => {
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
    const redirectUrl =
      invoiceType === "Estimate"
        ? "/dashboard/estimate"
        : "/dashboard/estimate/invoices";

    const description = `Estimate ${invoiceId} for ${clientName} converted to invoice ${invoiceId}. View in Autoworx`;

    const title = "Invoice Converted";
    for (const user of getUsers) {
      // call actual send notification utility function
      const setting = await getNotificationSetting({
        userId: user.id,
        notificationType: "INVOICE_CONVERTED",
      });
      if (setting?.push_enabled) {
        await sendUserNotification({
          userId: user.id,
          title,
          body: description,
          deepLink: redirectUrl,
        });

        // send notification to browser
        await sendNotification({
          userId: user.id,
          title,
          description,
          companyId: companyUniqueId,
          type: "invoice",
          redirectUrl,
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
};

// send notification for when invoice are authorize
type TInvoiceAuthorizeNotification = {
  companyId?: number;
  invoiceId: string;
  authorizedName?: string;
  clientName?: string;
  sendRoles?: EmployeeType[];
};

export const sendInvoiceAuthorizeNotification = async ({
  companyId,
  invoiceId,
  clientName,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TInvoiceAuthorizeNotification) => {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    // update technician status to complete
    // get all company admins and managers
    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
    });

    const redirectUrl = `/dashboard/estimate/view/${invoiceId}`;
    const description = `Estimate ${invoiceId} for ${clientName} has been approved. See it in your Autoworx dashboard`;
    const title = "Invoice Authorized";

    for (const user of getUsers) {
      // call actual send notification utility function
      const setting = await getNotificationSetting({
        userId: user.id,
        notificationType: "INVOICE_AUTHORIZED",
      });

      if (setting?.push_enabled) {
        await sendNotification({
          userId: user.id,
          title,
          companyId: companyUniqueId,
          type: "invoice",
          description,
          redirectUrl,
        });

        // send notification to browser
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
};
