export const normalizeSearch = (str: string) =>
  str?.toLowerCase().replace(/[.\s]+/g, "");
