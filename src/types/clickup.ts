export interface ClickupUser {
  id: number;
  username: string | null;
  email: string | null;
  color: string | null;
}

export interface ClickupTask {
  id: string;
  name: string;
  status: { status: string; type: string; color?: string };
  priority: { priority: string; color?: string } | null;
  date_created: string;
  date_closed: string | null;
  date_done: string | null;
  creator: ClickupUser;
  assignees: ClickupUser[];
}

export type ReportGranularity = "day" | "week" | "month";

export interface LeaderboardEntry {
  userId: number;
  name: string;
  color: string | null;
  count: number;
}

export interface TrendBucket {
  key: string;
  label: string;
  created: number;
  completed: number;
  backlog: number;
}

export interface BreakdownSlice {
  key: string;
  label: string;
  count: number;
}

export interface FilterableUser {
  id: number;
  name: string;
  color: string | null;
}

export interface ClickupFilterState {
  startDate: string;
  endDate: string;
  granularity: ReportGranularity;
  assignees: number[];
}

export interface ClickupBugSummary {
  totalCreated: number;
  totalCompleted: number;
  totalOpen: number;
  netChange: number;
  avgResolutionHours: number | null;
  previous: {
    totalCreated: number;
    totalCompleted: number;
  };
  deltas: {
    createdPct: number | null;
    completedPct: number | null;
    openAtStart: number;
  };
  trend: TrendBucket[];
  statusBreakdown: BreakdownSlice[];
  priorityBreakdown: BreakdownSlice[];
  topCreators: LeaderboardEntry[];
  topCompleters: LeaderboardEntry[];
  assignableUsers: FilterableUser[];
}
