"use client";

import Submit from "@/components/Submit";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import nextAxios from "@/helpers/next-axios";
import { useFormErrorStore } from "@/stores/form-error";
import { TErrorHandler } from "@/types/globalError";
import { createUserValidation } from "@/validations/schemas/auth/user.validation";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SubmitButton() {
  const { showError } = useFormErrorStore();
  const router = useRouter();

  const handler = async (formData: FormData) => {
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const company = formData.get("company") as string;
    const accessCode = formData.get("access") as string;

    if (password !== confirmPassword) {
      showError({
        success: false,
        statusCode: 400,
        errorSource: [],
        message: "Passwords do not match",
      });
      return;
    }

    try {
      const userInfo = await createUserValidation.parseAsync({
        firstName,
        lastName,
        email,
        password,
        company,
        accessCode,
      });
      console.log("User info to be sent for registration:", userInfo);
      const res = await nextAxios.post("/auth/register", {
        ...userInfo,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const data = res.data.data;
      console.log("Registration response data:", data);

      if (!data.success) {
        showError(data.error as TErrorHandler);
        return;
      }

      const res2 = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res2?.error) {
        showError({
          success: false,
          statusCode: res2.status,
          errorSource: [],
          message: res2.error,
        });
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const formattedError = errorHandler(err);
      console.log("Registration error:", formattedError);
      showError(formattedError);
    }
  };

  return (
    <Submit
      className="mx-auto w-full mt-4 rounded-md bg-gradient-to-r from-primary to-[#5a66ee] px-10 py-2 text-white"
      formAction={handler}
    >
      Submit
    </Submit>
  );
}
