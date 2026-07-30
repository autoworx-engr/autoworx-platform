import { Button } from "@/components/ui/button";
import { CircleX } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Failed",
  description: "There was an error processing your payment. Please try again.",
};

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
        <CircleX className="mx-auto mb-4 h-16 w-16 text-red-500" />

        <h1 className="mb-4 text-2xl font-bold text-red-600">Payment Failed</h1>
        <p className="mb-6 text-gray-600">
          We&apos;re sorry, but there was an error processing your payment.
          Please try again or contact support if the problem persists.
        </p>
        <div className="space-y-4">
          <Link href="/">
            <Button className="w-full">Return to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
