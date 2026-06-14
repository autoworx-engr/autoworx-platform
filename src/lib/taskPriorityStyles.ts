import type { CSSProperties } from "react";

// Shared priority styles for task list items, so the dashboard "Task List" box
// and the Task & Activity sidebar render identical colors per priority.
export const taskPriorityStyles: Record<string, CSSProperties> = {
  Low: {
    background: "linear-gradient(to right, #f5f3ff, #ede9fe)",
    borderLeft: "3px solid #6d28d9",
    color: "#6d28d9",
    boxShadow: "0 2px 8px rgba(109, 40, 217, 0.15)",
  },
  Medium: {
    background: "linear-gradient(to right, #f0f9ff, #e0f2fe)",
    borderLeft: "3px solid #0284c7",
    color: "#0284c7",
    boxShadow: "0 2px 8px rgba(2, 132, 199, 0.15)",
  },
  High: {
    background: "linear-gradient(to right, #b2f2bb, #d3f9d8)",
    borderLeft: "3px solid #22a7b8",
    color: "#22a7b8",
    boxShadow: "0 2px 8px rgba(34, 167, 184, 0.15)",
  },
};
