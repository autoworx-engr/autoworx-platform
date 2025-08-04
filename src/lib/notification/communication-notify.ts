import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import getUser from "../getUser";

// send Notification for when new client send a email
type TClientEmailNotification = {
  companyId: number;
  clientName: string;
  clientId: number;
  sendAt: Date | number | null;
  sendRoles?: EmployeeType[];
};

export const sendClientEmailNotification = async ({
  companyId,
  clientName,
  clientId,
  sendAt,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TClientEmailNotification) => {
  try {
    const getUsers = await getUsersByRole(companyId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });
    const redirectUrl = `/dashboard/communication/client/${clientId}`;
    const description = `Email from "${clientName}" received. View in your Autoworx inbox.`;
    const title = "Send a email from Client";
    for (const user of getUsers) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId,
        iconType: "communication",
        title,
        description,
        type: "CLIENT_EMAIL_ALERT",
        redirectUrl,
      });
    }
  } catch (err) {
    console.log("client email error", err);
    throw err;
  }
};

// send notification for when client message
type TClientMessageNotification = {
  companyId: number;
  clientName?: string;
  clientId: number;
  sendRoles?: EmployeeType[];
};

export const sendClientMessageNotification = async ({
  companyId,
  clientId,
  clientName,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TClientMessageNotification) => {
  try {
    // update technician status to complete
    // get all company admins and managers
    const getUsers = await getUsersByRole(companyId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    const redirectUrl = `/dashboard/communication/client/${clientId}`;

    const description = `Message from ${clientName} received. View and respond in Autoworx`;
    const title = "New Client Message";

    for (const user of getUsers) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId,
        title,
        iconType: "message",
        description,
        type: "CLIENT_MESSAGE_ALERT",
        redirectUrl,
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

type TInternalMessageNotification = {
  companyId?: number;
  toUserId: number;
  message: number;
};

// COMMUNICATION NOTIFICATION FOR INTERNAL MESSAGES
export const sendInternalMessageNotification = async ({
  toUserId,
  message,
}: TInternalMessageNotification) => {
  try {
    const sessionUser = await getUser();
    const toUser = await getUser(toUserId);
    const redirectUrl = `/dashboard/communication/internal`;
    const sessionUserFullName = `${sessionUser.firstName} ${sessionUser.lastName}`;
    const description = `New internal message from ${sessionUserFullName}. View it in Autoworx`;
    const title = "New Internal Message";
    sendUserNotifications({
      userId: toUserId,
      userName: `${toUser.firstName} ${toUser.lastName}`,
      userEmail: toUser.email || "",
      userPhoneNo: toUser.phone || "",
      companyId: toUser.companyId,
      iconType: "message",
      title,
      description,
      type: "INTERNAL_MESSAGE_ALERT",
      redirectUrl,
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
};
