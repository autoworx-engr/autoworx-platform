"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { cache } from "react";

export const fetchMailsMailgun = cache(
  async (clientId: number, companyId?: number) => {
    try {
      let cId = companyId || (await getCompanyId());
      const mailgunMails = await db.mailgunEmail.findMany({
        where: {
          clientId: clientId,
          companyId: cId,
        },
        include: {
          attachments: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return { success: true, data: mailgunMails };
    } catch (error) {
      console.error("", error);
      return { success: false };
    }
  }
);

export const updateLastMailReadId = async ({
  clientId,
  companyId,
}: {
  clientId: number;
  companyId?: number;
}) => {
  try {
    let cId = companyId || (await getCompanyId());
    const mailgunMails = await db.mailgunEmail.findMany({
      where: {
        clientId: clientId,
        companyId: cId,
      },
      select: {
        id: true,
        emailBy: true,
      },
    });

    if (mailgunMails.length > 0 && mailgunMails.at(-1)?.emailBy === "Client") {
      await db.client.update({
        where: {
          id: clientId,
        },
        data: {
          lastMailgunEmailReadId: mailgunMails.at(-1)?.id,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("", error);
    return { success: false };
  }
};

// export const revalidate = 5000;
