"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { Client, MailgunEmail } from "@prisma/client";

type TClient = Client & {
  MailgunEmail: (MailgunEmail & { client: Client })[];
};

const sortClientsByLatestEmail = (clients: TClient[]) => {
  return clients.slice().sort((a, b) => {
    const aHasEmails = a.MailgunEmail && a.MailgunEmail.length > 0;
    const bHasEmails = b.MailgunEmail && b.MailgunEmail.length > 0;

    // Get latest email date
    const aLastEmailDate = aHasEmails
      ? new Date(a.MailgunEmail[0].createdAt).getTime()
      : new Date("1970-01-01").getTime();

    const bLastEmailDate = bHasEmails
      ? new Date(b.MailgunEmail[0].createdAt).getTime()
      : new Date("1970-01-01").getTime();

    if (bLastEmailDate === aLastEmailDate) {
      return b.id - a.id;
    }

    return bLastEmailDate - aLastEmailDate;
  });
};

export async function getClientMessages(page: number = 1, search: string = "") {
  const user = await getUser();
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: any = {
    companyId: user.companyId,
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ];
  }

  // Step 1: Fetch ALL clients with their latest email
  const allClients = await db.client.findMany({
    where,
    include: {
      MailgunEmail: {
        orderBy: { createdAt: "desc" },
        take: 1, // Only get the latest email
        include: { client: true },
      },
    },
  });

  // Step 2: Sort ALL clients consistently
  const sortedClients = sortClientsByLatestEmail(allClients);

  // Step 3: Paginate AFTER sorting
  const paginatedClients = sortedClients.slice(skip, skip + limit);

  return {
    messages: paginatedClients,
    total: sortedClients.length,
    hasMore: skip + paginatedClients.length < sortedClients.length,
    
  };
}
