"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const starUnstarClient = async ({
  clientId,
  state,
  companyId,
}: {
  clientId: number;
  state: boolean;
  companyId?: number;
}) => {
  try {
    let cId = companyId || (await getCompanyId());
    await db.client.update({
      where: {
        id: clientId,
        companyId: cId,
      },
      data: {
        isStarred: state,
      },
    });
    // TODO: test for client-demo
    revalidatePath("/dashboard/communication/client/${clientId}");
    return { success: true };
  } catch (error) {
    console.error("", error);
    return { success: false };
  }
};
