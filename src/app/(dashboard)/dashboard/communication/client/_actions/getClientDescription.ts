"use server";
import { fetchMailsMailgun } from "@/actions/communication/client/fetchMailgunMails";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export async function getClientDescription(
  clientId: number,
  companyId?: number,
) {
  try {
    const cId = companyId || (await getCompanyId());

    const companyUsersPromise = db.user.findMany({
      where: {
        companyId: cId,
      },
    });
    const conversationsPromise = fetchMailsMailgun(clientId);

    const [conversationsData, companyUsers] = await Promise.all([
      conversationsPromise,
      companyUsersPromise,
    ]);
    return {
      conversationsData,
      companyUsers,
    };
  } catch (err) {
    throw err;
  }
}
