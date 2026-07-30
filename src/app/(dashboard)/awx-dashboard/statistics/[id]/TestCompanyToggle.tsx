"use client";

import { useState, useTransition } from "react";

export function TestCompanyToggle({
  companyId,
  initialEnabled,
}: {
  companyId: number;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(!!initialEnabled);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !enabled;
    startTransition(async () => {
      const res = await fetch("/api/awx/test-company-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          isTest: next,
        }),
      });

      if (res.ok) {
        setEnabled(next);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          enabled ? "bg-amber-500" : "bg-gray-300"
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <div className="text-xs text-slate-600 dark:text-slate-300">
        <div className="font-semibold">
          {enabled ? "Test company" : "Live company"}
        </div>
        <div>
          {enabled
            ? "SMS restricted to the test allowlist."
            : "SMS sends normally to customers."}
        </div>
      </div>
    </div>
  );
}
