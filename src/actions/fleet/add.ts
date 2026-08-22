"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  normalizePhoneForStorage,
  phoneLookupWhereClause,
} from "@/utils/normalizePhone";
import { createFleetValidationSchema } from "@/validations/schemas/fleet/fleet.validation";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function addFleet(data: {
  fleetName: string;
  contactName: string;
  email: string;
  mobile: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  tagId?: number;
  photo?: string;
  preferredPaymentTerm?: string | null;
  countryCode?: string;
}): Promise<ServerAction | TErrorHandler> {
  try {
    await createFleetValidationSchema.parseAsync(data);
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create an email template.");
    }

    if (!data.mobile) {
      throw new Error(" Mobile is required to create an sms template.");
    }
    if (!data.email) {
      throw new Error("Email is required to create an email template.");
    }
    if (!data.fleetName) {
      throw new Error("Fleet name is required!.");
    }
    if (!data.contactName) {
      throw new Error("Contact name is required!.");
    }

    if (data.email) {
      const existingCustomer = await db.client.findFirst({
        where: { email: data.email, companyId },
        include: {
          fleet: true,
        },
      });

      if (existingCustomer && existingCustomer.isFleet == false) {
        return {
          type: "globalError",
          message: `Email already linked to ${existingCustomer.firstName} ${existingCustomer.lastName}. Mark "Add as Fleet" in the client page and update.`,
        };
      }
      if (existingCustomer && existingCustomer.isFleet == true) {
        return {
          type: "globalError",
          message: `The email is already used for an existing fleet (${existingCustomer.fleet?.fleetName}).`,
        };
      }
    }

    const phoneLookup = phoneLookupWhereClause(data.mobile);
    if (phoneLookup) {
      const existingCustomerByMobile = await db.client.findFirst({
        where: { companyId, OR: phoneLookup },
        include: {
          fleet: true,
        },
      });

      if (
        existingCustomerByMobile &&
        existingCustomerByMobile.isFleet == false
      ) {
        return {
          type: "globalError",
          message: `The mobile number is already used for an existing client ${existingCustomerByMobile.firstName + " " + existingCustomerByMobile.lastName}. Please go to the client page and check "Add as a Fleet" to update the client as a fleet.`,
        };
      }
      if (
        existingCustomerByMobile &&
        existingCustomerByMobile.isFleet == true
      ) {
        return {
          type: "globalError",
          message: `The mobile number is already used for an existing fleet (${existingCustomerByMobile.fleet?.fleetName}).`,
        };
      }
    }

    const [firstName, lastName] = data.fleetName.split(" ");

    const fleet = await db.$transaction(async (tx) => {
      const newCustomer = await tx.client.create({
        data: {
          firstName,
          lastName: lastName || " ",
          mobile: data.mobile
            ? normalizePhoneForStorage(data.mobile)
            : data.mobile,
          email: data.email,
          companyId: companyId,
          tagId: data.tagId || null,
          photo: data.photo || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zip: data.zip || undefined,
          isFleet: true,
          countryCode: data.countryCode,
          isSalesAgent: true,
        },
      });

      const fleet = await tx.fleet.create({
        data: {
          clientId: newCustomer.id,
          fleetName: data.fleetName,
          contactName: data.contactName,
          preferredPaymentTerm: data?.preferredPaymentTerm || null,
        },
      });

      return { fleet };
    });

    revalidatePath("/dashboard/fleet");

    return { type: "success", data: fleet };
  } catch (error: any) {
    return errorHandler(error);
  }
}
