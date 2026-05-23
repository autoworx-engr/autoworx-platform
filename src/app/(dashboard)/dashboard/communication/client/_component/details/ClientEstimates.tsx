"use client";

import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import NewEstimateButton from "./NewEstimateButton";

type EstimateItem = {
  id: string;
  type: "Estimate" | "Invoice";
  grandTotal: any;
  statusId: number | null;
  createdAt: Date;
  title?: string | null;
  statusName?: string | null;
};

type TProps = {
  estimates?: EstimateItem[] | null;
  vehicleIds?: number[];
  clientId: number;
};

const STATUS_MAP: Record<string, { bg: string; text: string }> = {
  approved: { bg: "bg-[#006D77]/10", text: "text-[#006D77]" },
  paid: { bg: "bg-[#006D77]/10", text: "text-[#006D77]" },
  sent: { bg: "bg-sky-50", text: "text-sky-700" },
  draft: { bg: "bg-zinc-100", text: "text-zinc-600" },
  pending: { bg: "bg-amber-50", text: "text-amber-700" },
};

function statusKey(name?: string | null) {
  return (name ?? "").toLowerCase().trim();
}

function formatMoney(n?: any) {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function ClientEstimates({
  estimates = [],
  vehicleIds = [],
  clientId,
}: TProps) {
  const [open, setOpen] = useState(true);

  const items = estimates ?? [];

  const approvedTotal = useMemo(
    () =>
      items
        .filter((i) => ["approved", "paid"].includes(statusKey(i.statusName)))
        .reduce((acc, i) => acc + Number(i.grandTotal ?? 0), 0),
    [items],
  );

  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2"
        >
          <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
            ESTIMATES & INVOICES
          </h3>
          {approvedTotal > 0 && (
            <span className="text-[11px] font-medium text-[#006D77] dark:text-[#4dd2dc]">
              {formatMoney(approvedTotal)} approved
            </span>
          )}
        </button>
        <ChevronDown
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "h-4 w-4 cursor-pointer text-zinc-400 transition-transform",
            !open && "-rotate-90",
          )}
        />
      </header>

      {open && (
        <div className="mt-3">
          {items.length === 0 ? (
            <p className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
              No estimates or invoices yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((est) => {
                const key = statusKey(est.statusName);
                const status = STATUS_MAP[key] ?? STATUS_MAP.draft;
                const typeBadge = est.type === "Invoice" ? "INV" : "EST";
                return (
                  <li key={est.id}>
                    <Link
                      href={`/dashboard/estimate/view/${est.id}`}
                      className="flex items-center gap-3 rounded-lg border border-zinc-100 px-2.5 py-2 transition-colors hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <span className="inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                        {typeBadge}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                          {est.title ||
                            (est.type === "Invoice" ? "Invoice" : "Estimate")}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                          #{est.id} · {formatDate(est.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                          {formatMoney(est.grandTotal)}
                        </span>
                        {est.statusName && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              status.bg,
                              status.text,
                            )}
                          >
                            <span className="h-1 w-1 rounded-full bg-current" />
                            {est.statusName}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3">
            <NewEstimateButton clientId={clientId} vehicleIds={vehicleIds} />
          </div>
        </div>
      )}
    </section>
  );
}
