"use client";

import { Switch } from "@/components/Switch";
import {
  CheckCircle,
  Mail,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

// --- 1. Business Logic (Pure Function) ---
/**
 * Determines the outcome of a user attempting to enable 2FA.
 * Returns an object: { success: boolean, message: string }
 */
interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

interface Outcome {
  success: boolean;
  message: string;
}

const attemptEnable2FA = (user: User): Outcome => {
  if (!user.emailVerified) {
    return { success: false, message: "Please verify your email first." };
  }
  if (user.twoFactorEnabled) {
    return {
      success: false,
      message: "Two-factor authentication is already enabled.",
    };
  }
  return {
    success: true,
    message: "Two-step verification enabled successfully.",
  };
};

// header component
function Header() {
  return (
    <div className="bg-slate-900 p-6 text-white">
      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck className="w-8 h-8 text-emerald-400" />
        <h1 className="text-xl font-bold">Account Settings</h1>
      </div>
      <p className="text-slate-400 text-sm">
        Manage your security preferences.
      </p>
    </div>
  );
}

// content component
function Content() {
  // Simulated User State
  const [user, setUser] = useState<User>({
    id: "u_123",
    email: "alex@example.com",
    emailVerified: false,
    twoFactorEnabled: false,
  });

  const handle2FAToggle = () => {
    if (user.twoFactorEnabled) {
      // Logic to disable
      setUser(prev => ({ ...prev, twoFactorEnabled: false }));
      toast.success("Two-step verification disabled.");
      console.log("Output: 2FA Disabled");
    } else {
      // Logic to enable
      const outcome = attemptEnable2FA(user);
      if (outcome.success) {
        setUser(prev => ({ ...prev, twoFactorEnabled: true }));
        toast.success(outcome.message);
        console.log("Output:", outcome.message);
      } else {
        toast.error(outcome.message);
        console.log("Output:", outcome.message);
      }
    }
  };

  const handleSendVerificationEmail = () => {
    toast.success(`Verification link sent to ${user.email}`);
  };
  return (
    <div className="divide-y divide-slate-100">
      {/* Email Section */}
      <div className="p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Contact Information
        </h2>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-slate-900 font-medium">{user.email}</p>
                <p className="text-slate-400 text-xs">Primary Email</p>
              </div>
            </div>

            {user.emailVerified ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
                <CheckCircle className="w-3.5 h-3.5" />
                Verified
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100">
                <XCircle className="w-3.5 h-3.5" />
                Not Verified
              </div>
            )}
          </div>

          {!user.emailVerified && (
            <div className="pl-12">
              <button
                onClick={handleSendVerificationEmail}
                className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                Send Verification Email &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2FA Section */}
      <div className="p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Security
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-slate-900 font-medium">
                Two-Factor Authentication
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${user.twoFactorEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
                ></span>
                <p
                  className={`text-xs font-medium ${user.twoFactorEnabled ? "text-emerald-600" : "text-slate-400"}`}
                >
                  {user.twoFactorEnabled ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </div>

          <Switch
            checked={user.twoFactorEnabled}
            setChecked={handle2FAToggle}
          />
        </div>

        <p className="text-slate-500 text-sm leading-relaxed pl-12">
          Add an extra layer of security. We'll verify your identity via a code
          sent to your mobile device.
        </p>
      </div>
    </div>
  );
}

export default function Setup2FA() {
  return (
    <div className="w-full bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200 mt-8">
      {/* Header */}
      <Header />

      {/* Content */}
      <Content />
    </div>
  );
}
