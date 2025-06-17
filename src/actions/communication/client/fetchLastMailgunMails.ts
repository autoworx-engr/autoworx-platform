"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export const fetchLastMailsMailgun = async () => {
  try {
    const lastMailgunMails = await db.mailgunEmail.findMany({
      where: {
        clientId: { not: undefined },
      },
      distinct: ["clientId"],
      orderBy: {
        createdAt: "desc", // Ensures latest email is picked
      },
      include: {
        client: true, // Include client details if needed
      },
    });

    return { success: true, data: lastMailgunMails };
  } catch (error) {
    console.error("", error);
    return { success: false };
  }
};

export const getUnreadMessageCount = async () => {
  try {
    const companyId = await getCompanyId();
    let count = 0;
    const lastMailgunMails = (await fetchLastMailsMailgun())?.data ?? [];
    const clients = await db.client.findMany({
      where: { companyId },
      include: {
        MailgunEmail: {
          orderBy: {
            createdAt: "desc", // Assuming createdAt is the timestamp for the email
          },
          take: 1, // Get only the latest email for each client
        },
      },
    });
    const filteredClients = clients.filter((client: any) => {
      const isLastMailRead = lastMailgunMails?.find((mail) => {
        if (
          mail.clientId === client.id &&
          mail.emailBy === "Client" &&
          mail.id !== client?.lastMailgunEmailReadId
        ) {
          return true;
        } else {
          return false;
        }
      });
      if (isLastMailRead) {
        count++;

        return true;
      } else {
        return false;
      }
    });
    return { success: true, data: count };
  } catch (error) {
    console.error("", error);
    return { success: false };
  }
};

// export const revalidate = 5000;
