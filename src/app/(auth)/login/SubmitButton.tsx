"use client";

import Submit from "@/components/Submit";
import { useFormErrorStore } from "@/stores/form-error";
import { getSession, signIn } from "next-auth/react";
import { checkLoginWithTwoFactor } from "./actions/checkLoginWithTwoFactor";
import { useLoginStore } from "@/stores/LoginStore";

export default function SubmitButton() {
  const { showError } = useFormErrorStore();
  const { setShowTwoFactor, setEmail, setPassword } = useLoginStore();

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

      if (res?.type === "success" && res?.twoFactor && !res?.nextLogin) {
        setEmail(email);
        setPassword(password);
        setShowTwoFactor(true);
        return;
      } else if (res?.type === "success" && !res?.twoFactor && res?.nextLogin) {
        await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        const session = await getSession();
        const isSuperAdmin = session?.user?.isSuperAdmin;
        window.location.href = isSuperAdmin ? "/awx-dashboard" : "/dashboard";
      }
    } catch (err) {
      console.log("log in page error", err);
    }
  };
  return (
    <Submit
      className="mx-auto w-full mt-4 rounded-md bg-gradient-to-r from-primary to-[#5a66ee] px-10 py-2 text-white border-0 outline-none focus:outline-none active:outline-none min-h-[42px] flex items-center justify-center"
      formAction={handler}
    >
      Login
    </Submit>
  );
}
