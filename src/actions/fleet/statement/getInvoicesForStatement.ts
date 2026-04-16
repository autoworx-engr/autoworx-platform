"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
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
  } catch (error: any) {
    console.error("Error getting unpaid invoices for fleet:", error);
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

    const whereClause: any = {
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

    // Calculate totals for each statement
    const statementsWithTotals = statements.map((statement) => {
      const totalAmount = statement.invoice.reduce(
        (sum, invoice) => sum + Number(invoice.grandTotal || 0),
        0,
      );

      const totalPaid = statement.invoice.reduce(
        (sum, invoice) => sum + Number(invoice.totalPayment || 0),
        0,
      );

      const totalDue = statement.invoice.reduce(
        (sum, invoice) => sum + Number(invoice.due || 0),
        0,
      );

      return {
        ...statement,
        totals: {
          totalAmount,
          totalPaid,
          totalDue,
        },
      };
    });

    return {
      type: "success",
      message: "Fleet statements retrieved successfully",
      data: statementsWithTotals,
    };
  } catch (error: any) {
    console.error("Error getting fleet statements:", error);
    return errorHandler(error);
  }
}
