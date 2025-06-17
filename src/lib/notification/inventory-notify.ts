import { sendNotification } from "@/actions/notification/sendNotification";
import sendNotificationByEmail from "@/actions/notification/sendNotificationByEmail";
import sendNotificationBySms from "@/actions/notification/sendNotificationBySms";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { getCompanyId } from "../companyId";
import { sendUserNotification } from "../sendUserNotification";
import { getNotificationSetting } from "./getNotificationSetting";

// low inventory send notification utility function
type TLowInventoryNotification = {
  companyId?: number;
  lowInventoryAlert: number;
  currentQuantity: number;
  productName: string;
  productId: number;
  description?: string;
};

export async function lowInventoryNotification({
  companyId,
  lowInventoryAlert,
  currentQuantity,
  productName,
  productId,
  description: details,
}: TLowInventoryNotification) {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    //   check if current quantity is less than low inventory alert
    if (currentQuantity < lowInventoryAlert) {
      // get all company admins and managers
      const getAdminOrManagers = await getUsersByRole(
        companyUniqueId,
        ["Admin", "Manager"],
        { id: true, firstName: true, lastName: true, email: true, phone: true },
      );

      const redirectUrl = `/dashboard/inventory?view=products&productId=${productId}`;
      const title = "Low Inventory Alert";
      const description =
        details ?? `Item ${productName} is low in stock. Restock in Autoworx.`;
      // send notification to all admins and managers
      for (const user of getAdminOrManagers) {
        const setting = await getNotificationSetting({
          userId: user.id,
          notificationType: "INVENTORY_LOW",
        });

        if (setting?.push_enabled) {
          await sendNotification({
            userId: user.id,
            title,
            description,
            companyId: companyUniqueId,
            type: "inventory",
            redirectUrl,
          });

          sendUserNotification({
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
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}
