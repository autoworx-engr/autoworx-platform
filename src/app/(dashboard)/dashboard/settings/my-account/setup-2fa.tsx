"use client";

import { sendEmailVerificationMail } from "@/actions/settings/my-account/sendEmailVerificationMail";
import {
  disabled2fa,
  enabled2fa,
} from "@/actions/settings/my-account/toggle2fa";
import { Switch } from "@/components/Switch";
import { errorToast, successToast } from "@/lib/toast";
import { CheckCircle, Mail, Smartphone, XCircle } from "lucide-react";
import { useState, useTransition } from "react";

export interface Setup2FAProps {
  email: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

// ─── Shared sub-component ────────────────────────────────────────────────────
function VerificationBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 shrink-0 whitespace-nowrap">
        <CheckCircle className="w-3.5 h-3.5" />
        Verified
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100 shrink-0 whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5" />
      Not Verified
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
function Header() {
  return (
    <div className="border-b border-slate-200 p-6">
      {/* Downgraded from h1 — the page already has top-level headings */}
      <h3 className="text-lg font-semibold text-slate-800">Account Settings</h3>
      <p className="mt-1 text-sm text-slate-500">
        Manage your security preferences.
      </p>
    </div>
  );
}

// ─── Content ─────────────────────────────────────────────────────────────────
function Content({
  email,
  emailVerified,
  twoFactorEnabled: initialTwoFactorEnabled,
}: Setup2FAProps) {
  // Local state for optimistic 2FA toggle; seeded from SSR prop
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    initialTwoFactorEnabled,
  );
  const [isPending2FA, startTransition2FA] = useTransition();
  const [isPendingEmail, startTransitionEmail] = useTransition();

  const handle2FAToggle = () => {
    startTransition2FA(async () => {
      if (twoFactorEnabled) {
        const { type, message } = await disabled2fa();
        if (type === "fail") {
          errorToast(message);
          return;
        }
        setTwoFactorEnabled(false);
        successToast(message);
      } else {
        const outcome = await enabled2fa();
        if (outcome.type === "fail") {
          errorToast(outcome.message);
          return;
        }
        setTwoFactorEnabled(true);
        successToast(outcome.message);
      }
    });
  };

  const handleSendVerificationEmail = () => {
    startTransitionEmail(async () => {
      const { type, message } = await sendEmailVerificationMail();
      if (type === "fail") {
        errorToast(message);
        return;
      }
      successToast(message);
    });
  };

  return (
    <div className="divide-y divide-slate-100">
      {/* ── Email Section ── */}
      <div className="p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Contact Information
        </h2>

        <div className="flex flex-col items-start gap-3 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="bg-slate-100 p-2 rounded-lg text-slate-600 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-900 font-medium text-sm truncate">
                  {email}
                </p>
                <p className="text-slate-400 text-xs">Primary Email</p>
              </div>
            </div>
            {/* Desktop badge */}
            <div className="hidden lg:block">
              <VerificationBadge verified={emailVerified} />
            </div>
          </div>

          {/* Mobile badge */}
          <div className="lg:hidden pl-12">
            <VerificationBadge verified={emailVerified} />
          </div>

          {!emailVerified && (
            <div className="pl-12">
              <button
                onClick={handleSendVerificationEmail}
                disabled={isPendingEmail}
                className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPendingEmail ? "Sending…" : "Send Verification Email →"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 2FA Section ── */}
      <div className="p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Security
        </h2>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-slate-900 font-medium">
                Two-Factor Authentication
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${twoFactorEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
                />
                <p
                  className={`text-xs font-medium ${twoFactorEnabled ? "text-emerald-600" : "text-slate-400"}`}
                >
                  {twoFactorEnabled ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </div>

          {/* Disable pointer events while the toggle action is in-flight */}
          <div className={isPending2FA ? "pointer-events-none opacity-60" : ""}>
            <Switch checked={twoFactorEnabled} setChecked={handle2FAToggle} />
          </div>
        </div>

        <p className="text-slate-500 text-sm leading-relaxed pl-12">
          Add an extra layer of security. We&apos;ll verify your identity via a
          code sent to your email.
        </p>
      </div>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export default function Setup2FA({
  email,
  emailVerified,
  twoFactorEnabled,
}: Setup2FAProps) {
  return (
    <div className="w-full">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">
        Two-Factor Authentication
      </h3>
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Header />
        <Content
          email={email}
          emailVerified={emailVerified}
          twoFactorEnabled={twoFactorEnabled}
        />
      </div>
    </div>
  );
}
