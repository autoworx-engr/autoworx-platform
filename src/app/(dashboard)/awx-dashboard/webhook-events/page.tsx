import { getWebhookEvents } from "./actions";
import WebhookEventsTable from "./WebhookEventsTable";

export default async function WebhookEventsPage() {
  const { events, total } = await getWebhookEvents({ pageSize: 100 });

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-700">Webhook Events</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Inspect and manually retry payment webhook events
        </p>
      </div>

      <WebhookEventsTable initialEvents={events} total={total} />
    </div>
  );
}
