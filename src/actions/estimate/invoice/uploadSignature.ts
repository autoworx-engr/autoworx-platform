"use server";
import { db } from "@/lib/db";
import { authorizedLeadsConvertion } from "./authorizedLeadsConvertion";
import { revalidatePath } from "next/cache";
import { sendLeadStageChangeOrCloseNotification } from "@/lib/notification/pipeline-notify";

export async function uploadSignature(invoiceId: string, url: string) {
  try {
    const invoice = await db.invoice?.update({
      where: {
        id: invoiceId,
      },
      data: {
        signatureImage: url,
        type: "Invoice",
      },
      include: {
        client: true,
      },
    });
    if (invoice) {
      await authorizedLeadsConvertion(invoiceId);
      await sendLeadStageChangeOrCloseNotification({
        companyId: invoice?.companyId,
        description: `Lead "${invoice?.client?.firstName}" has been closed. Track it in your pipeline.`,
        title: "Lead Closed",
        notificationType: "LEADS_CLOSED",
      });
    }
    revalidatePath("/estimate");
    return { type: "success" };
  } catch (error) {
    console.error("Signature upload failed:", error);
    return { type: "error", message: "Signature upload failed" };
  }
}
