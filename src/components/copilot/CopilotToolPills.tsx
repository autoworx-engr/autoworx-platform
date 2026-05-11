"use client";
import type { ActiveToolCall } from "@/stores/copilotStore";

const TOOL_LABELS: Record<string, string> = {
  get_revenue_summary: "Revenue summary",
  get_payments_summary: "Payments summary",
  get_client_by_name: "Client search",
  get_vehicle_by_client: "Vehicle lookup",
  get_inventory_item_by_name: "Inventory search",
  get_estimate_by_number: "Estimate lookup",
  get_appointments_for_date_range: "Appointments",
  get_tasks_for_user: "Tasks",
};

function label(toolName: string) {
  return TOOL_LABELS[toolName] ?? toolName.replace(/_/g, " ");
}

type Props = {
  toolCalls: ActiveToolCall[];
};

export default function CopilotToolPills({ toolCalls }: Props) {
  return (
    <div className="px-4 py-2 flex flex-wrap gap-2">
      {toolCalls.map((tc, i) => (
        <span
          key={`${tc.toolName}-${i}`}
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            tc.done
              ? tc.isError
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700",
          ].join(" ")}
        >
          {!tc.done && (
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />
          )}
          {tc.done && !tc.isError && <span>✓</span>}
          {tc.done && tc.isError && <span>✗</span>}
          Looking up {label(tc.toolName)}
        </span>
      ))}
    </div>
  );
}
