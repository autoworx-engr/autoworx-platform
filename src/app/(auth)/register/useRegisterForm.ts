"use client";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import nextAxios from "@/helpers/next-axios";
import { useFormErrorStore } from "@/stores/form-error";
import { TErrorHandler } from "@/types/globalError";
import { registerFormValidation } from "@/validations/schemas/auth/register.validation";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const FIELD_ORDER = [
  "firstName",
  "lastName",
  "email",
  "company",
  "password",
  "confirmPassword",
  "accessCode",
] as const;

export type FieldName = (typeof FIELD_ORDER)[number];
export type FieldErrors = Partial<Record<FieldName, string | undefined>>;
type Values = Record<FieldName, string>;

const EMPTY_VALUES: Values = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  password: "",
  confirmPassword: "",
  accessCode: "",
};

export function useRegisterForm() {
  const router = useRouter();
  const { showError } = useFormErrorStore();
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});

  // One zod pass; the first issue per field wins so a field never stacks
  // messages, and the schema stays the single source of truth.
  const collectErrors = (): FieldErrors => {
    const result = registerFormValidation.safeParse(values);
    if (result.success) return {};
    const next: FieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as FieldName;
      if (field && !next[field]) next[field] = issue.message;
    }
    return next;
  };

  const update = (field: FieldName) => (e: { target: { value: string } }) => {
    // Lowercased as typed, so the user sees the canonical address in the
    // field instead of it changing silently on submit.
    const raw = e.target.value;
    const value = field === "email" ? raw.toLowerCase() : raw;
    setValues((prev) => ({ ...prev, [field]: value }));
    // Drop a shown error as soon as the field is edited; re-checked on blur.
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Validating on blur surfaces one field's problem as the user leaves it,
  // instead of waiting for submit to reveal everything at once.
  const validateOnBlur = (field: FieldName) => () => {
    const all = collectErrors();
    setErrors((prev) => ({ ...prev, [field]: all[field] }));
  };

  const handler = async () => {
    const found = collectErrors();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      // Take focus to the first problem rather than leaving it on submit.
      const first = FIELD_ORDER.find((field) => found[field]);
      if (first) document.getElementById(first)?.focus();
      return;
    }

    setErrors({});

    try {
      const payload = registerFormValidation.parse(values);
      const res = await nextAxios.post("/auth/register", {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        password: payload.password,
        company: payload.company,
        accessCode: payload.accessCode,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      const data = res.data.data;
      if (!data?.success) {
        showError(data?.error as TErrorHandler);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });

      if (signInResult?.error) {
        showError({
          success: false,
          statusCode: signInResult.status,
          errorSource: [],
          message: signInResult.error,
        });
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      showError(errorHandler(err));
    }
  };

  return { values, errors, update, validateOnBlur, handler };
}
