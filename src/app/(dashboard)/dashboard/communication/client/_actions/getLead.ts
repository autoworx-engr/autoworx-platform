"use server";
import { db } from "@/lib/db";

export const getLead = async (leadId: number) => {
  try {
    const lead = db.lead.findUnique({
      where: { id: leadId },
      select: {
        isLead: true,
        services: true,
      },
    });
    return lead;
  } catch (err) {
    throw err;
  }
};
