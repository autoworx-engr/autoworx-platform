"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { revalidatePath } from "next/cache";

export async function editVendor({
  id,
  name,
  email,
  phone,
  address,
  city,
  state,
  zip,
  company,
  website,
  notes,
  countryCode,
}: {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  company?: string;
  website?: string;
  notes?: string;
  countryCode?: string;
}): Promise<ServerAction> {
  const updatedVendor = await db.vendor.update({
    where: { id },
    data: {
      name,
      email,
      phone,
      address,
      city,
      state,
      zip,
      companyName: company,
      website,
      notes,
      countryCode: countryCode,
    },
  });

  revalidatePath("/inventory/vendor");

  return {
    type: "success",
    data: updatedVendor,
  };
}
