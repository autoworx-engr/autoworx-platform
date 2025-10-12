"use client";

import Submit from "@/components/Submit";
import { useFormErrorStore } from "@/stores/form-error";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SubmitButton() {
  const { showError } = useFormErrorStore();
  const router = useRouter();

  const handler = async (formData: FormData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      console.log("login button click");
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        showError({ message: "Invalid credentials", field: "all" });
        return;
      }

      if (res?.status === 200) {
        const session = await getSession();
        const isSuperAdmin = session?.user?.isSuperAdmin;
        if (isSuperAdmin) {
          router.push("/awx-dashboard");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch (err) {
      console.log("log in page error", err);
    }
  };
  return (
    <Submit
      className="mx-auto mt-4 block rounded-md bg-blue-500 px-10 py-2 text-white border-0 outline-none focus:outline-none active:outline-none"
      formAction={handler}
    >
      Login
    </Submit>
  );
}
