"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import bcrypt from "bcrypt";
import {
  TUpdateEmployeeValidationSchema,
  updateEmployeeValidationSchema,
} from "@/validations/schemas/employee/employee.validation";
import { revalidatePath } from "next/cache";

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
  companyName,
  commission,
  date,
  type,
  profilePicture,
  changePassword,
}: TUpdateEmployeeValidationSchema): Promise<ServerAction | TErrorHandler> {
  try {
    await updateEmployeeValidationSchema.parseAsync({
      id,
      firstName,
      lastName,
      email,
      mobileNumber,
      changePassword,
      address,
      city,
      state,
      zip,
      companyName,
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

    // update the employee
    await db.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone: mobileNumber,
        address,
        city,
        state,
        zip,
        companyName,
        commission,
        joinDate: new Date(date || Date.now()),
        employeeType: type,
        image: profilePicture ? profilePicture : undefined,
      },
    });

    revalidatePath("/employee");

    return {
      type: "success",
      message: "Employee updated successfully",
    };
  } catch (err) {
    return errorHandler(err);
  }
}
