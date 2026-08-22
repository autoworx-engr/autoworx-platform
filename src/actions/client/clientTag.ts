"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";

// Get client tags only
export const getClientTags = async () => {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const tags = await db.tag.findMany({
      where: {
        companyId: companyId,
        type: "CLIENT",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { type: "success", data: tags };
  } catch (error) {
    console.error("Error fetching client tags:", error);
    return { type: "error", message: "Failed to fetch client tags" };
  }
};

// Create a new client tag
export const createClientTag = async (data: {
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

    const newTag = await db.tag.create({
      data: {
        name: data.name,
        textColor: data.textColor || "#000000",
        bgColor: data.bgColor || "#ffffff",
        type: "CLIENT",
        companyId: companyId,
      },
    });

    return { type: "success", data: newTag };
  } catch (error) {
    // console.error("Error creating client tag:", error);
    return { type: "error", message: "Failed to create client tag" };
  }
};

// Delete a client tag
export const deleteClientTag = async (tagId: number) => {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const result = await db.tag.deleteMany({
      where: {
        id: tagId,
        companyId: companyId,
        type: "CLIENT",
      },
    });

    if (result.count === 0) {
      return { type: "error", message: "Tag not found or not authorized" };
    }

    return { type: "success", message: "Client tag deleted successfully" };
  } catch (error) {
    // console.error("Error deleting client tag:", error);
    return { type: "error", message: "Failed to delete client tag" };
  }
};
