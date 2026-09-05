"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { manageSalaryHistory } from "@/lib/salaryHistoryManager";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { createEmployeeValidationSchema } from "@/validations/schemas/employee/employee.validation";
import { EmployeeType, SalaryType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getCompany } from "../settings/getCompany";
import { uploadNotificationSettings } from "../settings/updateNotification";

interface EmployeeData {
  firstName: string;
  lastName?: string;
  email: string;
  mobileNumber: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  commission?: number;
  date?: string;
  type?: EmployeeType;
  salaryType?: SalaryType;
  salaryAmount?: number;
  profilePicture?: string;
  password: string;
  confirmPassword: string;
  countryCode?: string;
}

export async function addEmployee({
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
  salaryType,
  salaryAmount,
  profilePicture,
  password,
  confirmPassword,
  countryCode,
}: EmployeeData): Promise<ServerAction | TErrorHandler> {
  try {
    const companyId = await getCompanyId();
    const company = await getCompany();

    const employeeInfo = await createEmployeeValidationSchema.parseAsync({
      firstName,
      lastName,
      email,
      phone: mobileNumber,
      address,
      city,
      state,
      zip,
      companyName: company?.name,
      commission,
      joinDate: new Date(date || Date.now()),
      employeeType: type,
      image: profilePicture ? profilePicture : undefined,
      password,
    });

    // check if the user already created
    const user = await db.user.findUnique({
      where: { email, companyId: companyId },
    });

    if (user) {
      throw new Error("User already exist!");
    }

    // check if the password and confirm password match
    if (password !== confirmPassword) {
      throw new Error("Password and confirm password do not match");
    }

    // hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create the employee
    const newEmployee = await db.user.create({
      data: {
        ...employeeInfo,
        commission: type === "Sales" ? employeeInfo.commission : 0,
        password: hashedPassword,
        companyId,
        role: "employee",
        countryCode: countryCode,
      },
    });

    // Add salary information if provided
    if (salaryType && salaryAmount && salaryAmount > 0) {
      await manageSalaryHistory({
        userId: newEmployee.id,
        salaryType,
        salaryAmount,
        // startDate defaults to current date
      });
    }

    // create default notification settings for the employee
    uploadNotificationSettings(
      newEmployee.id,
      newEmployee.employeeType,
      newEmployee.companyId,
    );

    revalidatePath("/employee");

    return {
      type: "success",
      message: "Employee added successfully",
      data: newEmployee,
    };
  } catch (err) {
    return errorHandler(err);
  }
}
