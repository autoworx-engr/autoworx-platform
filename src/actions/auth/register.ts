"use server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { defaultColumnWithColor } from "@/lib/defaultColumns";
import generateZapierToken from "@/lib/generateZapierToken";

import { insertPreloadedData } from "@/lib/insertPreloadedData";
import { TErrorHandler } from "@/types/globalError";
import { createUserValidation } from "@/validations/schemas/auth/user.validation";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { env } from "next-runtime-env";
import { initialCreateBookingForm } from "../settings/bookingForm";
import { uploadNotificationSettings } from "../settings/updateNotification";

interface RegisterData {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  company: string;
  accessCode: string;
  timezone: string;
}

interface Response {
  success?: boolean;
  error?: TErrorHandler;
}

const ACCESS_CODE = env("ACCESS_CODE");

const insertDefaultColumns = async (columnId: number, type: string) => {
  const columnsFortypes = defaultColumnWithColor.filter(
    column => column.type === type
  );

  const columnsWithCompany = columnsFortypes.map(column => ({
    ...column,
    companyId: columnId,
  }));

  await db.column.createMany({
    data: columnsWithCompany,
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
    const userInfo = await createUserValidation.parseAsync({
      firstName,
      lastName,
      email,
      password,
      company,
      accessCode,
    });

    // check if the access code is valid
    if (accessCode !== ACCESS_CODE) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid access code");
    }

    const userEmail = userInfo.email;

    // check if the user already created
    const user = await db.user.findUnique({
      where: { email: userEmail },
    });

    if (user) {
      throw new AppError(httpStatus.NOT_FOUND, "User already exist!");
    }

    // hash the password
    const hashedPassword = await bcrypt.hash(userInfo.password, 10);

    // Create the company
    const newCompany = await db.company.create({
      data: {
        name: userInfo.company,
        zapierToken: generateZapierToken(),
        timezone,
      },
    });

    // Add default permission modules for the company
    const defaultPermissions = [
      {
        title: "Communication Hub: Internal",
        permission_name: "communicationHubInternal",
        status: true,
      },
      {
        title: "Communication Hub: Clients",
        permission_name: "communicationHubClients",
        status: true,
      },
      {
        title: "Communication Hub: Collaboration",
        permission_name: "communicationHubCollaboration",
        status: true,
      },
      {
        title: "Calling Access",
        permission_name: "callingAccess",
        status: true,
      },
      {
        title: "Estimates & Invoices",
        permission_name: "estimateInvoices",
        status: true,
      },
      { title: "Calendar & Task", permission_name: "calendar", status: true },
      { title: "Payments", permission_name: "payments", status: true },
      {
        title: "Directory",
        permission_name: "directory",
        status: true,
      },
      {
        title: "Client",
        permission_name: "clientDirectory",
        status: true,
      },
      {
        title: "Employee",
        permission_name: "employeeDirectory",
        status: true,
      },
      {
        title: "Fleet",
        permission_name: "fleetDirectory",
        status: true,
      },
      {
        title: "Reporting & Analytics",
        permission_name: "reporting",
        status: true,
      },
      { title: "Inventory", permission_name: "inventory", status: true },
      { title: "Integrations", permission_name: "integrations", status: true },
      { title: "All Automation", permission_name: "automation", status: true },
      { title: "Shop Pipeline", permission_name: "shopPipeline", status: true },
      {
        title: "Sales Pipeline",
        permission_name: "salesPipeline",
        status: true,
      },
      {
        title: "Business Settings",
        permission_name: "businessSettings",
        status: true,
      },
      {
        title: "Communication",
        permission_name: "communication",
        status: true,
      },
      {
        title: "Workforce Management",
        permission_name: "workforceManagement",
        status: true,
      },
      {
        title: "Service Estimator",
        permission_name: "serviceEstimator",
        status: true,
      },
      {
        title: "Pipeline Automation",
        permission_name: "pipelineAutomation",
        status: true,
      },
      {
        title: "Marketing Automation",
        permission_name: "marketingAutomation",
        status: true,
      },
      {
        title: "Communication Automation",
        permission_name: "communicationAutomation",
        status: true,
      },
      {
        title: "Invoice Automation",
        permission_name: "invoiceAutomation",
        status: true,
      },
      {
        title: "Inventory Automation",
        permission_name: "inventoryAutomation",
        status: true,
      },
      {
        title: "Service Automation",
        permission_name: "serviceAutomation",
        status: true,
      },
    ];

    await Promise.all(
      defaultPermissions.map(perm =>
        db.companyPermissionModule.create({
          data: {
            companyId: newCompany.id,
            title: perm.title,
            permission_name: perm.permission_name,
            enabled: perm.status,
          },
        })
      )
    );

    const createdUser = await db.user.create({
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

    //creating default permissions for the company users
    await Promise.all([
      // create default permission for manager
      db.permissionForManager.create({
        data: { companyId: newCompany.id },
      }),

      // create default permission for sales
      db.permissionForSales.create({
        data: { companyId: newCompany.id },
      }),

      // create default permission for technician
      db.permissionForTechnician.create({
        data: { companyId: newCompany.id },
      }),

      // create default permission for other
      db.permissionForOther.create({
        data: { companyId: newCompany.id },
      }),
    ]);

    // Create default calendar settings
    await db.calendarSettings.create({
      data: {
        companyId: newCompany.id,
        weekStart: "Sunday",
        dayStart: "10:00",
        dayEnd: "18:00",
        weekend1: "Saturday",
        weekend2: "Sunday",
      },
    });

    uploadNotificationSettings(
      createdUser.id,
      createdUser.employeeType,
      newCompany.id
    );

    // Create default columns
    await Promise.all([
      insertDefaultColumns(newCompany.id, "sales"),
      insertDefaultColumns(newCompany.id, "shop"),
    ]);
    // Insert preloaded data
    await insertPreloadedData(newCompany.id);

    // Create default email template

    await db.companyEmailTemplate.create({
      data: {
        subject: `Estimate for services requested at <BUSINESS_NAME>`,
        message: `Hey <CLIENT>, your estimate for <VEHICLE> is ready. If everything looks good, please approve it so we can move forward. Thanks!– <BUSINESS_NAME>`,
        companyId: newCompany.id,
      },
    });

    await initialCreateBookingForm(newCompany.id);

    return { success: true };
  } catch (err) {
    console.error("Error found while creating new user");
    console.error("The error: ", err);
    console.log({ err: errorHandler(err) });

    return {
      // error: "A server side error occured",
      error: errorHandler(err),
    };
  }
}
