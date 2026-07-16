"use client";
import Submit from "@/components/Submit";
import { useFormErrorStore } from "@/stores/form-error";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface SubmitButtonProps {
  action: "verify-otp" | "reset-password";
  email?: string;
  token?: string;
  onSuccess?: (token: string) => void;
}

export default function SubmitButton({
  action,
  email,
  token,
  onSuccess,
}: SubmitButtonProps) {
  const { showError } = useFormErrorStore();
  const router = useRouter();

  const handler = async (formData: FormData) => {
    if (action === "verify-otp") {
      const otp = formData.get("otp") as string;

      const res = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        showError({ message: errorData.error || "Invalid OTP", field: "otp" });
        return;
      }

      const data = await res.json();
      onSuccess?.(data.token);
    }

    if (action === "reset-password") {
      const newPassword = formData.get("newPassword") as string;

      const strongPasswordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

      if (!strongPasswordRegex.test(newPassword)) {
        showError({
          message:
            "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.",
          field: "newPassword",
        });
        return;
      }

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        showError({
          message: errorData.error || "Failed to reset password",
          field: "newPassword",
        });
        return;
      }

      const responseData = await res.json(); // Resolve the JSON response
      const res2 = await signIn("credentials", {
        email: responseData.email,
        password: newPassword,
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

      toast.success("Password Changed successfully", {
        duration: 3000,
        position: "top-center",
      });
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <Submit
      className="mx-auto w-full mt-4 rounded-md bg-gradient-to-r from-primary to-[#5a66ee] px-10 py-2 text-white min-h-[44px] flex items-center justify-center"
      formAction={handler}
    >
      {action === "verify-otp" ? "Verify code" : "Reset password"}
    </Submit>
  );
}
