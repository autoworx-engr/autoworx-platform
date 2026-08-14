import { formatResolutionTime } from "@/lib/clickup/format";
import type { ClickupBugSummary } from "@/types/clickup";

export type InsightTone = "good" | "warning" | "neutral";

export function buildInsight(summary: ClickupBugSummary): {
  text: string;
  tone: InsightTone;
} {
  const { totalCreated, totalCompleted, avgResolutionHours } = summary;
  const resolutionClause = avgResolutionHours
    ? ` Averaging ${formatResolutionTime(avgResolutionHours)} to close a bug.`
    : "";

  if (totalCreated === 0 && totalCompleted === 0) {
    return { text: "No bug activity in this range.", tone: "neutral" };
  }

  if (totalCompleted > totalCreated) {
    const gap = totalCompleted - totalCreated;
    return {
      text: `Backlog shrinking — ${totalCompleted} closed vs. ${totalCreated} opened, a net of ${gap} fewer open bugs.${resolutionClause}`,
      tone: "good",
    };
  }

  if (totalCreated > totalCompleted) {
    const gap = totalCreated - totalCompleted;
    return {
      text: `Backlog growing — ${totalCreated} opened vs. ${totalCompleted} closed, a net of ${gap} more open bugs.${resolutionClause}`,
      tone: "warning",
    };
  }

  return {
    text: `Holding steady — ${totalCreated} opened and ${totalCompleted} closed.${resolutionClause}`,
    tone: "neutral",
  };
}
