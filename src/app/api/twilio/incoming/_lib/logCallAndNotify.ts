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

  const companyUsers = await db.user.findMany({
    where: {
      companyId,
      employeeType: { in: ["Admin", "Manager", "Sales"] },
    },
    select: { id: true },
    take: 1000,
  });

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
