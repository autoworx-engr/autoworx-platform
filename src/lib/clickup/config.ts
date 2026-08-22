export interface ClickupListConfig {
  spaceId: string;
  spaceName: string;
  listId: string;
  listName: string;
}

/** The Space/List this dev-only tool reports on — fixed via env, not user-configurable. */
export function getClickupListConfig(): ClickupListConfig | null {
  const {
    CLICKUP_SPACE_ID,
    CLICKUP_SPACE_NAME,
    CLICKUP_LIST_ID,
    CLICKUP_LIST_NAME,
  } = process.env;

  if (
    !CLICKUP_SPACE_ID ||
    !CLICKUP_SPACE_NAME ||
    !CLICKUP_LIST_ID ||
    !CLICKUP_LIST_NAME
  ) {
    return null;
  }

  return {
    spaceId: CLICKUP_SPACE_ID,
    spaceName: CLICKUP_SPACE_NAME,
    listId: CLICKUP_LIST_ID,
    listName: CLICKUP_LIST_NAME,
  };
}
