"use client";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useFormErrorStore } from "@/stores/form-error";
import { useLoginStore } from "@/stores/LoginStore";
import { getSession, signIn } from "next-auth/react";
import { useState } from "react";
import { checkLoginWithTwoFactor } from "./actions/checkLoginWithTwoFactor";

export const LOGIN_FIELDS = ["email", "password"] as const;

export type LoginField = (typeof LOGIN_FIELDS)[number];
type LoginErrors = Partial<Record<LoginField, string | undefined>>;

const REQUIRED_MESSAGE: Record<LoginField, string> = {
  email: "Email is required",
  password: "Password is required",
};

export function useLoginForm() {
  const { showError } = useFormErrorStore();
  const { setShowTwoFactor, setEmail, setPassword } = useLoginStore();
  const [values, setValues] = useState<Record<LoginField, string>>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<LoginErrors>({});

  // Login only checks that the fields are filled in — whether the
  // credentials are correct is the server's answer, not the form's.
  const collectErrors = (): LoginErrors => {
    const next: LoginErrors = {};
    for (const field of LOGIN_FIELDS) {
      if (!values[field].trim()) next[field] = REQUIRED_MESSAGE[field];
    }
    return next;
  };

  const update = (field: LoginField) => (e: { target: { value: string } }) => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateOnBlur = (field: LoginField) => () => {
    setErrors((prev) => ({ ...prev, [field]: collectErrors()[field] }));
  };

  const handler = async () => {
    // Validate before the action runs, so an incomplete form never reaches
    // the server and the user sees the problem against the field.
    const found = collectErrors();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const first = LOGIN_FIELDS.find((field) => found[field]);
      if (first) document.getElementById(first)?.focus();
      return;
    }

    setErrors({});
    const email = values.email.trim();
    const password = values.password;

    try {
      const res = await checkLoginWithTwoFactor({ email, password });

      if (res?.type === "fail") {
        showError({ message: res.message, field: "all" });
        return;
      }

      if (res?.type === "success" && res?.twoFactor && !res?.nextLogin) {
        setEmail(email);
        setPassword(password);
        setShowTwoFactor(true);
        return;
      }

      if (res?.type === "success" && !res?.twoFactor && res?.nextLogin) {
        await signIn("credentials", { email, password, redirect: false });
        const session = await getSession();
        const isSuperAdmin = session?.user?.isSuperAdmin;
        window.location.href = isSuperAdmin ? "/awx-dashboard" : "/dashboard";
      }
    } catch (err) {
      // Previously swallowed into console.log, which left the user staring
      // at a spinner that stopped with no explanation.
      showError(errorHandler(err));
    }
  };

  return { values, errors, update, validateOnBlur, handler };
}
