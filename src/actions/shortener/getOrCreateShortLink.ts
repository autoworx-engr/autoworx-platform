"use server";

import {
  getOrCreateFleetShortLink,
  getOrCreateInvoiceShortLink,
} from "@/lib/shortener";
import getUser from "@/lib/getUser";

export async function getOrCreateShortLinkAction({
  invoiceId,
  clientName,
  isFleetStatement,
}: {
  invoiceId: string;
  clientName?: string;
  isFleetStatement?: boolean;
}) {
  try {
    const user = await getUser();

    let result;
    if (isFleetStatement) {
      result = await getOrCreateFleetShortLink(
        invoiceId,
        clientName,
        user.id,
        user.companyId,
      );
    } else {
      result = await getOrCreateInvoiceShortLink(
        invoiceId,
        clientName,
        user.id,
        user.companyId,
      );
    }

    return result;
  } catch (error) {
    console.error("Error in getOrCreateShortLinkAction:", error);
    const fallbackPath = isFleetStatement ? "public-invoice" : "public-invoice";
    const query = isFleetStatement ? "?fleet=true" : "";
    return {
      success: false,
      error: "Failed to create short link",
      originalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${fallbackPath}/${invoiceId}${query}`,
    };
  }
}
