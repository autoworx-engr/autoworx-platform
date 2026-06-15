import { cn } from "@/lib/cn";

/**
 * Pulsing placeholder rows shown while the first sidebar page is loading.
 * Matches the rough silhouette of a user/group row so the layout doesn't
 * shift when real data lands.
 */
export function SidebarListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white p-3 shadow-sm",
            "dark:border-white/10 dark:bg-zinc-900/60",
          )}
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-2 w-1/2 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-700/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
