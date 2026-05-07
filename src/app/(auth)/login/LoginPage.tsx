import FormError from "@/components/FormError";
import Input from "@/components/Input";
import Password from "@/components/Password";
import { LuminarLogo } from "@/components/crm/CrmLogoMark";
import Link from "next/link";
import SubmitButton from "./SubmitButton";

export default function LoginPage() {
  return (
    <form className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/30 dark:border-white/8 bg-white/90 dark:bg-zinc-900/85 p-9 shadow-[0_24px_80px_-12px_rgba(15,23,42,0.18)] dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />
      <div className="mb-10 text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <LuminarLogo width={72} height={72} className="shadow-[0_4px_20px_rgba(20,184,166,0.2)]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Welcome back</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Sign in to your workspace to continue.
        </p>
      </div>

      <FormError />

      <div className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-semibold text-zinc-700 dark:text-zinc-300"
          >
            Email
          </label>
          <Input
            name="email"
            type="email"
            required
            autoFocus
            placeholder="you@company.com"
            className="w-full rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/70 px-4 py-3 text-zinc-900 dark:text-zinc-100 shadow-sm transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-teal-500/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 transition-colors hover:text-teal-700 dark:hover:text-teal-300"
            >
              Forgot?
            </Link>
          </div>
          <Password
            name="password"
            placeholder="••••••••"
            required
            className="w-full rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/70 px-4 py-3 shadow-sm transition-all focus:border-teal-500/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
      </div>

      <div className="mt-8">
        <SubmitButton />
      </div>

      <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Don&rsquo;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-teal-600 dark:text-teal-400 transition-colors hover:text-teal-700 dark:hover:text-teal-300 hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
