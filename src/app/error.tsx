"use client";

import UserBugReport from "@/components/bug-report/UserBugReport";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { stateStore } from "@/stores/stateStore";
import { Bug, Mail, RefreshCcw, ServerCrash } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function ServerError({
  error,
  errorInfo,
}: {
  error: Error;
  errorInfo?: { componentStack?: string };
}) {
  console.error("Server Error Log:", error, errorInfo);

  // Report client-side error to server-side logger (non-blocking)
  if (typeof window !== "undefined") {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error?.message ?? "Unknown client error",
        stack: error?.stack ?? errorInfo?.componentStack ?? "",
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {}); // Don't block on logging
  }

  const { setIsNewBugOpen } = stateStore();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-white to-gray-100 p-4">
      <Card className="w-full max-w-3xl space-y-8 p-6 md:p-12">
        <div className="space-y-4 text-center">
          <ServerCrash className="mx-auto h-16 w-16 text-[#00b8b0]" />
          <h1 className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl">
            500 - Server Error
          </h1>
          <p className="mx-auto max-w-xl text-lg text-gray-600">
            Oops! We&apos;ve encountered an unexpected issue. Our team has been
            notified and is working to fix it.
          </p>
        </div>

        <div className="mx-auto grid max-w-2xl gap-6 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-[#00b8b0]/30 bg-[#00b8b0]/5 p-4 text-center">
            <RefreshCcw className="mx-auto h-6 w-6 text-[#00b8b0]" />
            <p className="text-gray-600">Try</p>
            <button
              onClick={() => window.location.reload()}
              className="text-lg font-semibold text-[#00b8b0] hover:text-[#0098da] hover:underline"
            >
              Refreshing the page
            </button>
          </div>
          {user ? (
            <div className="space-y-2 rounded-lg border border-gray-200 p-4 text-center">
              <Bug className="mx-auto h-6 w-6 text-[#00b8b0]" />
              <p className="text-gray-600">Found an issue?</p>
              <button
                onClick={() => setIsNewBugOpen(true)}
                className="text-lg font-semibold text-[#00b8b0] hover:underline"
              >
                Report Bug
              </button>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-[#00b8b0]/30 bg-[#00b8b0]/5 p-4 text-center">
              <Mail className="mx-auto h-6 w-6 text-[#00b8b0]" />
              <p className="text-gray-600">Contact support at</p>
              <p className="break-all text-lg font-semibold text-[#00b8b0]">
                {process.env.INFO_EMAIL}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <Image
            src="/icons/autoworx-logo.svg"
            alt="Autoworx Logo"
            className="h-24 object-contain"
            width={100}
            height={100}
          />
        </div>

        <div className="text-center">
          <Button
            asChild
            className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] text-white transition-opacity hover:opacity-90"
            size="lg"
          >
            <Link href="/">Return to Homepage</Link>
          </Button>
        </div>
      </Card>

      {user && <UserBugReport />}
    </div>
  );
}
