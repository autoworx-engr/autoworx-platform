"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";

interface UpgradePlanBannerProps {
  title: string;
  description: string;
  /** Override the CTA button label. Default: "View Plans" */
  ctaLabel?: string;
}

/**
 * A professional inline upgrade prompt. The CTA links to /dashboard/settings/billing?showPlans=true
 * which auto-opens the PricePlans modal.
 */
export default function UpgradePlanBanner({
  title,
  description,
  ctaLabel = "View Plans",
}: UpgradePlanBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-4 shadow-sm">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#6571FF] to-[#8B5CF6] text-white shadow">
        <Sparkles size={15} />
      </div>
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        <Link
          href="/dashboard/settings/billing?showPlans=true"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#6571FF] to-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white shadow transition hover:opacity-90 hover:shadow-md active:scale-95"
        >
          <Sparkles size={12} />
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
