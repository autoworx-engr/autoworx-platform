"use client";

import FormError from "@/components/FormError";
import FormField from "@/components/FormField";
import Input from "@/components/Input";
import Password from "@/components/Password";
import Submit from "@/components/Submit";
import Image from "next/image";
import Link from "next/link";
import { LoginField, useLoginForm } from "./useLoginForm";

const baseControl =
  "w-full rounded-xl border-2 bg-white/50 px-4 py-2.5 transition-colors focus:outline-none dark:bg-slate-800/50";

const controlClass = (hasError: boolean) =>
  `${baseControl} ${
    hasError
      ? "border-red-400 focus:border-red-500 dark:border-red-500/70"
      : "border-slate-200 focus:border-primary/50 dark:border-slate-700 dark:focus:border-primary"
  }`;

export default function LoginPage() {
  const { values, errors, update, validateOnBlur, handler } = useLoginForm();

  const fieldProps = (field: LoginField, autoComplete: string) => ({
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
    // noValidate: our inline messages replace the browser's native bubbles.
    <form
      noValidate
      className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/30 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/90 dark:border-slate-700/50 z-10"
    >
      {/* Top Accent Gradient Line */}
      <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#00b8b0] to-transparent opacity-50" />

      {/* Header Section */}
      <div className="mb-8 text-center flex flex-col items-center">
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#a855f7] to-[#00b8b0] opacity-10 rounded-full blur-2xl" />
          <Image
            src="/icons/autoworx-logo.svg"
            alt="Autoworx Logo"
            width={120}
            height={120}
            className="mx-auto relative z-10"
            style={{
              filter: "drop-shadow(0 0 20px rgba(101, 113, 255, 0.1))",
            }}
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent dark:from-white dark:via-slate-200 dark:to-white">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Please enter your details to sign in.
        </p>
      </div>

      <FormError />

      <div className="space-y-5">
        <FormField
          name="email"
          label="Email Address"
          required
          error={errors.email}
        >
          <Input
            type="email"
            autoFocus
            placeholder="name@company.com"
            {...fieldProps("email", "email")}
          />
        </FormField>

        <FormField
          name="password"
          label="Password"
          required
          error={errors.password}
          labelAction={
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-primary transition-colors hover:text-[#5059d4]"
            >
              Forgot Password?
            </Link>
          }
        >
          <Password
            placeholder="Enter your password"
            {...fieldProps("password", "current-password")}
          />
        </FormField>
      </div>

      <div className="mt-8">
        <Submit
          className="mx-auto w-full mt-4 rounded-md bg-gradient-to-r from-primary to-[#5a66ee] px-10 py-2 text-white border-0 outline-none focus:outline-none active:outline-none min-h-[42px] flex items-center justify-center"
          formAction={handler}
        >
          Login
        </Submit>
      </div>

      <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
        Don&rsquo;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary transition-colors hover:text-[#5059d4] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
