"use client";

import FormError from "@/components/FormError";
import Input from "@/components/Input";
import Password from "@/components/Password";
import Submit from "@/components/Submit";
import FormField from "@/components/FormField";
import { FieldName, useRegisterForm } from "./useRegisterForm";

const baseControl =
  "w-full rounded-xl border-2 bg-white/50 px-4 py-2.5 text-slate-900 transition-colors focus:outline-none dark:bg-slate-800/50 dark:text-white";

const controlClass = (hasError: boolean) =>
  `${baseControl} ${
    hasError
      ? "border-red-400 focus:border-red-500 dark:border-red-500/70"
      : "border-slate-200 focus:border-primary/50 dark:border-slate-700"
  }`;

const REQUIRED_FIELDS: FieldName[] = [
  "firstName",
  "email",
  "company",
  "password",
  "confirmPassword",
  "accessCode",
];

export default function RegisterForm() {
  const { values, errors, update, validateOnBlur, handler } = useRegisterForm();

  const canSubmit = REQUIRED_FIELDS.every((f) => values[f].trim() !== "");

  const fieldProps = (field: FieldName, autoComplete: string) => ({
    name: field,
    value: values[field],
    onChange: update(field),
    onBlur: validateOnBlur(field),
    autoComplete,
    invalid: Boolean(errors[field]),
    describedBy: errors[field] ? `${field}-error` : undefined,
    className: controlClass(Boolean(errors[field])),
  });

  return (
    <>
      <div className="mb-4">
        <FormError />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          name="firstName"
          label="First Name"
          required
          error={errors.firstName}
        >
          <Input
            type="text"
            placeholder="John"
            autoFocus
            {...fieldProps("firstName", "given-name")}
          />
        </FormField>

        <FormField name="lastName" label="Last Name" error={errors.lastName}>
          <Input
            type="text"
            placeholder="Doe"
            {...fieldProps("lastName", "family-name")}
          />
        </FormField>

        <FormField name="email" label="Email" required error={errors.email}>
          <Input
            type="email"
            placeholder="john@example.com"
            {...fieldProps("email", "email")}
          />
        </FormField>

        <FormField
          name="company"
          label="Company"
          required
          error={errors.company}
        >
          <Input
            type="text"
            placeholder="Autoworx LLC"
            {...fieldProps("company", "organization")}
          />
        </FormField>

        <FormField
          name="password"
          label="Password"
          required
          error={errors.password}
          belowControl={
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              At least 6 characters.
            </p>
          }
        >
          <Password
            placeholder="••••••••"
            {...fieldProps("password", "new-password")}
          />
        </FormField>

        <FormField
          name="confirmPassword"
          label="Confirm Password"
          required
          error={errors.confirmPassword}
        >
          <Password
            placeholder="••••••••"
            {...fieldProps("confirmPassword", "new-password")}
          />
        </FormField>

        <FormField
          name="accessCode"
          label="Access Code"
          required
          error={errors.accessCode}
          className="md:col-span-2"
        >
          <Input
            placeholder="Enter your access code"
            {...fieldProps("accessCode", "one-time-code")}
          />
        </FormField>
      </div>

      {canSubmit && (
        <Submit
          className="mx-auto mt-4 w-full rounded-md bg-gradient-to-r from-primary to-[#5a66ee] px-10 py-2 text-white"
          formAction={handler}
        >
          Submit
        </Submit>
      )}
    </>
  );
}
