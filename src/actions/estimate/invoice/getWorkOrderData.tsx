"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import {
  Client,
  Column,
  Company,
  Invoice,
  InvoiceItem,
  InvoicePhoto,
  Task,
  Technician,
  User,
  Vehicle,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { getTechniciansWithPermission } from "../technician/getTechniciansWithPermission";

export interface IWorkOrderData {
  invoice: Invoice & {
    company: Company;
    invoiceItems: InvoiceItem[];
    photos: InvoicePhoto[];
    tasks: Task[];
    user: User;
    client: Client;
    column: Column;
    vehicle: Vehicle;
  };
  invoiceTechnicians: (Technician & { name: string; hasPermission: boolean })[];
  company: Company;
  writePermission: boolean;
}

export async function getWorkOrderData(id: string) {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        invoiceItems: {
          include: {
            service: true,
            materials: true,
            labor: true,
          },
        },
        photos: true,
        tasks: true,
        user: true,
        client: true,
        column: true,
        vehicle: true,
      },
    });

    if (!invoice) {
      throw Error("Invoice not found! It's probably a server side error");
    }

    const invoiceTechnicians = await getTechniciansWithPermission({
      invoiceId: invoice?.id,
    });

    // get the current user
    const session = await getServerSession(authOptions);
    const user = await db.user.findUnique({
      where: { id: Number(session?.user?.id) },
    });

    return {
      invoice,
      invoiceTechnicians,
      company: invoice.company,
      writePermission:
        user?.employeeType === "Admin" || user?.employeeType === "Manager",
    };
  } catch (err) {
    return errorHandler(err);
  }
}
