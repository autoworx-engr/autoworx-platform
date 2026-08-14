import { endOfDay, startOfDay, startOfMonth } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { summarizeClickupTasks } from "@/lib/clickup/analytics";
import { checkClickupReportingAccess } from "@/lib/clickup/access";
import { getAllTasksInList } from "@/lib/clickup/client";
import { getClickupListConfig } from "@/lib/clickup/config";
import type { ReportGranularity } from "@/types/clickup";

const GRANULARITIES: ReportGranularity[] = ["day", "week", "month"];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const access = await checkClickupReportingAccess();
  if (!access.allowed) {
    return NextResponse.json(
      { success: false, message: access.reason },
      { status: access.reason === "unauthenticated" ? 401 : 404 },
    );
  }

  const listConfig = getClickupListConfig();
  if (!listConfig) {
    return NextResponse.json(
      { success: false, message: "clickup-not-configured" },
      { status: 409 },
    );
  }

  const params = req.nextUrl.searchParams;
  const startParam = params.get("startDate");
  const endParam = params.get("endDate");
  const granularityParam = params.get(
    "granularity",
  ) as ReportGranularity | null;
  const assigneesParam = params.get("assignees");

  const start = startParam
    ? startOfDay(new Date(startParam))
    : startOfMonth(new Date());
  const end = endParam ? endOfDay(new Date(endParam)) : endOfDay(new Date());
  const granularity = GRANULARITIES.includes(
    granularityParam as ReportGranularity,
  )
    ? (granularityParam as ReportGranularity)
    : "day";
  const assigneeFilter = assigneesParam
    ? assigneesParam
        .split(",")
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    : [];

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid date range" },
      { status: 400 },
    );
  }

  try {
    const tasks = await getAllTasksInList(listConfig.listId);
    const summary = summarizeClickupTasks(
      tasks,
      { start, end },
      granularity,
      assigneeFilter,
    );
    return NextResponse.json(
      { success: true, summary },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error summarizing ClickUp tasks:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load ClickUp tasks" },
      { status: 502 },
    );
  }
}
