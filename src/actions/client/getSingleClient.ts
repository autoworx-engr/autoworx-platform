"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export default async function getSingleClient(id: number) {
  try {
    const companyId = await getCompanyId();

    const client = await db.client.findFirst({
      where: {
        id,
        companyId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        countryCode: true,
        photo: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        customerCompany: true,
        isFleet: true,
        createdAt: true,
        tag: {
          where: {
            type: "CLIENT",
          },
        },
        source: true,
      },
    });

    if (!client) {
      throw new Error(`Client with id ${id} not found`);
    }

    return client;
  } catch (error) {
    console.error("Error fetching client:", error);
    throw new Error("Failed to get client");
  }
}
