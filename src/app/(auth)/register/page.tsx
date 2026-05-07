import Input from "@/components/Input";
import Password from "@/components/Password";
import SubmitButton from "./SubmitButton";
import Link from "next/link";
import FormError from "@/components/FormError";
import { LuminarLogo } from "@/components/crm/CrmLogoMark";
import { Metadata } from "next";



export const metadata: Metadata = {
  title: "Register",
};

export default function Page() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <form className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/30 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/90 dark:border-slate-700/50">
        {/* Top Accent Gradient Line */}
        <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#00b8b0] to-transparent opacity-50" />

        {/* Header Section */}
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="mb-4 relative flex justify-center">
            <LuminarLogo width={72} height={72} className="relative z-10 shadow-[0_4px_20px_rgba(20,184,166,0.2)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Create your account</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Create your workspace and start tracking deals.</p>
        </div>

        <FormError />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group transition-all duration-300">
            <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
            <Input
              type="text"
              name="firstName"
              autoFocus
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 transition-colors focus:border-[#0d9488]/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50"
            />
          </div>

          <div className="group transition-all duration-300">
            <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
            <Input
              type="text"
              name="lastName"
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 transition-colors focus:border-[#0d9488]/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50"
            />
          </div>

          <div className="group transition-all duration-300">
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <Input
              type="email"
              name="email"
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 text-slate-900 transition-colors focus:border-[#0d9488]/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
            />
          </div>

          <div className="group transition-all duration-300">
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <Password
              name="password"
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 transition-colors focus:border-[#0d9488]/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50"
            />
          </div>

          <div className="group transition-all duration-300">
            <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Company</label>
            <Input
              type="text"
              name="company"
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 transition-colors focus:border-[#0d9488]/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50"
            />
          </div>

          <div className="group transition-all duration-300">
            <label htmlFor="access" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Access Code</label>
            <Input
              name="access"
              className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 transition-colors focus:border-[#0d9488]/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50"
            />
          </div>
          <div className="md:col-span-2"></div>
        </div>

        <SubmitButton />

        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-[#0d9488] transition-colors hover:text-[#0f766e] hover:underline">Login</Link>
        </p>
      </form>
    </div>
  );
}
