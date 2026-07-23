"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";

interface UpgradePlanBannerProps {
  title: string;
  description: string;
  ctaLabel?: string;
}

export default function UpgradePlanBanner({
  title,
  description,
  ctaLabel = "View Plans",
}: UpgradePlanBannerProps) {
  return (
    <div className="w-full flex flex-wrap items-start gap-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-4 shadow-sm">
      {/* Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#8B5CF6] text-white shadow">
        <Sparkles size={15} />
      </div>

      {/* Content */}
      <div className="flex flex-wrap min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Text */}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 break-words">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 break-words">
            {description}
          </p>
        </div>
        <Link
          href="/dashboard/settings/billing?showPlans=true"
          className="inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white shadow transition hover:opacity-90 hover:shadow-md active:scale-95"
        >
          <Sparkles size={12} />
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
