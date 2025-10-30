"use server";
import { db } from "@/lib/db";
import { authorizedLeadsConvertion } from "./authorizedLeadsConvertion";

export async function uploadSignature(invoiceId: string, url: string) {
  try {
    await db.invoice?.update({
      where: {
        id: invoiceId,
      },
      data: {
        signatureImage: url,
      },
    });
    await authorizedLeadsConvertion(invoiceId);
  } catch (error) {
    console.error("Failed to upload signature:", error);
    throw new Error("Signature upload failed");
  }
}
