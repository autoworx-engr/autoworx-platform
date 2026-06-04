import { cn } from "@/lib/utils";
import React from "react";
import BoxTitle from "./BoxTitle";
import { db } from "@/lib/db";
import { getCompanyId } from "@/lib/companyId";
import { MessageSquare, Star, TrendingUp } from "lucide-react";
import Link from "next/link";

type ReputationBoxProps = {
  className?: string;
};

export default async function ReputationBox({ className }: ReputationBoxProps) {
  const companyId = await getCompanyId();

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { gbpRefreshToken: true },
  });

  const isConnected = !!company?.gbpRefreshToken;

  let stats = { total: 0, replied: 0, avgRating: 0 };

  if (isConnected) {
    const reviews = await db.gbpReview.findMany({
      where: { location: { companyId, isActive: true } },
      select: { rating: true, replyText: true },
    });
    stats.total = reviews.length;
    stats.replied = reviews.filter((r) => r.replyText).length;
    stats.avgRating = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;
  }

  const responseRate =
    stats.total > 0 ? Math.round((stats.replied / stats.total) * 100) : 0;

  return (
    <div
      className={cn(
        "h-full flex-1 overflow-y-auto shadow-md",
        "rounded-2xl shadow-xl transition-all duration-300",
        "bg-white/50 dark:bg-slate-900/50",
        "backdrop-blur-md",
        "ring-1 ring-slate-900/5 dark:ring-white/10",
        "shadow-lg dark:shadow-2xl dark:shadow-blue-900/20",
        className,
      )}
    >
      <div className="flex h-full flex-col rounded-md p-6 shadow-lg">
        <BoxTitle
          title="Reputation Management"
          redirectLink="/dashboard/reputation-management"
        />

        {!isConnected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No Google Business Profile connected.
            </p>
            <Link
              href="/dashboard/reputation-management"
              className="text-sm font-medium text-[#6571FF] hover:underline"
            >
              Connect now →
            </Link>
          </div>
        ) : (
          <div className="custom-scrollbar flex flex-1 flex-col justify-center gap-3 py-2">
            <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <Star
                size={18}
                className="shrink-0 fill-yellow-400 text-yellow-400"
              />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Avg Rating
                </p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"} / 5
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <MessageSquare size={18} className="shrink-0 text-blue-500" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Reviews
                </p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
              <TrendingUp size={18} className="shrink-0 text-green-500" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Response Rate
                </p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {responseRate}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
