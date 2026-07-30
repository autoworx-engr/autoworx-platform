"use client";

import CarLoading from "@/components/common/CarLoading";
import FormError from "@/components/FormError";
import Input from "@/components/Input";
import Password from "@/components/Password";
import { useFormErrorStore } from "@/stores/form-error";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SubmitButton from "./SubmitButton";

export default function ResetPassword({
  uriToken,
  email,
}: {
  uriToken?: string;
  email?: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [resendAvailable, setResendAvailable] = useState(false);
  const [timer, setTimer] = useState(30); // 30-second timer for resend
  const router = useRouter();
  const { showError } = useFormErrorStore();
  const [password, setPassword] = useState("");

  const getStrengthScore = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z\d]/.test(password)) score++;
    return score;
  };

  const strength = getStrengthScore(password);

  useEffect(() => {
    if (uriToken) {
      setToken(uriToken);
    }
  }, [uriToken]);

  useEffect(() => {
    if (!resendAvailable && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    } else if (timer === 0) {
      setResendAvailable(true);
    }
  }, [resendAvailable, timer]);

  const handleResendEmail = async () => {
    setResendAvailable(false);
    setTimer(30); // Reset timer

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      showError({ message: errorData.error || "Resend Failed", field: "otp" });
    }
  };

  if (!token && !email) {
    return <CarLoading />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <form className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/30 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/90 dark:border-slate-700/50">
        <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#00b8b0] to-transparent opacity-50" />

        <div className="mb-8 text-center flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner dark:bg-slate-800/70 dark:text-slate-100">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {token ? "New password" : "Verify email"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent dark:from-white dark:via-slate-200 dark:to-white">
            {token ? "Reset password" : "Check your email"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {token
              ? "Create a new password for your account."
              : "We sent a code to your email. Enter it below to continue."}
          </p>
        </div>

        <FormError />

        {!token && (
          <>
            <div className="space-y-4">
              <div className="group transition-all duration-300">
                <label
                  htmlFor="otp"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Verification code
                </label>
                <Input
                  name="otp"
                  type="text"
                  required
                  autoFocus
                  placeholder="000000"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 text-slate-900 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-primary"
                />
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3 text-xs text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300">
                The code is valid for 15 minutes. Check your spam folder if you
                don't see it.
              </div>
            </div>

            <div className="mt-8">
              <SubmitButton
                action="verify-otp"
                email={email as string}
                onSuccess={(token) => setToken(token)}
              />
            </div>

            <div className="mt-6 space-y-2 text-center text-sm">
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={!resendAvailable}
                className={`block mx-auto font-semibold transition-colors ${
                  resendAvailable
                    ? "text-primary hover:text-[#5059d4]"
                    : "text-slate-400 cursor-not-allowed"
                }`}
              >
                {resendAvailable
                  ? "Resend code"
                  : `Resend available in ${timer}s`}
              </button>
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="block mx-auto text-slate-600 hover:text-primary transition-colors dark:text-slate-400 dark:hover:text-primary"
              >
                Use a different email
              </button>
            </div>
          </>
        )}

        {token && (
          <>
            <div className="space-y-4">
              <div className="group transition-all duration-300">
                <label
                  htmlFor="newPassword"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  New password
                </label>
                <Password
                  name="newPassword"
                  placeholder="Enter your new password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white/50 px-4 py-2.5 transition-colors focus:border-primary/50 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:focus:border-primary"
                />
                <div className="w-full h-2 bg-slate-200 rounded mt-2">
                  <div
                    // className="h-2 rounded transition-all"
                    className={`h-2 rounded transition-all duration-300 ${
                      strength <= 2
                        ? "bg-red-500"
                        : strength <= 4
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${(strength / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* <div className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3 text-xs text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300">
                Use at least 8 characters with a mix of uppercase, lowercase,
                numbers, and symbols.
              </div> */}
            </div>

            <div className="mt-8">
              <SubmitButton action="reset-password" token={token} />
            </div>
          </>
        )}
      </form>
    </div>
  );
}
