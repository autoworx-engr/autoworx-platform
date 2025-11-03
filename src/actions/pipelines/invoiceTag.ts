"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export const saveInvoiceTag = async (invoiceId: string, tagId: number) => {
  try {
    const result = await db.invoiceTags.create({
      data: {
        invoiceId: invoiceId,
        tagId: tagId,
      },
    });
    return result;
  } catch (error) {
    throw new Error("Invoice tag model");
  }
};

export const removeInvoiceTag = async (invoiceId: string, tagId: number) => {
  try {
    const result = await db.invoiceTags.deleteMany({
      where: {
        invoiceId: invoiceId,
        tagId: tagId,
      },
    });
    return result;
  } catch (error) {
    console.error("Error removing tag:", error);
    throw new Error("Failed to remove tag");
  }
};

export const getInvoiceTags = async () => {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required");
    }

    // Fetch tags belonging to this company that are intended for invoices (GENERAL)
    const tags = await db.tag.findMany({
      where: {
        companyId: companyId,
        type: "GENERAL",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { type: "success", data: tags };
  } catch (error) {
    console.error("Error fetching invoice tags:", error);
    return { type: "error", message: "Failed to fetch invoice tags" };
  }
};
