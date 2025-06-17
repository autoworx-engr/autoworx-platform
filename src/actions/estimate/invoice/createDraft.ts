"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Invoice } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function createDraftEstimate({
  id,
  clientId,
  vehicleId,
}: {
  id: string;
  clientId: number;
  vehicleId?: number;
}) {
  const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create an email template.");
    }

  let estimate: Invoice;

  const draftEstimate = await db.invoice.findFirst({
    where: {
      id,
    },
  });

  if (!draftEstimate) {
    // Get the "Pending" column id
    const columnId = await db.column.findFirst({
      where: {
        title: "Pending",
        companyId,
        type: "shop",
      },
    });

    if (!columnId) {
      // This should never happen
      throw new Error("Column not found");
    }

    if (vehicleId) {
      estimate = await db.invoice.create({
        data: {
          id,
          type: "Estimate",
          clientId,
          vehicleId,
          userId: session.user.id as any,
          companyId,
          columnId: columnId.id,
        },
      });
    } else {
      estimate = await db.invoice.create({
        data: {
          id,
          type: "Estimate",
          clientId,
          userId: session.user.id as any,
          companyId,
          columnId: columnId.id,
        },
      });
    }
    //udpate the lead to set estimateCreated to true
    const theClientofLead = await db.client.findUnique({
      where: {
        id: clientId,
      },
    });
    if (theClientofLead?.leadId) {
      await db.lead.update({
        where: {
          id: theClientofLead.leadId,
        },
        data: {
          isEstimateCreated: true,
        },
      });
    }
  } else {
    estimate = draftEstimate;
  }

  revalidatePath(`/dashboard/communication/client/${clientId}`);

  return {
    type: "success",
    data: estimate,
  };
}
