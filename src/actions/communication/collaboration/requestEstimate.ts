"use server";

import { db } from "@/lib/db";
import { InvoiceType, Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { headers } from "next/headers";

type TEstimateData = {
  model: string;
  year: number;
  make: string;
  serviceRequest: string;
  dueDate: string;
  notes: string;
  receiverCompanyId: number;
  senderCompanyId: number;
  messageText?: string;
  senderId?: number;
};

export const requestEstimate = async (
  formDataForPhoto: FormData,
  requestEstimateData: TEstimateData,
) => {
  try {
    // Upload photos BEFORE opening the transaction. Holding a DB connection
    // open during a slow HTTP upload caused Prisma to time out the tx (~5s).
    let photoPaths: string[] = [];
    const files = formDataForPhoto.getAll("file");
    const hasFiles =
      files.length > 0 &&
      files.some((f) => f instanceof Blob && (f as Blob).size > 0);

    if (hasFiles) {
      const origin = (await headers()).get("origin");
      const res = await fetch(`${origin}/api/upload`, {
        method: "POST",
        body: formDataForPhoto,
      });
      if (!res.ok) throw new Error("Failed to upload photos");
      const json = await res.json();
      photoPaths = json.data ?? [];
    }

    const { requestEstimateFromDB } = await db.$transaction(
      async (prisma) => {
        const senderCompanyDataFromDB = await prisma.company.findUnique({
          where: { id: requestEstimateData.senderCompanyId },
          select: { name: true, email: true, phone: true },
        });

        // Reuse existing fromRequest client when present
        let client = await prisma.client.findFirst({
          where: {
            fromRequestedCompanyId: requestEstimateData.senderCompanyId,
          },
        });
        if (!client) {
          client = await prisma.client.create({
            data: {
              companyId: requestEstimateData.receiverCompanyId,
              firstName: senderCompanyDataFromDB?.name ?? "",
              lastName: "",
              fromRequest: true,
              fromRequestedCompanyId: requestEstimateData.senderCompanyId,
              email: senderCompanyDataFromDB?.email,
              mobile: senderCompanyDataFromDB?.phone,
              isSalesAgent: true,
            },
          });
        }

        const vehicle = await prisma.vehicle.create({
          data: {
            model: requestEstimateData.model,
            make: requestEstimateData.make,
            year: requestEstimateData.year,
            companyId: requestEstimateData.receiverCompanyId,
            clientId: client.id,
            fromRequest: true,
            fromRequestedCompanyId: requestEstimateData.senderCompanyId,
          },
        });

        const defaultColumn = await prisma.column.findFirst({
          where: {
            title: "Pending",
            type: "shop",
            companyId: requestEstimateData.receiverCompanyId,
          },
          select: { id: true },
        });
        if (!defaultColumn) {
          throw new Error("Default column not found");
        }

        const estimate = await prisma.invoice.create({
          data: {
            id: customAlphabet("1234567890", 10)(),
            vehicleId: vehicle.id,
            companyId: requestEstimateData.receiverCompanyId,
            internalNotes: requestEstimateData.notes,
            type: InvoiceType.Estimate,
            fromRequest: true,
            fromRequestedCompanyId: requestEstimateData.senderCompanyId,
            clientId: client.id,
            columnId: defaultColumn.id,
          },
        });

        const service = await prisma.service.create({
          data: {
            name: requestEstimateData.serviceRequest,
            companyId: requestEstimateData.receiverCompanyId,
            fromRequest: true,
            fromRequestedCompanyId: requestEstimateData.senderCompanyId,
          },
        });

        await prisma.invoiceItem.create({
          data: { invoiceId: estimate.id, serviceId: service.id },
        });

        const requestEstimateFromDB = await prisma.requestEstimate.create({
          data: {
            invoiceId: estimate.id,
            senderCompanyId: requestEstimateData.senderCompanyId,
            receiverCompanyId: requestEstimateData.receiverCompanyId,
            serviceId: service.id,
            vehicleId: vehicle.id,
          },
        });

        await prisma.invoice.update({
          where: { id: estimate.id },
          data: { requestEstimateId: requestEstimateFromDB.id },
        });

        if (photoPaths.length > 0) {
          await prisma.invoicePhoto.createMany({
            data: photoPaths.map((photo) => ({
              invoiceId: estimate.id,
              photo,
            })),
          });
        }

        return { requestEstimateFromDB };
      },
      { timeout: 15000 },
    );

    return { status: 200, data: { requestEstimateFromDB } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientUnknownRequestError ||
      err instanceof Prisma.PrismaClientKnownRequestError
    ) {
      throw new Error("something went wrong from db");
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    throw new Error(`Error: ${message}`);
  }
};
