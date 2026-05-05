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
  InvoiceRedo,
  Task,
  Technician,
  TechnicianImage,
  User,
  Vehicle,
  VehicleParts,
} from "@prisma/client";
import { getServerSession } from "next-auth";

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
  techniciansPerItem: Record<
    number,
    (Technician & {
      name: string;
      hasPermission: boolean;
      vehicleParts: VehicleParts[];
      images: TechnicianImage[];
    })[]
  >;
  // serviceId -> InvoiceRedo[]
  redoPerService: Record<number, InvoiceRedo[]>;
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

    const session = await getServerSession(authOptions);
    const user = await db.user.findUnique({
      where: { id: Number(session?.user?.id) },
    });

    const allTechnicians = await db.technician.findMany({
      where: {
        invoiceId: invoice.id,
      },
      include: {
        user: true,
        vehicleParts: true,
        images: true,
      },
    });

    const techniciansPerItem: Record<
      number,
      (Technician & {
        name: string;
        hasPermission: boolean;
        vehicleParts: VehicleParts[];
        images: TechnicianImage[];
      })[]
    > = {};

    allTechnicians.forEach((tech) => {
      const hasPermission =
        user?.id === tech.userId ||
        user?.employeeType === "Admin" ||
        user?.employeeType === "Manager";

      const name = `${tech.user?.firstName || "Unknown"} ${tech.user?.lastName || ""}`;

      if (!tech.invoiceItemId) return;

      if (!techniciansPerItem[tech.invoiceItemId]) {
        techniciansPerItem[tech.invoiceItemId] = [];
      }

      techniciansPerItem[tech.invoiceItemId].push({
        ...tech,
        name,
        hasPermission,
      });
    });

    const redoRecords = await db.invoiceRedo.findMany({
      where: { invoiceId: invoice.id },
    });

    const redoPerService: Record<number, typeof redoRecords> = {};
    redoRecords.forEach((redo) => {
      if (!redoPerService[redo.serviceId]) {
        redoPerService[redo.serviceId] = [];
      }
      redoPerService[redo.serviceId].push(redo);
    });

    return {
      invoice,
      invoiceTechnicians: Object.values(techniciansPerItem).flat(),
      techniciansPerItem,
      redoPerService,
      company: invoice.company,
      writePermission:
        user?.employeeType === "Admin" || user?.employeeType === "Manager",
    };
  } catch (err) {
    return errorHandler(err);
  }
}
