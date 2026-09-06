import { cn } from "@/lib/cn";
import Image from "next/image";
import Link from "next/link";

type TMessageProps = {
  communicationType: string;
  userName: string;
  message: string;
  photoUrl?: string;
  redirectUrl?: string;
  isSeen?: boolean;
};

export function Message({
  communicationType,
  userName,
  message,
  redirectUrl,
  photoUrl = "/images/default.png",
  isSeen = true,
}: TMessageProps) {
  return (
    <Link
      href={redirectUrl ?? "#"}
      className={cn(
        "group relative block w-full rounded-xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700 dark:hover:shadow-slate-900/50",
        !isSeen &&
          "border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/60",
      )}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-slate-50/0 via-slate-50/0 to-slate-100/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-slate-800/0 dark:via-slate-800/0 dark:to-slate-700/0" />

      <div className="relative flex items-center gap-3">
        {/* Avatar with subtle ring */}
        <div className="relative shrink-0">
          <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100" />
          <Image
            width={56}
            height={56}
            src={photoUrl}
            alt={userName}
            className="relative h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200 transition-transform duration-300 group-hover:scale-105 dark:ring-slate-700"
          />
        </div>

        {/* User info */}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "mb-1.5 truncate text-slate-900 dark:text-slate-100",
              isSeen ? "font-semibold" : "font-extrabold",
            )}
          >
            {userName.length > 20 ? userName.slice(0, 20) + "..." : userName}
          </p>
          <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 transition-colors duration-300 group-hover:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30">
            {communicationType}
          </span>
        </div>

        {/* Arrow indicator */}
        <svg
          className="h-5 w-5 shrink-0 text-slate-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
      <p
        className={cn(
          "relative mt-3 text-sm leading-relaxed",
          isSeen
            ? "text-slate-600 dark:text-slate-400"
            : "font-bold text-slate-900 dark:text-slate-100",
        )}
      >
        {message}
      </p>
    </Link>
  );
}
