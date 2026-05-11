import { db } from "@/lib/db";
import { sendPushNotification } from "@/actions/notification/sendPushNotification";

export async function logCallAndNotify({
  callId,
  from,
  to,
  companyId,
  clientId,
  callerName,
}: {
  callId: string;
  from: string;
  to: string;
  companyId: number;
  clientId: number;
  callerName: string;
}) {
  await db.clientCall.create({
    data: {
      callSid: callId,
      from,
      to,
      status: "ringing",
      direction: "inbound",
      sentBy: "Client",
      companyId,
      clientId,
    },
  });

  const USER_NOTIFY_CAP = 1000;
  const companyUsers = await db.user.findMany({
    where: {
      companyId,
      employeeType: { in: ["Admin", "Manager", "Sales"] },
    },
    select: { id: true },
    // Re-fetch one extra row so we can detect — and log — when the
    // company has more notify-eligible users than the cap covers.
    take: USER_NOTIFY_CAP + 1,
  });

  if (companyUsers.length > USER_NOTIFY_CAP) {
    console.warn(
      `[Incoming] Company ${companyId} has more than ${USER_NOTIFY_CAP} notify-eligible users; some users will not receive the incoming-call push.`,
    );
    companyUsers.length = USER_NOTIFY_CAP;
  }

  await Promise.allSettled(
    companyUsers.map((user) =>
      sendPushNotification({
        userId: user.id,
        title: "📞 Incoming Call",
        body: `Call from ${callerName}`,
        deepLink: `/dashboard/communication/client/${clientId}`,
      }).catch((err) =>
        console.error(
          `Failed to send push notification to user ${user.id}:`,
          err,
        ),
      ),
    ),
  );
}
