import { AlertCircle, Bug, CheckCircle2, TrendingUp } from "lucide-react";
import type { InsightTone } from "@/lib/clickup/insight";

const TONE_STYLES: Record<
  InsightTone,
  { icon: typeof TrendingUp; className: string }
> = {
  good: { icon: CheckCircle2, className: "text-emerald-300" },
  warning: { icon: AlertCircle, className: "text-amber-300" },
  neutral: { icon: TrendingUp, className: "text-white/80" },
};

export default function ClickupHeader({
  listName,
  spaceName,
  insight,
}: {
  listName: string;
  spaceName: string;
  insight: { text: string; tone: InsightTone } | null;
}) {
  const tone = insight ? TONE_STYLES[insight.tone] : null;
  const Icon = tone?.icon ?? Bug;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#5a66ee] p-6 text-white shadow-lg sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-white/5" />
      <div className="relative flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
          <Bug className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bug Reporting</h1>
          <p className="text-sm text-white/70">
            {listName} · {spaceName}
          </p>
        </div>
      </div>
      {insight && (
        <p className="relative mt-5 flex items-start gap-2 text-sm font-medium text-white/95 sm:text-base">
          <Icon
            className={`mt-0.5 h-5 w-5 shrink-0 ${tone?.className ?? ""}`}
          />
          {insight.text}
        </p>
      )}
    </div>
  );
}
