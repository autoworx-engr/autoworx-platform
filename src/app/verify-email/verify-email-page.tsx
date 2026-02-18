"use client";
import { emailVerification } from "@/actions/settings/my-account/emailVerification";
import { errorToast } from "@/lib/toast";
import { CheckCircle, Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TVerifyEmailPageProps = {
  token: string;
  email: string;
};

export default function VerifyEmail({ token, email }: TVerifyEmailPageProps) {
  const [status, setStatus] = useState<"idle" | "verifying" | "success">(
    "idle",
  );
  const router = useRouter();

  const onBack = () => {
    router.push("/dashboard/settings/my-account");
  };

  const handleVerify = async () => {
    try {
      setStatus("verifying");
      await emailVerification(token);
      setStatus("success");
    } catch (error) {
      errorToast("Failed to verify email");
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200 p-8 text-center animate-in fade-in zoom-in duration-300">
      {status === "success" ? (
        <div className="space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Email Verified!</h2>
          <p className="text-slate-600">
            Thank you for verifying <strong>{email}</strong>.<br />
            You can now enable enhanced security features.
          </p>
          <button
            onClick={onBack}
            className="w-full inline-flex justify-center items-center px-4 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
          >
            Back to Settings
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Verify your email
            </h2>
            <p className="text-slate-600">
              Please confirm that <strong>{email}</strong> is your email address
              by clicking the button below.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleVerify}
              disabled={status === "verifying"}
              className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 shadow-lg shadow-blue-600/20"
            >
              {status === "verifying" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email Now"
              )}
            </button>
            <button
              onClick={onBack}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
