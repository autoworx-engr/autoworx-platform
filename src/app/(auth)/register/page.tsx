import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a new account.",
};

export default function Page() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      {/* noValidate: the schema owns the messages, so the browser's native
          bubbles would only compete with the inline errors. */}
      <form
        noValidate
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/30 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/90 dark:border-slate-700/50"
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Start your journey with Autoworx.
          </p>
        </div>

        <RegisterForm />

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
