"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { manageSalaryHistory } from "@/lib/salaryHistoryManager";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import bcrypt from "bcryptjs";
import {
  TUpdateEmployeeValidationSchema,
  updateEmployeeValidationSchema,
} from "@/validations/schemas/employee/employee.validation";
import { revalidatePath } from "next/cache";
import { SalaryType } from "@prisma/client";
import { getCompany } from "../settings/getCompany";

export async function updateEmployee({
  id,
  firstName,
  lastName,
  email,
  mobileNumber,
  address,
  city,
  state,
  zip,
  commission,
  date,
  type,
  profilePicture,
  changePassword,
  salaryType,
  salaryAmount,
  countryCode,
}: TUpdateEmployeeValidationSchema & {
  salaryType?: SalaryType | null;
  salaryAmount?: number | null;
}): Promise<ServerAction | TErrorHandler> {
  try {
    const company = await getCompany();

    await updateEmployeeValidationSchema.parseAsync({
      id,
      firstName,
      lastName,
      email,
      mobileNumber,
      changePassword,
      countryCode,
      address,
      city,
      state,
      zip,
      companyName: company?.name,
      commission,
      date,
      type,
      profilePicture,
    });

    if (changePassword) {
      const hashPassword = await bcrypt.hash(changePassword, 10);
      // update the password
      await db.user.update({
        where: { id },
        data: {
          password: hashPassword,
        },
      });
    }

    // Prepare update data
    const updateData: any = {
      firstName,
      lastName,
      email,
      phone: mobileNumber,
      countryCode: countryCode,
      address,
      city,
      state,
      zip,
      companyName: company?.name,
      commission,
      joinDate: new Date(date || Date.now()),
      employeeType: type,
      image: profilePicture ? profilePicture : undefined,
    };

    // update the employee
    await db.user.update({
      where: { id },
      data: updateData,
    });

    // Handle salary updates using the new salary history system
    if (salaryType && salaryAmount && salaryAmount > 0) {
      await manageSalaryHistory({
        userId: id,
        salaryType,
        salaryAmount,
        // startDate defaults to current date for updates
      });
    }

    revalidatePath("/employee");

    return {
      type: "success",
      message: "Employee updated successfully",
    };
  } catch (err) {
    return errorHandler(err);
  }
}
