"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCcw, ServerCrash } from "lucide-react";
import Link from "next/link";

export default function ServerError({ error }: { error: Error }) {
  console.error("Server Error Log:", error);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-lg space-y-6 p-8">
        <div className="space-y-3 text-center">
          <ServerCrash className="mx-auto h-14 w-14 text-teal-600" />
          <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
          <p className="text-sm text-slate-600">
            An unexpected error occurred. You can retry or return to the app.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
