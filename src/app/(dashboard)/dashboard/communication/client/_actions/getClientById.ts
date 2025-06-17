"use server";
import { db } from "@/lib/db";
import { cache } from "react";

export const getClientById = cache(async (clientId: number) => {
  try {
    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        conversationsTrack: true,
      },
    });
    return client;
  } catch (error) {
    throw error;
  }
});
