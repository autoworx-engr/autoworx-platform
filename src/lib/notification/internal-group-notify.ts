import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import getUser from "../getUser";
import { db } from "../db";

type TInternalGroupMessageNotification = {
  groupId: number;
  fromUserId?: number;
  memberIds: number[];
};

// COMMUNICATION NOTIFICATION FOR INTERNAL GROUP MESSAGES
export const sendInternalGroupMessageNotification = async ({
  groupId,
  fromUserId,
  memberIds,
}: TInternalGroupMessageNotification) => {
  try {
    // Pass fromUserId from API routes (mobile app has no web session);
    // getUser() without an id falls back to the web session.
    const sender = await getUser(fromUserId);
    const group = await db.group.findUnique({ where: { id: groupId } });
    const redirectUrl = `/dashboard/communication/internal?groupId=${groupId}`;
    const senderFullName = `${sender.firstName} ${sender.lastName}`;
    const description = group
      ? `New message from ${senderFullName} in "${group.name}". View it in Autoworx`
      : `New group message from ${senderFullName}. View it in Autoworx`;
    const title = "New Internal Group Message";

    const recipientIds = memberIds.filter((id) => id !== sender?.id);
    if (recipientIds.length === 0) return;

    const recipients = await db.user.findMany({
      where: { id: { in: recipientIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyId: true,
      },
    });

    for (const user of recipients) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: user.companyId,
        iconType: "message",
        title,
        description,
        type: "INTERNAL_MESSAGE_ALERT",
        redirectUrl,
      });
    }
  } catch (err) {
    console.error("internal group message notification error", err);
  }
};
