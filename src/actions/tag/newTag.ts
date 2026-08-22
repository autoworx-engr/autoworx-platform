"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { getServerSession } from "next-auth";

export default async function newTag({
  name,
  textColor,
  bgColor,
  type = "GENERAL",
  companyId: companyIdParam,
}: {
  name: string;
  textColor?: string;
  bgColor?: string;
  type?: "GENERAL" | "SALES" | "CLIENT" | "INVENTORY";
  companyId?: number;
}): Promise<ServerAction> {
  const session = await getServerSession(authOptions);
  const companyId = companyIdParam ?? session?.user.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to create an tag.");
  }
  const isExist = await db.tag.findFirst({
    where: {
      companyId,
      name: {
        equals: name.trim(),
      },
      type,
    },
  });

  if (isExist) {
    return {
      type: "error",
      message: "This tag already exists.",
    };
  }
  const newTag = await db.tag.create({
    data: {
      companyId,
      name,
      textColor: textColor || "black",
      bgColor: bgColor || "white",
      type,
    },
  });

  // revalidatePath("/estimate/create");
  // revalidatePath("/estimate/edit");

  return {
    type: "success",
    data: newTag,
  };
}
