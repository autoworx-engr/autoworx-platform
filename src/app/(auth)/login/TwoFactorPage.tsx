"use client";

import React, {
  useState,
  useRef,
  useEffect,
  ChangeEvent,
  KeyboardEvent,
  ClipboardEvent,
  useTransition,
} from "react";
import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { useLoginStore } from "@/stores/LoginStore";
import { TWO_FACTOR_CONFIG } from "@/types/two-factor";
import { checkLoginWithTwoFactor } from "./actions/checkLoginWithTwoFactor";
import { getSession, signIn } from "next-auth/react";
import { resendTwoFactorCode } from "@/actions/two-factor/resendTwoFactorCode";
import { successToast } from "@/lib/toast";

/**
 * Functional 2FA Verification Component (TypeScript)
 */
const TwoFactorVerification: React.FC = () => {
  const { email, password, clearStore } = useLoginStore();
  const [pending, startTransition] = useTransition();
  // State Types
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(59);

  // Ref for an array of HTMLInputElement
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // when unmount the page the login state are reset automatic
  useEffect(() => {
    return () => {
      clearStore();
    };
  }, []);

  // Timer Logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Input Change (Typing)
  const handleChange = (
    e: ChangeEvent<HTMLInputElement>,
    index: number,
  ): void => {
    const value = e.target.value;

    // Allow only numbers
    if (/[^0-9]/.test(value)) return;

    const newOtp = [...otp];
    // Take the last character entered to ensure single digit
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    setError("");

    // Auto Advance Focus
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setActiveIdx(index + 1);
    }
  };

  // Handle Special Keys (Backspace, Arrows)
  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    index: number,
  ): void => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setActiveIdx(index - 1);
      }
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveIdx(index - 1);
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setActiveIdx(index + 1);
    }
  };

  // Handle Paste Event
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");

    if (pastedData.every((char) => !isNaN(Number(char)))) {
      const newOtp = [...otp];
      pastedData.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);

      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
      setActiveIdx(nextIndex);
    }
  };

  // Mock Verification
  const handleVerify = async (): Promise<void> => {
    const code = otp.join("");
    if (code.length < TWO_FACTOR_CONFIG.codeLength) {
      setError("Code is too short");
      return;
    }

    const res = await checkLoginWithTwoFactor({
      email,
      password,
      code,
    });

    if (res.type === "success" && res.nextLogin) {
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      const session = await getSession();
      const isSuperAdmin = session?.user?.isSuperAdmin;
      setIsSuccess(true);
      setError("");
      window.location.href = isSuperAdmin ? "/awx-dashboard" : "/dashboard";
    } else {
      setError(res.message);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setActiveIdx(0);
    }
  };

  // resend
  const handleResendRefactorCode = async (): Promise<void> => {
    setError("");
    try {
      const res = await resendTwoFactorCode(email);
      if (res.type === "success") {
        setCooldown(59);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        successToast("Code resent successfully!");
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex font-sans text-slate-900">
      <div className="flex-1 lg:ml-20 flex items-center justify-center p-4">
        <div className="w-full max-w-[480px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 text-blue-600 rounded-full mb-6">
              <ShieldCheck size={28} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Verification Required
            </h2>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              Please enter the 6-digit code sent to your device.
            </p>
          </div>

          <div className="px-8 pb-8">
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 text-green-600">
                <CheckCircle2 size={48} className="mb-4" />
                <h3 className="text-xl font-bold">Verification Successful</h3>
                <p className="text-slate-500 text-sm mt-2">
                  Redirecting to dashboard...
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between gap-2 mb-8">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleChange(e, idx)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      onFocus={() => setActiveIdx(idx)}
                      onPaste={handlePaste}
                      className={`
                                w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-semibold rounded-lg border 
                                outline-none transition-all duration-200
                                ${
                                  error
                                    ? "border-red-300 bg-red-50 text-red-600 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                                    : activeIdx === idx
                                      ? "border-blue-500 ring-4 ring-blue-50/50 z-10"
                                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                                }
                            `}
                    />
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-6 bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={() => startTransition(() => handleVerify())}
                  className="w-full disabled:bg-slate-200 bg-[#4F46E5] hover:bg-[#4338ca] text-white font-medium py-3.5 rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  disabled={pending}
                >
                  Verify Identity
                </button>

                <div className="mt-6 text-center">
                  <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-2">
                    Didn't receive code?
                  </p>

                  {cooldown > 0 ? (
                    <span className="text-slate-500 text-sm font-medium flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      Resend in {cooldown}s
                    </span>
                  ) : (
                    <button
                      onClick={handleResendRefactorCode}
                      className="text-blue-600 font-semibold text-sm hover:text-blue-700 hover:underline"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>Secure connection</span>
            <button
              onClick={() => {
                clearStore();
              }}
              className="flex items-center gap-1 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={12} />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerification;
