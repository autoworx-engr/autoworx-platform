import { cn } from "@/lib/cn";
import { ShieldOff } from "lucide-react";
import BoxTitle from "./BoxTitle";

/**
 * The "permission required" state shared by every dashboard widget, so a module
 * being switched off looks the same wherever it appears.
 */
export function BoxRestrictedNotice({ what }: { what: string }) {
  return (
    <div className="my-auto flex flex-1 flex-col items-center justify-center self-center p-8 text-center">
      <ShieldOff className="mb-3 h-8 w-8 text-rose-500" />
      <span className="text-base font-semibold text-slate-700 dark:text-slate-300">
        Permission Required
      </span>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Contact administrator to view {what}.
      </p>
    </div>
  );
}

/**
 * Full replacement for a widget the user may not view: keeps the card shell and
 * title so the dashboard grid does not reflow, drops the redirect link (it would
 * lead to a 404) and the data.
 */
export default function BoxRestricted({
  title,
  what,
  className,
}: {
  title: string;
  what: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        `flex flex-1 flex-col rounded-2xl bg-white/50 p-4 shadow-lg ring-1
         ring-slate-900/5 backdrop-blur-md transition-all duration-300
         dark:bg-slate-900/50 dark:shadow-2xl dark:shadow-blue-900/20
         dark:ring-white/10 md:p-6`,
        className,
      )}
    >
      <BoxTitle title={title} className="mb-4 flex-shrink-0" />
      <BoxRestrictedNotice what={what} />
    </div>
  );
}
