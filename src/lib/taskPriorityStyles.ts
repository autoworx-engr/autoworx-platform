import type { CSSProperties } from "react";

export const taskPriorityStyles: Record<string, CSSProperties> = {
  Low: {
    background: "#dcefdd",
    borderLeft: "3px solid #4CAF50",
    color: "#3d8b40",
    boxShadow: "0 2px 8px rgba(76, 175, 80, 0.15)",
  },
  Medium: {
    background: "#ffecd6",
    borderLeft: "3px solid #FF9800",
    color: "#e07f00",
    boxShadow: "0 2px 8px rgba(255, 152, 0, 0.15)",
  },
  High: {
    background: "#fdd9d7",
    borderLeft: "3px solid #f44336",
    color: "#d32f2f",
    boxShadow: "0 2px 8px rgba(244, 67, 54, 0.15)",
  },
};
