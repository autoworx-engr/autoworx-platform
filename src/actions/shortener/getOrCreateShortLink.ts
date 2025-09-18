"use server";

import { getOrCreateInvoiceShortLink } from "@/lib/shortener";
import getUser from "@/lib/getUser";

export async function getOrCreateShortLinkAction({
  invoiceId,
  clientName,
}: {
  invoiceId: string;
  clientName?: string;
}) {
  try {
    const user = await getUser();
    
    const result = await getOrCreateInvoiceShortLink(
      invoiceId,
      clientName,
      user.id,
      user.companyId
    );

    return result;
  } catch (error) {
    console.error("Error in getOrCreateShortLinkAction:", error);
    return {
      success: false,
      error: "Failed to create short link",
      originalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId}`
    };
  }
}
