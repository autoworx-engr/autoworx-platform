"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";

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
    <div className="$items-center flex flex-col justify-start space-y-6 p-6 text-left">
      <Card className="w-full max-w-2xl rounded-xl border border-gray-200 bg-background shadow-lg">
        <CardHeader className="$text-center">
          <CardTitle className="text-xl font-semibold text-gray-800">
            {stripeData?.charges_enabled
              ? stripeData?.settings?.dashboard?.display_name
              : `🚨 Your account is not yet enabled to accept payments.
Please complete your verification in Stripe to start processing payments.`}
            {/* // {stripeData?.settings?.dashboard?.display_name} */}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* <div className="space-y-4 text-gray-700">
            <p>
              <span className="font-medium">Business Name:</span>{" "}
              {stripeData?.business_profile?.name || "N/A"}
            </p>
            <p>
              <span className="font-medium">Email:</span>{" "}
              {stripeData?.email || "N/A"}
            </p>
            <p>
              <span className="font-medium">Website:</span>{" "}
              <Link
                href={stripeData?.business_profile?.url ?? ""}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {stripeData?.business_profile?.url || "N/A"}
              </Link>
            </p>
            <p>
              <span className="font-medium">Country:</span>{" "}
              {stripeData?.country || "N/A"}
            </p>
            <p>
              <span className="font-medium">Currency:</span>{" "}
              {stripeData?.default_currency?.toUpperCase() || "N/A"}
            </p>
          </div> */}

          <div className="#mt-2 flex items-center justify-between rounded-lg bg-gray-100 p-4">
            {stripeData?.charges_enabled ? (
              <div className="flex items-center font-medium text-green-600">
                <FiCheckCircle className="mr-2 h-5 w-5" /> Payments Enabled
              </div>
            ) : (
              <div className="flex items-center font-medium text-red-500">
                <FiAlertCircle className="mr-2 h-5 w-5" /> Payments Not Enabled
              </div>
            )}
            {/* {!stripeData?.charges_enabled && (
              <Button
                variant="default"
                onClick={() =>
                  (window.location.href = `/api/stripe/reauth?companyId=${data?.companyId}`)
                }
              >
                Complete Stripe Setup
              </Button>
            )} */}
          </div>
          {/* <div className="mt-4 w-full">
            {data?.loginLink && (
              <Link
                className="inline-block w-full rounded-md bg-black px-4 py-2 text-center text-white hover:bg-gray-600"
                href={data?.loginLink}
                target="_blank"
              >
                Login to your Stripe Dashboard
              </Link>
            )}
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}
