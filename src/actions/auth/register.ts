"use server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { defaultColumnWithColor } from "@/lib/defaultColumns";
import generateZapierToken from "@/lib/generateZapierToken";

import { insertPreloadedData } from "@/lib/insertPreloadedData";
import { TErrorHandler } from "@/types/globalError";
import { registerRequestValidation } from "@/validations/schemas/auth/user.validation";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { Prisma } from "@prisma/client";
import { initialCreateBookingForm } from "../settings/bookingForm";
import { uploadNotificationSettings } from "../settings/updateNotification";

interface RegisterData {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  company: string;
  accessCode: string;
  timezone?: string;
}

interface Response {
  success?: boolean;
  error?: TErrorHandler;
}

const ACCESS_CODE = process.env.ACCESS_CODE;

const insertDefaultColumns = async (
  companyId: number,
  type: string,
  tx: Prisma.TransactionClient,
) => {
  const columnsForType = defaultColumnWithColor.filter(
    (column) => column.type === type,
  );

  await tx.column.createMany({
    data: columnsForType.map((column) => ({ ...column, companyId })),
    skipDuplicates: true,
  });
};

export async function register({
  firstName,
  lastName,
  email,
  password,
  company,
  accessCode,
  timezone,
}: RegisterData): Promise<Response> {
  try {
    // Validated here as well as at the route: the action is callable directly,
    // so it cannot rely on its caller having checked the input.
    const userInfo = await registerRequestValidation.parseAsync({
      firstName,
      lastName,
      email,
      password,
      company,
      accessCode,
      timezone,
    });

    if (accessCode !== ACCESS_CODE) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid access code");
    }

    const userEmail = userInfo.email;

    const existingUser = await db.user.findUnique({
      where: { email: userEmail },
    });

    if (existingUser) {
      throw new AppError(httpStatus.NOT_FOUND, "User already exist!");
    }

    const SALT_ROUNDS = Number(process.env.SALT_ROUNDS ?? 12);
    const hashedPassword = await bcrypt.hash(userInfo.password, SALT_ROUNDS);

    await db.$transaction(
      async (tx) => {
        const newCompany = await tx.company.create({
          data: {
            name: userInfo.company,
            zapierToken: generateZapierToken(),
            timezone: userInfo.timezone,
          },
        });

        await tx.companyPermissionModule.createMany({
          data: [
            {
              title: "Communication Hub: Internal",
              permission_name: "communicationHubInternal",
              enabled: true,
            },
            {
              title: "Communication Hub: Clients",
              permission_name: "communicationHubClients",
              enabled: true,
            },
            {
              title: "Communication Hub: Collaboration",
              permission_name: "communicationHubCollaboration",
              enabled: true,
            },
            {
              title: "Calling Access",
              permission_name: "callingAccess",
              enabled: true,
            },
            {
              title: "Estimates & Invoices",
              permission_name: "estimateInvoices",
              enabled: true,
            },
            {
              title: "Calendar & Task",
              permission_name: "calendar",
              enabled: true,
            },
            { title: "Payments", permission_name: "payments", enabled: true },
            { title: "Directory", permission_name: "directory", enabled: true },
            {
              title: "Directory (Client)",
              permission_name: "clientDirectory",
              enabled: true,
            },
            {
              title: "Directory (Employee)",
              permission_name: "employeeDirectory",
              enabled: true,
            },
            {
              title: "Directory (Fleet)",
              permission_name: "fleetDirectory",
              enabled: true,
            },
            {
              title: "Reporting & Analytics",
              permission_name: "reporting",
              enabled: true,
            },
            { title: "Inventory", permission_name: "inventory", enabled: true },
            {
              title: "Integrations",
              permission_name: "integrations",
              enabled: true,
            },
            {
              title: "All Automation",
              permission_name: "automation",
              enabled: true,
            },
            {
              title: "Shop Pipeline",
              permission_name: "shopPipeline",
              enabled: true,
            },
            {
              title: "Sales Pipeline",
              permission_name: "salesPipeline",
              enabled: true,
            },
            {
              title: "Team Pipeline",
              permission_name: "teamPipeline",
              enabled: true,
            },
            {
              title: "Business Settings",
              permission_name: "businessSettings",
              enabled: true,
            },
            {
              title: "Communication",
              permission_name: "communication",
              enabled: true,
            },
            {
              title: "Workforce Management",
              permission_name: "workforceManagement",
              enabled: true,
            },
            {
              title: "Service Estimator",
              permission_name: "serviceEstimator",
              enabled: true,
            },
            {
              title: "Pipeline Automation",
              permission_name: "pipelineAutomation",
              enabled: true,
            },
            {
              title: "Marketing Automation",
              permission_name: "marketingAutomation",
              enabled: true,
            },
            {
              title: "Communication Automation",
              permission_name: "communicationAutomation",
              enabled: true,
            },
            {
              title: "Invoice Automation",
              permission_name: "invoiceAutomation",
              enabled: true,
            },
            {
              title: "Inventory Automation",
              permission_name: "inventoryAutomation",
              enabled: true,
            },
            {
              title: "Service Automation",
              permission_name: "serviceAutomation",
              enabled: true,
            },
            {
              title: "Tag Automation",
              permission_name: "tagAutomation",
              enabled: true,
            },
            {
              title: "Reporting Automation",
              permission_name: "reportingAutomation",
              enabled: true,
            },
          ].map((perm) => ({ ...perm, companyId: newCompany.id })),
          skipDuplicates: true,
        });

        const createdUser = await tx.user.create({
          data: {
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            email: userEmail,
            password: hashedPassword,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            companyId: newCompany.id,
            joinDate: new Date(),
          },
        });

        await Promise.all([
          tx.permissionForManager.create({
            data: { companyId: newCompany.id },
          }),
          tx.permissionForSales.create({ data: { companyId: newCompany.id } }),
          tx.permissionForTechnician.create({
            data: { companyId: newCompany.id },
          }),
          tx.permissionForOther.create({ data: { companyId: newCompany.id } }),
        ]);

        await tx.calendarSettings.create({
          data: {
            companyId: newCompany.id,
            weekStart: "Sunday",
            dayStart: "10:00",
            dayEnd: "18:00",
            weekend1: "Saturday",
            weekend2: "Sunday",
          },
        });

        await uploadNotificationSettings(
          createdUser.id,
          createdUser.employeeType,
          newCompany.id,
          tx,
        );

        await Promise.all([
          insertDefaultColumns(newCompany.id, "sales", tx),
          insertDefaultColumns(newCompany.id, "shop", tx),
        ]);

        await insertPreloadedData(newCompany.id, tx);

        await tx.companyEmailTemplate.create({
          data: {
            subject: `Estimate for services requested at <BUSINESS_NAME>`,
            message: `Hey <CLIENT>, your estimate for <VEHICLE> is ready. If everything looks good, please approve it so we can move forward. Thanks!– <BUSINESS_NAME>`,
            companyId: newCompany.id,
          },
        });

        await initialCreateBookingForm(newCompany.id, tx);
      },
      { timeout: 15000 },
    );

    return { success: true };
  } catch (err) {
    console.error("Error found while creating new user");
    console.error("The error: ", err);
    console.log({ err: errorHandler(err) });
    throw err;
  }
}
