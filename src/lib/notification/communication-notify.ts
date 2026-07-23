import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import getUser from "../getUser";
import { db } from "../db";

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
    const title = "Received an email from Client";
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
    // Notification failure must not fail the caller (webhook/API routes)
    console.error("client email notification error", err);
  }
};

// send notification for when client message
const MESSAGE_PREVIEW_MAX_LENGTH = 100;

type TClientMessageNotification = {
  companyId: number;
  clientName?: string;
  clientId: number;
  message?: string;
  hasMedia?: boolean;
  sendRoles?: EmployeeType[];
};

export const sendClientMessageNotification = async ({
  companyId,
  clientId,
  clientName,
  message,
  hasMedia,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TClientMessageNotification) => {
  try {
    const getUsers = await getUsersByRole(companyId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    const redirectUrl = `/dashboard/communication/client/${clientId}`;

    const trimmedMessage = message?.trim();
    let preview: string;
    if (trimmedMessage) {
      const truncated =
        trimmedMessage.length > MESSAGE_PREVIEW_MAX_LENGTH
          ? trimmedMessage.slice(0, MESSAGE_PREVIEW_MAX_LENGTH) + "..."
          : trimmedMessage;
      preview = `"${truncated}"`;
    } else if (hasMedia) {
      preview = "Sent a photo";
    } else {
      preview = "Sent you a message";
    }
    const description = `${clientName}: ${preview}`;
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
    console.error("client message notification error", err);
  }
};

// send notification for when client misses a call
type TClientCallMissedNotification = {
  companyId: number;
  clientName?: string;
  clientId: number;
  sendRoles?: EmployeeType[];
};

export const sendClientCallMissedNotification = async ({
  companyId,
  clientId,
  clientName,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TClientCallMissedNotification) => {
  try {
    const getUsers = await getUsersByRole(companyId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    const redirectUrl = `/dashboard/communication/client/${clientId}?open=PHONE`;
    const description = `Missed call from ${clientName || "a client"}. Call to respond.`;
    const title = "Missed Call";

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
        type: "CLIENT_CALL_ALERT",
        redirectUrl,
      });
    }
  } catch (err) {
    console.error("client call missed notification error", err);
  }
};

type TInternalMessageNotification = {
  companyId?: number;
  toUserId: number;
  fromUserId?: number;
  message?: string;
};

// COMMUNICATION NOTIFICATION FOR INTERNAL MESSAGES
export const sendInternalMessageNotification = async ({
  toUserId,
  fromUserId,
}: TInternalMessageNotification) => {
  try {
    // Pass fromUserId from API routes (mobile app has no web session);
    // getUser() without an id falls back to the web session.
    const sender = await getUser(fromUserId);
    const toUser = await getUser(toUserId);
    const redirectUrl = `/dashboard/communication/internal?id=${sender?.id}`;
    const senderFullName = `${sender.firstName} ${sender.lastName}`;
    const description = `New internal message from ${senderFullName}. View it in Autoworx`;
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
    console.error("internal message notification error", err);
  }
};

type TCollaborationMessageNotification = {
  companyId: number;
  senderUserId?: number;
  sendRoles?: EmployeeType[];
};
// COMMUNICATION NOTIFICATION FOR COLLABORATION MESSAGES
export const sendCollaborationMessageNotification = async ({
  companyId,
  senderUserId,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TCollaborationMessageNotification) => {
  try {
    const company = await db.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const getUsers = await getUsersByRole(companyId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      companyId: true,
    });

    // Pass senderUserId from API routes (mobile app has no web session);
    // getUser() without an id falls back to the web session.
    const sender = await getUser(senderUserId);
    const redirectUrl = `/dashboard/communication/collaboration?companyId=${sender.companyId}`;
    const senderFullName = `${sender.firstName} ${sender.lastName}`;
    const description = `New collaboration message from ${senderFullName} in ${company?.name}. View it in Autoworx`;
    const title = "New Collaboration Message";

    for (const user of getUsers) {
      sendUserNotifications({
        userId: user?.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: user.companyId,
        iconType: "message",
        title,
        description,
        type: "COLLABORATION_MESSAGE_ALERT",
        redirectUrl,
      });
    }
  } catch (err) {
    console.error("collaboration message notification error", err);
  }
};
