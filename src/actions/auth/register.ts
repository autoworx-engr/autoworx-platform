"use server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { defaultColumnWithColor } from "@/lib/defaultColumns";
import generateZapierToken from "@/lib/generateZapierToken";

import { insertPreloadedData } from "@/lib/insertPreloadedData";
import { TErrorHandler } from "@/types/globalError";
import { createUserValidation } from "@/validations/schemas/auth/user.validation";
import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { env } from "next-runtime-env";
import { uploadNotificationSettings } from "../settings/updateNotification";

interface RegisterData {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  company: string;
  accessCode: string;
}

interface Response {
  success?: boolean;
  error?: TErrorHandler;
}

const ACCESS_CODE = env("ACCESS_CODE");

const insertDefaultColumns = async (columnId: number, type: string) => {
  const columnsFortypes = defaultColumnWithColor.filter(
    (column) => column.type === type,
  );

  const columnsWithCompany = columnsFortypes.map((column) => ({
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

    // check if the user already created
    const user = await db.user.findUnique({
      where: { email: userInfo.email },
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
      },
    });

    const createdUser = await db.user.create({
      data: {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        password: hashedPassword,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // TODO: temporary solution
        companyId: newCompany.id,
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
      newCompany.id,
    );

    // Create default columns
    await Promise.all([
      insertDefaultColumns(newCompany.id, "sales"),
      insertDefaultColumns(newCompany.id, "shop"),
    ]);
    // Insert preloaded data
    await insertPreloadedData(newCompany.id);
    // TODO: Create default email template

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
