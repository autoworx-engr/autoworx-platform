import FormError from "@/components/FormError";
import Input from "@/components/Input";
import Password from "@/components/Password";
import Image from "next/image";
import Link from "next/link";
import SubmitButton from "./SubmitButton";
export default function LoginPage() {
  return (
    <form className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/30 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/90 dark:border-slate-700/50 z-10">
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
        {/* Email Address */}
        <div className="group transition-all duration-300">
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Email Address
          </label>
          <Input
            name="email"
            type="email"
            required
            autoFocus
            placeholder="name@company.com"
            className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 text-slate-900 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-primary"
          />
        </div>

        {/* Password Section */}
        <div className="group transition-all duration-300">
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-primary transition-colors hover:text-[#5059d4]"
            >
              Forgot Password?
            </Link>
          </div>
          <Password
            name="password"
            placeholder="Enter your password"
            required
            className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:focus:border-primary"
          />
        </div>
      </div>

      <div className="mt-8">
        <SubmitButton />
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
