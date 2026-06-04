import { db } from "@/lib/db";
import { getCompanyId } from "@/lib/companyId";
import ConnectGBP from "./components/ConnectGBP";
import AnalyticsCards from "./components/AnalyticsCards";
import ReviewsList from "./components/ReviewsList";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function ReputationManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const companyId = await getCompanyId();

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { gbpRefreshToken: true },
  });

  const isConnected = !!company?.gbpRefreshToken;

  let stats = { total: 0, replied: 0, avgRating: 0 };
  let locations: { id: number; name: string }[] = [];

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

    locations = await db.gbpLocation.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reputation Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage and reply to Google Business Profile reviews
          </p>
        </div>
        <ConnectGBP isConnected={isConnected} />
      </div>

      {sp.connected && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          Google Business Profile connected! Click "Sync Reviews" to import your
          reviews.
        </div>
      )}

      {sp.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          Connection error: {decodeURIComponent(sp.error)}
        </div>
      )}

      {!isConnected ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Connect your Google Business Profile
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View, manage, and reply to all your Google reviews from one place.
            </p>
          </div>
          <a
            href="/api/gbp/auth"
            className="rounded-md bg-[#6571FF] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#5560ee] transition-colors"
          >
            Connect Google Business Profile
          </a>
        </div>
      ) : (
        <>
          <AnalyticsCards stats={stats} />
          <Suspense
            fallback={
              <div className="py-10 text-center text-sm text-gray-400">
                Loading reviews...
              </div>
            }
          >
            <ReviewsList locations={locations} />
          </Suspense>
        </>
      )}
    </div>
  );
}
