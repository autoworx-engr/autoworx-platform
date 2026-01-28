"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const starUnstarClient = async ({
  clientId,
  state,
}: {
  clientId: number;
  state: boolean;
}) => {
  try {
    let companyId = await getCompanyId();
    await db.client.update({
      where: {
        id: clientId,
        companyId,
      },
      data: {
        isStarred: state,
      },
    });
    // TODO: test for client-demo
    revalidatePath("/dashboard/communication/client");
    return { success: true };
  } catch (error) {
    console.error("", error);
    return { success: false };
  }
};
