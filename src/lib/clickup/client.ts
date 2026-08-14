import type { ClickupTask } from "@/types/clickup";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

class ClickupApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ClickupApiError";
  }
}

async function clickupFetch<T>(path: string): Promise<T> {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new ClickupApiError(500, "CLICKUP_API_TOKEN is not configured");
  }

  const res = await fetch(`${CLICKUP_API_BASE}${path}`, {
    headers: { Authorization: token },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ClickupApiError(
      res.status,
      `ClickUp API ${path} failed: ${res.status} ${body}`,
    );
  }

  return res.json() as Promise<T>;
}

/** All tasks that live in the given List, including closed ones, across pages. */
export async function getAllTasksInList(
  listId: string,
): Promise<ClickupTask[]> {
  const tasks: ClickupTask[] = [];
  let page = 0;

  while (true) {
    const data = await clickupFetch<{
      tasks: ClickupTask[];
      last_page: boolean;
    }>(`/list/${listId}/task?page=${page}&include_closed=true&subtasks=true`);
    tasks.push(...data.tasks);
    if (data.last_page || data.tasks.length === 0) break;
    page += 1;
  }

  return tasks;
}
