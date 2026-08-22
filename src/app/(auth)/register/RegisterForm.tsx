"use client";

import { useState } from "react";
import Input from "@/components/Input";
import Password from "@/components/Password";
import SubmitButton from "./SubmitButton";
import Link from "next/link";
import FormError from "@/components/FormError";
import Image from "next/image";

const REQUIRED_FIELDS = [
  "firstName",
  "email",
  "company",
  "password",
  "confirmPassword",
  "access",
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

export default function RegisterForm() {
  const [fields, setFields] = useState<Record<RequiredField, string>>({
    firstName: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
    access: "",
  });

  const allFilled = REQUIRED_FIELDS.every((key) => fields[key].trim() !== "");

  const handleChange =
    (field: RequiredField) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((prev) => ({ ...prev, [field]: e.target.value }));
    };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <form className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/30 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/90 dark:border-slate-700/50">
        <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#00b8b0] to-transparent opacity-50" />

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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Start your journey with Autoworx.
          </p>
        </div>

        <div className="mb-4">
          <FormError />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group transition-all duration-300">
            <label
              htmlFor="firstName"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              First Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              name="firstName"
              placeholder="John"
              autoFocus
              value={fields.firstName}
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 text-slate-900 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50"
              onChange={handleChange("firstName")}
            />
          </div>

          <div className="group transition-all duration-300">
            <label
              htmlFor="lastName"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Last Name
            </label>
            <Input
              type="text"
              name="lastName"
              placeholder="Doe"
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 text-slate-900 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50"
            />
          </div>

          <div className="group transition-all duration-300">
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email <span className="text-destructive">*</span>
            </label>
            <Input
              type="email"
              name="email"
              placeholder="john@example.com"
              value={fields.email}
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 text-slate-900 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
              onChange={handleChange("email")}
            />
          </div>

          <div className="group transition-all duration-300">
            <label
              htmlFor="company"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Company <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              name="company"
              placeholder="Autoworx LLC"
              value={fields.company}
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 text-slate-900 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50"
              onChange={handleChange("company")}
            />
          </div>

          <div className="group transition-all duration-300">
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password <span className="text-destructive">*</span>
            </label>
            <Password
              name="password"
              placeholder="••••••••"
              value={fields.password}
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 text-slate-900 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50"
              onChange={handleChange("password")}
            />
          </div>

          <div className="group transition-all duration-300">
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Confirm Password <span className="text-destructive">*</span>
            </label>
            <Password
              name="confirmPassword"
              placeholder="••••••••"
              value={fields.confirmPassword}
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 text-slate-900 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50"
              onChange={handleChange("confirmPassword")}
            />
          </div>

          <div className="group transition-all duration-300 md:col-span-2">
            <label
              htmlFor="access"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Access Code <span className="text-destructive">*</span>
            </label>
            <Input
              name="access"
              placeholder="Enter your access code"
              value={fields.access}
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 text-slate-900 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50"
              onChange={handleChange("access")}
            />
          </div>
        </div>

        <div className={allFilled ? "block" : "hidden"}>
          <SubmitButton />
        </div>

        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary transition-colors hover:text-[#5059d4] hover:underline"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
