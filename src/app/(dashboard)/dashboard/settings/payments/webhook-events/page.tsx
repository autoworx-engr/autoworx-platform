import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import { getWebhookEvents } from "@/app/(dashboard)/awx-dashboard/webhook-events/actions";
import WebhookEventsTable from "@/app/(dashboard)/awx-dashboard/webhook-events/WebhookEventsTable";

export default async function CompanyWebhookEventsPage() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;

  if (!companyId) return null;

  const { events, total } = await getWebhookEvents({
    companyId,
    pageSize: 100,
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-700">
          Payment Webhook Events
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Inspect and retry payment webhook events for your account
        </p>
      </div>

      <WebhookEventsTable initialEvents={events} total={total} />
    </div>
  );
}
