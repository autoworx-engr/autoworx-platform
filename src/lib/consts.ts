export const MIN_PASSWORD_LENGTH = 6;

// Same default options offered as Lead Source on the Add Lead form,
// kept in sync so clients and leads share a consistent source list.
export const DEFAULT_CLIENT_SOURCE_NAMES = [
  "Referrals",
  "Meta",
  "Instagram",
  "TikTok",
  "Yelp",
  "Google",
  "Website",
  "Trade show",
  "LinkedIn",
  "Walk-in",
  "Phone Call",
];

export function isDefaultClientSourceName(name: string) {
  return DEFAULT_CLIENT_SOURCE_NAMES.some(
    (defaultName) => defaultName === name.trim(),
  );
}

export const DEFAULT_IMAGE_URL = "/images/default.png";
export const ASANA_BASE_URL = "https://app.asana.com/api/1.0";
export const USER_FEEDBACK_EMAILS = ["krshanto2005@gmail.com"];
export const INFO_EMAIL = "info@autoworx.tech";

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.awx.autoworx";
export const APP_STORE_URL =
  "https://apps.apple.com/us/app/autoworx/id6758582913";

export const TASK_COLOR = {
  Low: "#6571FF",
  Medium: "#25AADD",
  High: "#006D77",
};

export const INVOICE_TAGS = [
  {
    title: "Order Material",
    name: "order",
  },
  {
    title: "Get Deposit",
    name: "deposit",
  },
  {
    title: "Send Invoice",
    name: "send",
  },
  {
    title: "Part Procurement",
    name: "procurement",
  },
  {
    title: "Schedule for Followup",
    name: "schedule",
  },
];

export const INVOICE_COLORS: { textColor: string; bgColor: string }[] = [
  { textColor: "#EB9D0B", bgColor: "#FFE7BA" },
  { textColor: "#38D3CF", bgColor: "#CBFFFD" },
  { textColor: "#C13232", bgColor: "#FFACAC" },
  { textColor: "#5860BA", bgColor: "#DADDFF" },
  { textColor: "#59B24A", bgColor: "#CAEBC5" },
  { textColor: "#C77B35", bgColor: "#FFD1A6" },
  { textColor: "#B156C0", bgColor: "#FAD9FF" },
  { textColor: "#9B446E", bgColor: "#FFDAEC" },
];

export const WORK_ORDER_STATUS_COLOR: { [key: string]: string } = {
  "In Progress": "#3385eb",
  Pending: "#FFC107",
  Complete: "#0f766e",
  Cancel: "#DC3545",
};

export const TECHNICIAN_STATUS = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
  CANCEL: "Cancel",
};
