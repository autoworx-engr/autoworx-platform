export const normalizeSearch = (str: string) =>
  str?.toLowerCase().trim().replace(/\s+/g, " ");
