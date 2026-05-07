import { DealStage } from "@prisma/client";

const styles: Record<DealStage, string> = {
  [DealStage.LEAD]:
    "bg-zinc-100 text-zinc-700 ring-zinc-400/25 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600/30",
  [DealStage.QUALIFIED]:
    "bg-cyan-50 text-cyan-800 ring-cyan-500/20 dark:bg-cyan-900/30 dark:text-cyan-300 dark:ring-cyan-500/25",
  [DealStage.PROPOSAL]:
    "bg-violet-50 text-violet-800 ring-violet-500/20 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-500/25",
  [DealStage.NEGOTIATION]:
    "bg-amber-50 text-amber-800 ring-amber-500/25 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-500/25",
  [DealStage.WON]:
    "bg-emerald-50 text-emerald-800 ring-emerald-500/25 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-500/25",
  [DealStage.LOST]:
    "bg-rose-50 text-rose-800 ring-rose-500/25 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-500/25",
};

const labels: Record<DealStage, string> = {
  [DealStage.LEAD]: "Lead",
  [DealStage.QUALIFIED]: "Qualified",
  [DealStage.PROPOSAL]: "Proposal",
  [DealStage.NEGOTIATION]: "Negotiation",
  [DealStage.WON]: "Won",
  [DealStage.LOST]: "Lost",
};

export function StageBadge({ stage }: { stage: DealStage }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${styles[stage]}`}
    >
      {labels[stage]}
    </span>
  );
}
