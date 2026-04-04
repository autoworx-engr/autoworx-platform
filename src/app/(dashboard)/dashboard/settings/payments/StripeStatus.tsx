"use client";

import { CircleAlert, CircleCheckBig } from "lucide-react";

export default function StripeStatus({
  data,
}: {
  data?: {
    data?: any;
    loginLink?: string | undefined;
    companyId?: number;
  } | null;
}) {
  const stripeData = data?.data;

  return (
    <div className="mt-6 w-full max-w-lg">
      <div className="overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
        <div className="px-4 py-3">
          <p className="text-sm font-medium text-gray-700">
            {stripeData?.charges_enabled
              ? stripeData?.settings?.dashboard?.display_name
              : "Your account is not yet enabled to accept payments. Please complete your verification in Stripe."}
          </p>
        </div>
        <div className="border-t border-gray-100 px-4 py-3">
          {stripeData?.charges_enabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              <CircleCheckBig className="h-3.5 w-3.5" /> Payments Enabled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
              <CircleAlert className="h-3.5 w-3.5" /> Payments Not Enabled
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
