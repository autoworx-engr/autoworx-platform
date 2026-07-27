import FormError from "@/components/FormError";
import SubmitButton from "./SubmitButton";
import Link from "next/link";
import Input from "@/components/Input";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password.",
};

export default function Page() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <form className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/30 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/90 dark:border-slate-700/50">
        <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#00b8b0] to-transparent opacity-50" />

        <div className="mb-8 text-center flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner dark:bg-slate-800/70 dark:text-slate-100">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Reset access
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent dark:from-white dark:via-slate-200 dark:to-white">
            Forgot password?
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enter the email you use for Autoworx. We will send a secure link to
            create a new password.
          </p>
        </div>

        <FormError />

        <div className="space-y-4">
          <div className="group transition-all duration-300">
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email address
            </label>
            <Input
              name="email"
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 text-slate-900 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-primary"
            />
          </div>

          <div className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3 text-xs text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300">
            You will receive an email with a one-time link. It expires after a
            short time, so open it soon.
          </div>
        </div>

        <div className="mt-8">
          <SubmitButton />
        </div>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary transition-colors hover:text-[#5059d4] hover:underline"
          >
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
}
