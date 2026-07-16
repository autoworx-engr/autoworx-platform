"use client";

import { useState, useTransition } from "react";
import { retryWebhookEvent } from "./actions";
import { RefreshCw } from "lucide-react";
import { successToast, errorToast } from "@/lib/toast";

type WebhookEvent = {
  id: number;
  eventId: string;
  gateway: string;
  status: string;
  attempts: number;
  lastError: string | null;
  receivedAt: Date;
  processedAt: Date | null;
};

const STATUS_STYLES: Record<string, string> = {
  PROCESSED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  PENDING: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20",
  FAILED: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

export default function WebhookEventsTable({
  initialEvents,
  total,
}: {
  initialEvents: WebhookEvent[];
  total: number;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [isPending, startTransition] = useTransition();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [gatewayFilter, setGatewayFilter] = useState("");

  const filtered = events.filter((e) => {
    return (
      (!statusFilter || e.status === statusFilter) &&
      (!gatewayFilter || e.gateway === gatewayFilter)
    );
  });

  const handleRetry = (eventId: string, gateway: string) => {
    setRetryingId(eventId);
    startTransition(async () => {
      try {
        await retryWebhookEvent(eventId, gateway);
        setEvents((prev) =>
          prev.map((e) =>
            e.eventId === eventId
              ? { ...e, status: "PENDING", attempts: 0, lastError: null }
              : e,
          ),
        );
        successToast("Job re-queued");
      } catch {
        errorToast("Failed to retry");
      } finally {
        setRetryingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="PROCESSED">PROCESSED</option>
          <option value="FAILED">FAILED</option>
        </select>

        <select
          value={gatewayFilter}
          onChange={(e) => setGatewayFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Gateways</option>
          <option value="STRIPE">Stripe</option>
          <option value="AUTHORIZE_NET">Authorize.Net</option>
        </select>

        <span className="ml-auto text-sm text-gray-400 self-center">
          {filtered.length} of {total} events
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              <th className="px-4 py-3">Event ID</th>
              <th className="px-4 py-3">Gateway</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Processed</th>
              <th className="px-4 py-3">Last Error</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  No events found
                </td>
              </tr>
            ) : (
              filtered.map((event) => (
                <tr
                  key={event.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 max-w-[160px] truncate">
                    {event.eventId}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-600">
                      {event.gateway === "STRIPE" ? "Stripe" : "Authorize.Net"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{event.attempts}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(event.receivedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {event.processedAt
                      ? new Date(event.processedAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {event.lastError ? (
                      <span
                        className="truncate block text-xs text-red-500"
                        title={event.lastError}
                      >
                        {event.lastError}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {event.status !== "PROCESSED" && (
                      <button
                        onClick={() =>
                          handleRetry(event.eventId, event.gateway)
                        }
                        disabled={isPending && retryingId === event.eventId}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${isPending && retryingId === event.eventId ? "animate-spin" : ""}`}
                        />
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
