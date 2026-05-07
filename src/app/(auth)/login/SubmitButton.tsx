"use client";

import Submit from "@/components/Submit";
import { useFormErrorStore } from "@/stores/form-error";
import { getSession, signIn } from "next-auth/react";
import { checkLoginWithTwoFactor } from "./actions/checkLoginWithTwoFactor";

export default function SubmitButton() {
  const { showError } = useFormErrorStore();

  const handler = async (formData: FormData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      const res = await checkLoginWithTwoFactor({
        email,
        password,
      });

      if (res?.type === "fail") {
        showError({ message: res.message, field: "all" });
        return;
      }

      if (res?.type === "success" && res?.nextLogin) {
        await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        const session = await getSession();
        if (!session) {
          showError({ message: "Could not start session", field: "all" });
          return;
        }
        window.location.href = "/dashboard";
      }
    } catch (err) {
      console.log("log in page error", err);
    }
  };
  return (
    <Submit
      className="mx-auto mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border-0 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 px-10 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 outline-none transition-all hover:shadow-xl hover:shadow-teal-600/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 active:scale-[0.99]"
      formAction={handler}
    >
      Sign in
    </Submit>
  );
}
