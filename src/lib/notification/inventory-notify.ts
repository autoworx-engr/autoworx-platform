import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { getCompanyId } from "../companyId";

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
        sendUserNotifications({
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email || "",
          userPhoneNo: user.phone || "",
          companyId: companyUniqueId,
          iconType: "inventory",
          title,
          description,
          type: "INVENTORY_LOW",
          redirectUrl,
        });
      }
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}
