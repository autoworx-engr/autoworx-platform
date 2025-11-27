"use client";

import FormError from "@/components/FormError";
import Input from "@/components/Input";
import Password from "@/components/Password";
import { useEffect, useState } from "react";
import SubmitButton from "./SubmitButton";
import { Spin } from "antd";
import { useRouter } from "next/navigation";
import { useFormErrorStore } from "@/stores/form-error";
import CarLoading from "@/components/common/CarLoading";

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
    <form className="mx-auto mt-56 max-w-md rounded-md border p-6">
      {/* Title */}
      <h1 className="mb-4 text-center text-2xl font-semibold">
        {token ? "Reset Password" : "Verify OTP"}
      </h1>

      <FormError />

      {!token && (
        <>
          {/* OTP Verification */}
          <div className="mb-4">
            <label htmlFor="otp" className="mb-2 block">
              OTP
            </label>
            <Input
              name="otp"
              type="text"
              required
              autoFocus
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <SubmitButton
            action="verify-otp"
            email={email as string}
            onSuccess={(token) => setToken(token)}
          />

          {/* Resend Email */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={!resendAvailable}
              className={`text-sm underline ${
                resendAvailable
                  ? "text-blue-500 hover:text-blue-700"
                  : "text-gray-400"
              }`}
            >
              {resendAvailable
                ? "Resend Email"
                : `Resend available in ${timer}s`}
            </button>
          </div>

          {/* Change Email */}
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="text-sm text-blue-500 underline hover:text-blue-700"
            >
              Change Email
            </button>
          </div>
        </>
      )}

      {token && (
        <>
          {/* Password Reset */}
          <div className="mb-4">
            <label htmlFor="newPassword" className="mb-2 block">
              New Password
            </label>
            <Password
              name="newPassword"
              required
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <SubmitButton action="reset-password" token={token} />
        </>
      )}
    </form>
  );
}
