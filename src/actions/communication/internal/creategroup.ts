"use server";

import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";

type TCreateGroup = {
  name: string;
  users: { id: number }[];
};

const pusher = getPusherInstance();

// create a new group with user
export const createGroup = async ({ name, users }: TCreateGroup) => {
  try {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return {
        status: 400,
        message: "Group name is required.",
      };
    }

    const existingGroup = await db.group.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (existingGroup) {
      return {
        status: 409,
        message: "Group name already exists.",
      };
    }

    const groupData = await db.group.create({
      data: {
        name: normalizedName,
        users: {
          connect: users,
        },
      },
      include: {
        users: true,
      },
    });

    if (groupData) {
      pusher.trigger("create-group", "create", {
        groupId: groupData.id,
        usersIds: users,
      });
    }
    // revalidatePath("/communication/internal");
    return { status: 200, data: groupData };
  } catch (err) {
    throw err;
  }
};
