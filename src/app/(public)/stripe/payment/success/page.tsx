import { Button } from "@/components/ui/button";
import { CircleCheckBig } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Successful",
  description: "Your payment has been received. Thank you for your purchase.",
};

export default async function SuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
        <CircleCheckBig className="mx-auto mb-4 h-16 w-16 text-green-500" />

        <h1 className="mb-4 text-2xl font-bold">Payment Successful!</h1>
        <p className="mb-6 text-gray-600">
          Thank you for your purchase. Your payment has been received.
        </p>
        <Link href="/">
          <Button className="w-full">Return to Home</Button>
        </Link>
      </div>
    </div>
  );
}
