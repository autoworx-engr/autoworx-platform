"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

type TGetClientByScrollProps = {
  skip: number;
  take: number;
};

export const getClientByScroll = async ({
  skip,
  take,
}: TGetClientByScrollProps) => {
  try {
    const companyId = await getCompanyId();
    let clients = await db.client.findMany({
      where: {
        companyId,
      },
      orderBy: {
        conversationsTrack: {
          sendAt: "desc",
        },
      },
      skip: skip,
      take: take,
      include: {
        conversationsTrack: true,
      },
    });

    return clients;
  } catch (err) {
    throw err;
  }
};
