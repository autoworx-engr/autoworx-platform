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
      include: {
        invoice: true,
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

export const getInvoiceTags = async (companyId?: number) => {
  try {
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId) {
      const session = await getServerSession(authOptions);
      resolvedCompanyId = session?.user.companyId;
    }

    if (!resolvedCompanyId) {
      throw new Error("Company ID is required");
    }

    // Fetch tags belonging to this company that are intended for invoices (GENERAL)
    const tags = await db.tag.findMany({
      where: {
        companyId: resolvedCompanyId,
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

export const createInvoiceTag = async (
  name: string,
  companyId: number,
  textColor: string = "#000000",
  bgColor: string = "#e5e7eb",
): Promise<
  | { type: "success"; data: { id: number; name: string } }
  | { type: "error"; message: string }
> => {
  try {
    const tag = await db.tag.create({
      data: {
        name,
        type: "GENERAL",
        companyId,
        textColor,
        bgColor,
      },
      select: { id: true, name: true },
    });
    return { type: "success", data: tag };
  } catch (error) {
    console.error("Error creating invoice tag:", error);
    return { type: "error", message: "Failed to create invoice tag" };
  }
};
