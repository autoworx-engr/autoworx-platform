import { formatToTimeString, formatWorkedDuration } from "./attendanceHelpers";

type TDayCompleteBannerProps = {
  clockIn: Date;
  clockOut: Date;
  workedMinutes: number;
  timezone: string;
};

export default function DayCompleteBanner({
  clockIn,
  clockOut,
  workedMinutes,
  timezone,
}: TDayCompleteBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-500/40 dark:bg-emerald-500/10">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          You&apos;re all done for today
        </p>
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-100">
          Clocked in at {formatToTimeString(clockIn, timezone)} · Clocked out at{" "}
          {formatToTimeString(clockOut, timezone)} ·{" "}
          {formatWorkedDuration(workedMinutes)} worked
        </p>
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          Clock-in will be available again tomorrow.
        </p>
      </div>
    </div>
  );
}
