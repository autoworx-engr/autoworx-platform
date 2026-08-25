export const evenColor = "bg-background";
export const oddColor = "bg-[#F8FAFF]";

/** Table cell padding. A flat `px-10` was 720px of padding across 9 columns,
 *  far wider than the tab ever gets — it only holds 68% of the page from `xl`
 *  up — so it scales with the viewport and tops out well short of the old value. */
export const cell = "px-3 text-left lg:px-4 xl:px-5 2xl:px-6";

/** Sections used to be `h-[25%]`/`h-[30%]`/`h-[30%]` of a container sized by
 *  `min-h-[40vh]`/`lg:min-h-[69vh]`, so they overlapped each other. They must
 *  NOT be flex-1 either — the summary block can eat the whole tab height and
 *  leave the tables collapsed to nothing. Natural height + a capped, scrollable
 *  body is the only shape that holds at every width. */
export const sectionWrap = "flex flex-col";

export const sectionBody =
  "overflow-auto rounded-lg border md:max-h-[45vh] md:min-h-[140px] md:rounded-none";
