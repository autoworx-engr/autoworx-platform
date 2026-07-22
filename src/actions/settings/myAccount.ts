"use server";
import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  TUpdateUserValidationSchema,
  changePasswordValidationSchema,
  updateUserValidationSchema,
} from "@/validations/schemas/settings/my-account/account.validation";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function editMyAccountInfo({
  firstName,
  lastName,
  email,
  image,
  phone,
  address,
  city,
  state,
  zip,
  countryCode,
}: TUpdateUserValidationSchema): Promise<ServerAction | TErrorHandler> {
  try {
    await updateUserValidationSchema.parseAsync({
      firstName,
      lastName,
      email,
      image,
      phone,
      address,
      city,
      state,
      zip,
      countryCode,
    });
    const session = await getServerSession(authOptions);
    const userId = session?.user.id;

    if (!userId) {
      throw new Error("User ID is required to update account info.");
    }
    const updatedUser = await db.user.update({
      where: {
        id: +userId,
      },
      data: {
        firstName,
        lastName,
        image,
        phone,
        address,
        city,
        state,
        zip,
        email,
        countryCode,
      },
    });
    revalidatePath("/dashboard/settings/my-account");
    return { type: "success", data: updatedUser };
  } catch (error) {
    return errorHandler(error);
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmNewPassword: string,
): Promise<ServerAction | TErrorHandler> {
  try {
    await changePasswordValidationSchema.parseAsync({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });

    const session = await getServerSession(authOptions);
    const userId = session?.user.id;

    if (!userId) {
      throw new Error("User ID is required to change password.");
    }
    const user = await db.user.findUnique({
      where: {
        id: +userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    let comparePassword = await bcrypt.compare(currentPassword, user.password);

    if (!comparePassword) {
      throw new Error("Password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: {
        id: +userId,
      },
      data: {
        password: hashedPassword,
      },
    });
    return { type: "success" };
  } catch (error) {
    return errorHandler(error);
  }
}
