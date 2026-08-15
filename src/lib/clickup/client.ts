import type { ClickupTask } from "@/types/clickup";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";
const CACHE_TTL_MS = 60_000;
const PAGE_BATCH_SIZE = 5;

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

type TaskPage = { tasks: ClickupTask[]; last_page: boolean };

function fetchPage(listId: string, page: number): Promise<TaskPage> {
  return clickupFetch<TaskPage>(
    `/list/${listId}/task?page=${page}&include_closed=true&subtasks=true`,
  );
}

/** Fetches every page for the list, running requests in concurrent batches instead of one at a time. */
async function fetchAllPages(listId: string): Promise<ClickupTask[]> {
  const first = await fetchPage(listId, 0);
  const tasks = [...first.tasks];
  if (first.last_page || first.tasks.length === 0) return tasks;

  let nextPage = 1;
  let done = false;
  while (!done) {
    const batchPages = Array.from(
      { length: PAGE_BATCH_SIZE },
      (_, i) => nextPage + i,
    );
    const results = await Promise.all(
      batchPages.map((page) => fetchPage(listId, page)),
    );
    for (const result of results) {
      tasks.push(...result.tasks);
      if (result.last_page || result.tasks.length === 0) done = true;
    }
    nextPage += PAGE_BATCH_SIZE;
  }

  return tasks;
}

// Module-level cache: the raw task list rarely changes second-to-second, but every
// filter tweak (date range, granularity, teammate) re-requests it. Caching avoids
// re-paginating ~1000+ tasks from ClickUp on every click. Per-process only — fine for
// a long-lived Node server, a no-op cache miss on a fresh serverless cold start.
const taskCache = new Map<
  string,
  { tasks: ClickupTask[]; fetchedAt: number }
>();
const inFlight = new Map<string, Promise<ClickupTask[]>>();

/** All tasks that live in the given List, including closed ones, across pages. */
export async function getAllTasksInList(
  listId: string,
): Promise<ClickupTask[]> {
  const cached = taskCache.get(listId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.tasks;
  }

  const pending = inFlight.get(listId);
  if (pending) return pending;

  const request = fetchAllPages(listId)
    .then((tasks) => {
      taskCache.set(listId, { tasks, fetchedAt: Date.now() });
      return tasks;
    })
    .finally(() => inFlight.delete(listId));

  inFlight.set(listId, request);
  return request;
}
