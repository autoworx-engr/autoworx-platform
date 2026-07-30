import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import { db } from "../db";

type TCRMDemoNotification = {
  companyId: number;
  clientName?: string;
};

export const sendCRMDemoNotification = async ({
  companyId,
  clientName,
}: TCRMDemoNotification) => {
  try {
    const company = await db.company.findUnique({
      where: {
        id: companyId,
      },
    });

    if (!company) {
      throw new Error("Company not found");
    }
    // update technician status to complete
    // get all company admins and managers
    const user = await db.user.findFirst({
      where: { companyId: companyId, isSuperAdmin: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    const redirectUrl = `/awx-dashboard`;
    const description = `A new demo request for ${
      clientName || "a client"
    } has been submitted. View in Autoworx`;
    const title = "New Demo Request Submitted";
    if (user) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        iconType: "communication",
        companyId,
        title,
        description,
        redirectUrl,
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};
