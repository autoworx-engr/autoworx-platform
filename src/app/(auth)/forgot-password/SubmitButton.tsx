"use client";

import Submit from "@/components/Submit";
import { useFormErrorStore } from "@/stores/form-error";
import { useRouter } from "next/navigation";

export default function SubmitButton() {
  const { showError } = useFormErrorStore();
  const router = useRouter();

  const handler = async (formData: FormData) => {
    const email = formData.get("email") as string;

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      showError({
        message: errorData.error || "Something went wrong",
        field: "email",
      });
      return;
    }

    // Redirect to reset-password page with email as a query parameter
    router.push(`/reset-password?email=${encodeURIComponent(email)}`);
  };

  return (
    <Submit
      className="mx-auto w-full mt-4 rounded-md bg-gradient-to-r from-primary to-[#5a66ee] px-10 py-2 text-white min-h-[44px] flex items-center justify-center"
      formAction={handler}
    >
      Send Reset Link
    </Submit>
  );
}
