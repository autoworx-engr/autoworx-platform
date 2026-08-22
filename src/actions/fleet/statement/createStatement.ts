"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { createFleetStatementValidationSchema } from "@/validations/schemas/fleet/statement.validation";
import { customAlphabet } from "nanoid";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function createFleetStatement(data: {
  fleetId: number;
  invoiceIds: string[];
}): Promise<ServerAction | TErrorHandler> {
  try {
    // Validate input
    await createFleetStatementValidationSchema.parseAsync(data);

    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create a fleet statement");
    }

    // Verify fleet exists and belongs to company
    const fleet = await db.fleet.findFirst({
      where: {
        id: data.fleetId,
        client: {
          companyId: companyId,
        },
      },
      include: {
        client: true,
      },
    });

    if (!fleet) {
      throw new Error("Fleet not found or doesn't belong to your company");
    }

    // Verify all invoices exist, belong to the fleet's client, and are unpaid
    const invoices = await db.invoice.findMany({
      where: {
        id: {
          in: data.invoiceIds,
        },
        clientId: fleet.clientId,
        companyId: companyId,
        due: {
          gt: 0, // Only unpaid invoices
        },
        fleetStatementId: null, // Not already in a statement
      },
      include: {
        vehicle: true,
        client: true,
      },
    });

    if (invoices.length !== data.invoiceIds.length) {
      throw new Error(
        "Some invoices are not found, don't belong to the fleet, are already paid, or are already in a statement",
      );
    }

    // Create the fleet statement
    const fleetStatement = await db.$transaction(async (tx) => {
      // Create the statement
      const statementId = customAlphabet("1234567890", 10)();
      const statement = await tx.fleetStatement.create({
        data: {
          id: statementId,
          fleetId: data.fleetId,
        },
      });

      // Update invoices to link them to the statement
      await tx.invoice.updateMany({
        where: {
          id: {
            in: data.invoiceIds,
          },
        },
        data: {
          fleetStatementId: statement.id,
        },
      });

      return statement;
    });

    revalidatePath("/dashboard/fleet");

    return {
      type: "success",
      message: "Fleet statement created successfully",
      data: fleetStatement,
    };
  } catch (error: any) {
    // console.error("Error creating fleet statement:", error);
    return errorHandler(error);
  }
}
