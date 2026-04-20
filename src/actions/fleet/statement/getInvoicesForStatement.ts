"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { calcStatementTotals } from "@/lib/fleet/calcStatementTotals";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

export async function getUnpaidInvoicesForFleet(
  fleetId: number,
): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required");
    }

    // Verify fleet exists and belongs to company
    const fleet = await db.fleet.findFirst({
      where: {
        id: fleetId,
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

    // Get unpaid invoices for the fleet client that are not already in a statement
    const unpaidInvoices = await db.invoice.findMany({
      where: {
        clientId: fleet.clientId,
        companyId: companyId,
        due: {
          gt: 0, // Only unpaid invoices
        },
        fleetStatementId: null, // Not already in a statement
        type: "Invoice", // Only invoices, not estimates
      },
      include: {
        vehicle: true,
        client: true,
        column: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      type: "success",
      message: "Unpaid invoices retrieved successfully",
      data: unpaidInvoices,
    };
  } catch (error: unknown) {
    return errorHandler(error);
  }
}

export async function getFleetStatements(
  fleetId?: number,
): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const whereClause: Prisma.FleetStatementWhereInput = {
      Fleet: {
        client: {
          companyId: companyId,
        },
      },
    };

    if (fleetId) {
      whereClause.fleetId = fleetId;
    }

    const statements = await db.fleetStatement.findMany({
      where: whereClause,
      include: {
        Fleet: {
          include: {
            client: true,
          },
        },
        invoice: {
          include: {
            vehicle: true,
            client: true,
            column: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const statementsWithTotals = statements.map((statement) => ({
      ...statement,
      totals: calcStatementTotals(statement.invoice),
    }));

    return {
      type: "success",
      message: "Fleet statements retrieved successfully",
      data: statementsWithTotals,
    };
  } catch (error: unknown) {
    return errorHandler(error);
  }
}
