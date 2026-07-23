"use client";

import { Button } from "@/components/ui/button";
import { CircleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SESSION_KEY = "anet_sig_key_alert_shown";

export default function AuthorizeNetSignatureKeyAlert({
  needsSignatureKey,
}: {
  needsSignatureKey: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!needsSignatureKey) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setOpen(true);
    sessionStorage.setItem(SESSION_KEY, "1");
  }, [needsSignatureKey]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl p-6 mx-4">
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-50">
            <CircleAlert className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              Authorize.Net Setup Required
            </h3>
            <p className="mt-1.5 text-sm text-gray-500">
              Your Authorize.Net integration is missing a Webhook Signature Key.
              Without it, incoming payments cannot be verified and will be
              rejected.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Please go to{" "}
              <span className="font-medium text-gray-700">
                Settings → Payments
              </span>{" "}
              and re-enter your Authorize.Net credentials including the
              Signature Key from your Authorize.Net dashboard under{" "}
              <span className="font-medium text-gray-700">
                Account → Webhooks
              </span>
              .
            </p>

            <div className="mt-5 flex gap-3">
              <Button
                onClick={() => {
                  setOpen(false);
                  router.push("/dashboard/settings/payments");
                }}
                className="bg-primary hover:bg-[#5561ef] text-white text-sm"
              >
                Go to Settings
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="text-sm"
              >
                Remind me later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
