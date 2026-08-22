"use server";
import { db } from "@/lib/db";

export default async function getClientByUnreadMsg(companyId: number) {
  try {
    const getClientByUnreadMessage = await db.client.findMany({
      where: {
        AND: [
          {
            companyId,
          },
          {
            conversationsTrack: {
              OR: [
                { smsIsRead: false },
                { emailIsRead: false },
                { messengerIsRead: false },
                { instagramIsRead: false },
              ],
            },
          },
        ],
      },
      include: {
        conversationsTrack: true,
      },
    });
    return getClientByUnreadMessage.map((unreadClient) => {
      return { ...unreadClient.conversationsTrack };
    });
  } catch (err) {
    console.log(err);
  }
}
