import {
  AlertCircle,
  CheckCircle2,
  Key,
  Lock,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

type TCardProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

const Card = ({ title, children, className = "" }: TCardProps) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-slate-100 p-6 ${className}`}
  >
    <h2 className="text-xl font-semibold text-slate-800 mb-6">{title}</h2>
    {children}
  </div>
);

export default function Setup2FA() {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  return (
    <Card title="Two-Factor Authentication">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg ${is2FAEnabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"}`}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                Authenticator App
              </h3>
              <p className="text-sm text-slate-500 max-w-xs">
                Use a dedicated app like Google Authenticator to get
                verification codes.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIs2FAEnabled(!is2FAEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${is2FAEnabled ? "bg-emerald-500" : "bg-slate-200"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${is2FAEnabled ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>

        <div className="h-px bg-slate-100 w-full" />

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50">
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  SMS Verification
                </p>
                <p className="text-xs text-slate-500">+1 ••• ••• 7890</p>
              </div>
            </div>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Change
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50">
            <div className="flex items-center gap-3">
              <Key size={20} className="text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Recovery Codes
                </p>
                <p className="text-xs text-slate-500">
                  10 unused codes remaining
                </p>
              </div>
            </div>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View
            </button>
          </div>
        </div>

        {is2FAEnabled ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-500 mt-0.5" />
            <p className="text-xs text-emerald-800 leading-relaxed">
              Two-factor authentication is active. Your account is protected
              with an additional layer of security.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 mt-0.5" />
            <div>
              <p className="text-xs text-amber-800 font-semibold mb-1">
                Highly Recommended
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Add an extra layer of security to your account. This makes it
                much harder for someone to gain unauthorized access.
              </p>
            </div>
          </div>
        )}

        {!is2FAEnabled && (
          <button className="w-full py-2.5 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
            <Lock size={16} />
            Enable 2FA
          </button>
        )}
      </div>
    </Card>
  );
}
