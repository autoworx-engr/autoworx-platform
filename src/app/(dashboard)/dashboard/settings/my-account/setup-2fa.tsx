"use client";

import { sendEmailVerificationMail } from "@/actions/settings/my-account/sendEmailVerificationMail";
import {
  disabled2fa,
  enabled2fa,
} from "@/actions/settings/my-account/toggle2fa";
import { getUserById } from "@/actions/user/getUserById";
import { Switch } from "@/components/Switch";
import { errorToast, successToast } from "@/lib/toast";
import {
  CheckCircle,
  Loader2,
  Mail,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface User {
  id?: number;
  email?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}

// header component
function Header() {
  return (
    <div className="p-6  border-b border-slate-200">
      <h1 className="text-lg font-bold">Account Settings</h1>

      <p className="text-slate-400 text-sm">
        Manage your security preferences.
      </p>
    </div>
  );
}

// content component
function Content() {
  const session = useSession();
  const userId = parseInt(session.data?.user?.id || "");

  // Simulated User State
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setError("");
        setLoading(true);
        const { data, type } = (await getUserById(userId)) || {};

        if (type === "fail") {
          errorToast("Failed to fetch user");
          return;
        }

        const transformedUser = {
          id: data?.id,
          email: data?.email,
          emailVerified: data?.emailVerified,
          twoFactorEnabled: data?.twoFactorEnabled,
        };
        setUser(transformedUser);
      } catch (err) {
        console.log(err);
        setError("User data fetching failed");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  const handle2FAToggle = async () => {
    if (user?.twoFactorEnabled) {
      // Logic to disable
      const { type, message } = await disabled2fa();
      if (type === "fail") {
        errorToast(message);
        return;
      }
      setUser((prev) => ({ ...prev, twoFactorEnabled: false }));
      successToast(message);
    } else {
      // Logic to enable
      const outcome = await enabled2fa();
      if (outcome.type === "fail") {
        errorToast(outcome.message);
        return;
      }
      setUser((prev) => ({ ...prev, twoFactorEnabled: true }));
      successToast(outcome.message);
    }
  };

  const handleSendVerificationEmail = async () => {
    const { type, message } = await sendEmailVerificationMail();
    if (type === "fail") {
      errorToast(message);
      return;
    }
    successToast(message);
  };

  if (loading && !error) {
    return (
      <div className="flex items-center justify-center min-h-[200px] ">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  } else if (!loading && error) {
    return (
      <div className="flex items-center justify-center min-h-[200px] ">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-slate-100">
      {/* Email Section */}
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
                  {user?.email}
                </p>
                <p className="text-slate-400 text-xs">Primary Email</p>
              </div>
            </div>

            <div className="hidden lg:block">
              {user?.emailVerified ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 shrink-0 whitespace-nowrap">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Verified
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100 shrink-0 whitespace-nowrap">
                  <XCircle className="w-3.5 h-3.5" />
                  Not Verified
                </div>
              )}
            </div>
          </div>

          <div className="lg:hidden pl-12">
            {user?.emailVerified ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 shrink-0 whitespace-nowrap">
                <CheckCircle className="w-3.5 h-3.5" />
                Verified
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100 shrink-0 whitespace-nowrap">
                <XCircle className="w-3.5 h-3.5" />
                Not Verified
              </div>
            )}
          </div>

          {!user?.emailVerified && (
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
                  className={`w-2 h-2 rounded-full ${user?.twoFactorEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
                ></span>
                <p
                  className={`text-xs font-medium ${user?.twoFactorEnabled ? "text-emerald-600" : "text-slate-400"}`}
                >
                  {user?.twoFactorEnabled ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </div>

          <Switch
            checked={user?.twoFactorEnabled ?? false}
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
    <div className="w-full max-w-full bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200 mt-8">
      {/* Header */}
      <Header />

      {/* Content */}
      <Content />
    </div>
  );
}
