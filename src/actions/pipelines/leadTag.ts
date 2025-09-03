"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";

export const saveLeadTag = async (leadId: number, tagId: number) => {
  try {
    const result = await db.leadTags.create({
      data: {
        leadId: leadId,
        tagId: tagId,
      },
    });
    return result;
  } catch (error) {
    throw new Error("Lead tag model");
  }
};

export const removeLeadTag = async (leadId: number, tagId: number) => {
  try {
    const result = await db.leadTags.deleteMany({
      where: {
        leadId: leadId,
        tagId: tagId,
      },
    });
    return result;
  } catch (error) {
    console.error("Error removing tag:", error);
    throw new Error("Failed to remove tag");
  }
};

// NEW: Get sales/lead tags only
export const getSalesTags = async () => {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const tags = await db.tag.findMany({
      where: {
        companyId: companyId,
        type: "SALES",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { type: "success", data: tags };
  } catch (error) {
    console.error("Error fetching sales tags:", error);
    return { type: "error", message: "Failed to fetch sales tags" };
  }
};

// NEW: Create a new sales tag
export const createSalesTag = async (data: {
  name: string;
  textColor?: string;
  bgColor?: string;
}) => {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const isExistingTag = await db.tag.findFirst({
      where: {
        name: data.name.trim(),
        companyId: companyId,
        type: "SALES",
      },
    });

    if (isExistingTag) {
      return { type: "error", message: "This tag is already exists" };
    }

    const newTag = await db.tag.create({
      data: {
        name: data.name,
        textColor: data.textColor || "#000000",
        bgColor: data.bgColor || "#ffffff",
        type: "SALES",
        companyId: companyId,
      },
    });

    return { type: "success", data: newTag };
  } catch (error) {
    // console.error("Error creating sales tag:", error);
    return { type: "error", message: "Failed to create sales tag" };
  }
};

// NEW: Delete a sales tag
export const deleteSalesTag = async (tagId: number) => {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required");
    }

    // Check if tag belongs to current company and is a sales tag
    const tag = await db.tag.findFirst({
      where: {
        id: tagId,
        companyId: companyId,
        type: "SALES",
      },
    });

    if (!tag) {
      throw new Error("Tag not found or not authorized");
    }

    await db.tag.delete({
      where: {
        id: tagId,
      },
    });

    return { type: "success", message: "Sales tag deleted successfully" };
  } catch (error) {
    console.error("Error deleting sales tag:", error);
    return { type: "error", message: "Failed to delete sales tag" };
  }
};
