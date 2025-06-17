"use server";

import { db } from "@/lib/db";

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
