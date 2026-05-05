"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { createVendorValidationSchema } from "@/validations/schemas/vendor/vendor.validation";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function newVendor({
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
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  company: string;
  website?: string;
  notes?: string;
  countryCode?: string;
}): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const validatedVendorData = await createVendorValidationSchema.parseAsync({
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
    });

    const newVendor = await db.vendor.create({
      data: {
        name: validatedVendorData.name,
        email: validatedVendorData.email,
        phone: validatedVendorData.phone,
        address: validatedVendorData.address,
        city: validatedVendorData.city,
        state: validatedVendorData.state,
        zip: validatedVendorData.zip,
        companyName: validatedVendorData.companyName,
        website: validatedVendorData.website,
        notes: validatedVendorData.notes,
        companyId,
        countryCode: countryCode,
      },
    });

    revalidatePath("/inventory/vendor");

    return {
      type: "success",
      data: newVendor,
    };
  } catch (err) {
    return errorHandler(err);
  }
}
