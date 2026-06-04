import { MessageSquare, Star, TrendingUp } from "lucide-react";

interface Props {
  stats: {
    total: number;
    replied: number;
    avgRating: number;
  };
}

export default function AnalyticsCards({ stats }: Props) {
  const responseRate =
    stats.total > 0 ? Math.round((stats.replied / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10">
        <div className="rounded-lg bg-yellow-100 p-2.5 dark:bg-yellow-900/30">
          <Star size={20} className="fill-yellow-400 text-yellow-400" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Average Rating
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
            <span className="ml-1 text-sm font-normal text-gray-400">/ 5</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10">
        <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
          <MessageSquare size={20} className="text-blue-500" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Reviews
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </p>
          <p className="text-xs text-gray-400">
            {stats.replied} replied · {stats.total - stats.replied} pending
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10">
        <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/30">
          <TrendingUp size={20} className="text-green-500" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Response Rate
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {responseRate}%
          </p>
          <p className="text-xs text-gray-400">
            {stats.replied} of {stats.total} reviews
          </p>
        </div>
      </div>
    </div>
  );
}
